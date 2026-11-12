import React, { useState } from 'react';
import styles from '../styles/Messages.module.css';
import type { Room } from '../../../models/Room';
import type { ChatMessage } from '../../../models/ChatMessage';
import type { ConnectionStatus } from '../context/WebSocketContext';
import MessageList from './MessageList';
import { formatRelativeTime } from '../../friends/utils/formatDates';

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
    connectionStatus: ConnectionStatus; // shown in the masthead while the connection is not open
    isConnected: boolean; // sending is disabled while false
    sendError: string | null; // why the last message failed, shown above the composer
    onDismissSendError: () => void; // hides the send error
}

// What the masthead says while the connection is not open, empty when everything is fine
const STATUS_TEXT: Record<ConnectionStatus, string> = {
    CONNECTED: '',
    CONNECTING: 'Connecting',
    RECONNECTING: 'Reconnecting',
    DISCONNECTED: 'Offline, sending waits',
};

// The masthead's second line: how long ago the room last heard anything
function activeText(room: Room): string {
    const last = room.last_message?.created_at;
    return last ? `Last word ${formatRelativeTime(last)}` : 'No messages yet';
}

// The open conversation. The room's name is set large as a masthead, the thread hangs from it down to a low fire,
// and the composer rests just above the fire. With no room open, a campfire burns alone in the middle.
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

    const canSend = selectedRoom != null && isConnected && draftMessage.trim().length > 0;

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

    // Nothing open: the campfire burns alone with one line under it
    if (!selectedRoom) {
        return (
            <main className={styles.stage} aria-label="Conversation">
                <div className={styles.empty}>
                    {/* data-hearth-fire asks the hearth canvas to burn its campfire in the centre of this box */}
                    <div className={styles.hearthSpot} data-hearth-fire="" data-hearth-size="540" aria-hidden="true" />
                    <h2 className={styles.emptyTitle}>The fire is going.</h2>
                    <p className={styles.emptyText}>Open a conversation from the list, or start a group.</p>
                </div>
            </main>
        );
    }

    const statusText = STATUS_TEXT[connectionStatus];
    const isQuiet = messages.length === 0; // loading or genuinely empty, the bed smoulders either way

    return (
        <main className={styles.stage} aria-label="Conversation">
            {/* The masthead: the room's name, what kind of room it is, and when it last heard anything (or the connection state) */}
            <header className={styles.masthead}>
                <h2 className={styles.mastName}>{selectedRoom.name}</h2>
                <p className={styles.mastMeta} role="status">
                    <span>{selectedRoom.room_type === 'group' ? 'Group' : 'Direct'}</span>
                    <span className={statusText ? styles.mastStatus : styles.mastActive}>
                        {statusText || activeText(selectedRoom)}
                    </span>
                </p>
            </header>

            {isQuiet ? (
                <div className={styles.quiet}>
                    <p className={styles.quietTitle}>
                        {isLoadingHistory ? 'Gathering the conversation...' : `${selectedRoom.name} is quiet.`}
                    </p>
                    {!isLoadingHistory && <p className={styles.quietText}>Your first message lights the fire.</p>}
                </div>
            ) : (
                <MessageList
                    roomId={selectedRoom.id}
                    messages={messages}
                    hasOlderMessages={hasOlderMessages}
                    isLoadingOlder={isLoadingOlder}
                    onLoadOlder={onLoadOlder}
                />
            )}

            {/* The long low fire. The hearth canvas draws it along this element's bottom edge;
                kindling keeps it smouldering until the room has messages */}
            <div
                className={styles.bed}
                data-hearth-fire=""
                data-hearth-shape="bed"
                data-hearth-intensity={isQuiet ? 'kindling' : 'full'}
                aria-hidden="true"
            />

            {/* Why the last message was not sent, so a failure is never silent */}
            {sendError && (
                <div role="alert" className={styles.sendError}>
                    <span>{sendError}</span>
                    <button type="button" className={styles.textBtn} onClick={onDismissSendError}>
                        Dismiss
                    </button>
                </div>
            )}

            {/* The composer: who it goes to, the line to write on, and a send plate that heats up once there is text.
                The dock places it above the fire; the inner slab carries the rough edge, which would otherwise override the positioning */}
            <div className={styles.composerDock}>
                <div className={styles.composer}>
                    <span className={styles.composerTo} aria-hidden="true">To {selectedRoom.name}</span>
                    <input
                        type="text"
                        className={styles.composerInput}
                        placeholder={isConnected ? 'Write something' : 'Waiting for the connection to come back'}
                        aria-label={`Message ${selectedRoom.name}`}
                        value={draftMessage}
                        maxLength={MAX_MESSAGE_LENGTH}
                        onChange={(e) => setDraftMessage(e.target.value)} // binds input value to local state
                        onKeyDown={handleKeyDown} // captures enter key
                    />
                    <button
                        type="button"
                        className={`${styles.send} ${canSend ? styles.sendHot : ''}`}
                        onClick={handleSend}
                        disabled={!canSend} // no sending while empty or offline; typing is still allowed offline
                    >
                        Send
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 10l-5 5 5 5" />
                            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                        </svg>
                    </button>
                </div>
            </div>
        </main>
    );
}
