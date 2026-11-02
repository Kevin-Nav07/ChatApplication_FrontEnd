import React, { useState } from 'react';
import styles from '../../../pages/styles/DashboardPage.module.css';
import type { Room } from '../../../models/Room';

// Properties required by the ChatStage canvas component
export interface ChatStageProps {
    selectedRoom: Room | null; // active room currently open, or null if no conversation is selected
    onSendMessage: (text: string) => void; // callback triggered when submitting the message
}

// Main stage component rendering the active conversation canvas and composer
export default function ChatStage({
    selectedRoom,
    onSendMessage,
}: ChatStageProps): React.JSX.Element {
    // Local draft text state colocated here to prevent re-rendering the parent or sidebar on keystrokes
    const [draftMessage, setDraftMessage] = useState<string>('');

    // Dispatches the message content to the parent and clears the local input dock
    const handleSend = () => {
        const trimmed = draftMessage.trim();
        if (!trimmed || !selectedRoom) return;

        onSendMessage(trimmed); // delivers message text up to parent handler
        setDraftMessage(''); // resets input dock after dispatch
    };

    // Handles enter key press to submit message without needing to click the button
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // prevents newline insertion
            handleSend(); // dispatches send
        }
    };

    return (
        <main className={styles.stagePane} aria-label="Main Canvas">
            {/* Header displaying the active room title and metadata */}
            <header className={styles.stageHeader}>
                <span className={styles.stageHeaderTitle}>
                    {selectedRoom ? selectedRoom.name : 'Select a conversation'}
                </span>
                <span className={styles.stageHeaderMeta}>
                    {selectedRoom ? selectedRoom.room_type : ''}
                </span>
            </header>

            {/* Empty state displayed when a room is not yet loaded with messages */}
            <div className={styles.stageEmptyContent}>
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
                    {selectedRoom
                        ? 'This is the start of your conversation. Send a message below.'
                        : 'Select a conversation from the left to begin chatting.'}
                </p>
            </div>

            {/* Bottom message composer dock */}
            <div className={styles.chatInputDock}>
                <div className={styles.dockInputWrapper}>
                    <input
                        type="text"
                        className={styles.dockInput}
                        placeholder={
                            selectedRoom
                                ? `Message ${selectedRoom.name}...`
                                : 'Select a conversation first...'
                        }
                        aria-label="Message composer"
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)} // binds input value to local state
                        onKeyDown={handleKeyDown} // captures enter key
                        disabled={!selectedRoom} // prevents typing if no room is selected
                    />
                </div>
                <button
                    type="button"
                    className={styles.dockSendBtn}
                    aria-label="Send message"
                    onClick={handleSend} // triggers message dispatch
                    disabled={!selectedRoom || !draftMessage.trim()} // disables button when input is empty
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

