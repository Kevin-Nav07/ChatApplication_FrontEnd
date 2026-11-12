import React, { useState } from 'react';
import styles from '../../../pages/styles/DashboardPage.module.css';
import type { Room } from '../../../models/Room';
import type { ChatMessage } from '../../../models/ChatMessage';
import type { ConnectionStatus } from '../context/WebSocketContext';
import MessageList from './MessageList';

const MAX_MESSAGE_LENGTH = 4000; // the server rejects longer messages, so the input stops at the same limit

// Properties required by the ChatStage canvas component
export interface ChatStageProps {
    selectedRoom: Room | null; // active room currently open, or null if no conversation is selected
    messages: ChatMessage[]; // loaded messages for the open room, oldest first
    isLoadingHistory: boolean; // true while the newest page of the open room is loading
    hasOlderMessages: boolean; // true when older messages exist on the server
    isLoadingOlder: boolean; // true while an older page is loading
    onLoadOlder: () => void; // asks for the next older page
    onSendMessage: (text: string) => boolean; // returns false when the message could not be sent, so the draft is kept
    connectionStatus: ConnectionStatus; // shown in the header while the connection is not open
    isConnected: boolean; // sending is disabled while false
    sendError: string | null; // why the last message failed, shown above the composer
    onDismissSendError: () => void; // hides the send error
}

// Text shown in the header for each connection state, empty when everything is fine
const STATUS_TEXT: Record<ConnectionStatus, string> = {
    CONNECTED: '',
    CONNECTING: 'Connecting...',
    RECONNECTING: 'Reconnecting...',
    DISCONNECTED: 'Offline',
};

// Main stage component rendering the active conversation canvas and composer.
// It only displays what it is given; the draft text is the one piece of state it owns
export default function ChatStage({
    selectedRoom,
    messages,
    isLoadingHistory,
    hasOlderMessages,
    isLoadingOlder,
    onLoadOlder,
    onSendMessage,
    connectionStatus,
    isConnected,
    sendError,
    onDismissSendError,
}: ChatStageProps): React.JSX.Element {
    // Local draft text, kept here so typing does not re-render the sidebar
    const [draftMessage, setDraftMessage] = useState<string>('');

    // Sends the draft and clears it, but only if it was actually sent, so nothing typed is lost while offline
    const handleSend = () => {
        const trimmed = draftMessage.trim();
        if (!trimmed || !selectedRoom || !isConnected) return;
        if (onSendMessage(trimmed)) {
            setDraftMessage('');
        }
    };

    // Enter sends. isComposing is true while an input method editor (used for Chinese, Japanese, Korean and others)
    // is still building a character, where Enter means "confirm this character", not "send"
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    const statusText = STATUS_TEXT[connectionStatus];

    // Chooses what fills the stage: the message list, a loading line, or the hearth empty state
    const renderBody = () => {
        if (selectedRoom && messages.length > 0) {
            return (
                <MessageList
                    roomId={selectedRoom.id}
                    messages={messages}
                    hasOlderMessages={hasOlderMessages}
                    isLoadingOlder={isLoadingOlder}
                    onLoadOlder={onLoadOlder}
                />
            );
        }
        return (
            <div className={styles.stageEmptyContent}>
                {/* The hearth fireplace canvas spot */}
                <div
                    className={styles.hearthSpot}
                    data-hearth-fire=""
                    data-hearth-size="540" // size parameter consumed by HearthProvider to draw the fireplace
                    aria-hidden="true"
                />
                <h2 className={styles.emptyHeading}>
                    {selectedRoom ? selectedRoom.name : 'The hearth is warm'}
                </h2>
                <p className={styles.emptySubtitle}>
                    {!selectedRoom
                        ? 'Select a conversation from the left to begin chatting.'
                        : isLoadingHistory
                            ? 'Loading messages...'
                            : 'This is the start of your conversation. Send a message below.'}
                </p>
            </div>
        );
    };

    return (
        <main className={styles.stagePane} aria-label="Main Canvas">
            {/* Header displaying the active room title, its type, and the connection state when it is not connected */}
            <header className={styles.stageHeader}>
                <span className={styles.stageHeaderTitle}>
                    {selectedRoom ? selectedRoom.name : 'Select a conversation'}
                </span>
                <span className={styles.stageHeaderMeta} role="status">
                    {statusText || (selectedRoom ? selectedRoom.room_type : '')}
                </span>
            </header>

            {renderBody()}

            {/* Why the last message was not sent, so a failure is never silent */}
            {sendError && (
                <div role="alert" style={{ color: 'var(--accent)', fontSize: '13px', padding: '4px 4px 8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{sendError}</span>
                    <button
                        type="button"
                        onClick={onDismissSendError}
                        aria-label="Dismiss send error"
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Bottom message composer dock */}
            <div className={styles.chatInputDock}>
                <div className={styles.dockInputWrapper}>
                    <input
                        type="text"
                        className={styles.dockInput}
                        placeholder={
                            !selectedRoom
                                ? 'Select a conversation first...'
                                : isConnected
                                    ? `Message ${selectedRoom.name}...`
                                    : 'Waiting for the connection to come back...'
                        }
                        aria-label="Message composer"
                        value={draftMessage}
                        maxLength={MAX_MESSAGE_LENGTH}
                        onChange={(e) => setDraftMessage(e.target.value)} // binds input value to local state
                        onKeyDown={handleKeyDown} // captures enter key
                        disabled={!selectedRoom} // typing is still allowed while offline, only sending waits
                    />
                </div>
                <button
                    type="button"
                    className={styles.dockSendBtn}
                    aria-label="Send message"
                    onClick={handleSend}
                    disabled={!selectedRoom || !draftMessage.trim() || !isConnected} // no sending while empty or offline
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                    </svg>
                </button>
            </div>
        </main>
    );
}
