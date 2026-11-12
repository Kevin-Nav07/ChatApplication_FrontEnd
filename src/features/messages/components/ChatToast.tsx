import React from 'react';
import styles from './styles/ChatToast.module.css';
import type { CSSVars } from '../../friends/utils/heat';

// Defines the data and event handlers required to render the notification toast
export interface ChatToastProps {
    roomName: string; // display name of the room where the message originated
    senderUsername: string; // display name of the user who sent the message
    snippet: string; // preview text of the message body
    durationMs: number; // how long the toast stays, the heat line along its bottom burns down over exactly this time
    onClick: () => void; // callback triggered when the user clicks the toast to jump to that conversation
    onDismiss: () => void; // callback triggered when the user clicks the close button
}

// A small note that a message arrived in another room: the sender in italic serif, the room in small capitals,
// and a line of heat along the bottom that burns down while the note is showing
export default function ChatToast({
    roomName,
    senderUsername,
    snippet,
    durationMs,
    onClick,
    onDismiss,
}: ChatToastProps): React.JSX.Element {
    const burnStyle: CSSVars = { '--toast-ms': `${durationMs}ms` };

    return (
        // Two layers: the dock pins the note to the corner, the inner note carries the rough charcoal edge.
        // They are split because the shared rough style sets position: relative, which would undo position: fixed on one element
        <div className={styles.dock} role="status" aria-live="polite">
            <div className={styles.toast}>
                {/* The main part is a real button, so it can be reached and opened with the keyboard */}
                <button type="button" className={styles.open} onClick={onClick}>
                    <span className={styles.room}>{roomName}</span>
                    <span className={styles.sender}>{senderUsername}</span>
                    <span className={styles.snippet}>{snippet}</span>
                </button>

                <button type="button" className={styles.close} onClick={onDismiss} aria-label="Dismiss notification">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* The heat line: a countdown you can see, cooling as it shortens */}
                <span className={styles.burn} style={burnStyle} aria-hidden="true" />
            </div>
        </div>
    );
}
