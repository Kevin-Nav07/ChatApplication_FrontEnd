import React from 'react';
import styles from './styles/ChatToast.module.css';

// Defines the data and event handlers required to render the notification toast
export interface ChatToastProps {
    roomName: string; // display name of the room where the message originated
    senderUsername: string; // display name of the user who sent the message
    snippet: string; // preview text of the message body
    onClick: () => void; // callback triggered when the user clicks the toast to jump to that conversation
    onDismiss: () => void; // callback triggered when the user clicks the close button
}

// Presentation component rendering an interactive in-app toast notification
export default function ChatToast({
    roomName,
    senderUsername,
    snippet,
    onClick,
    onDismiss,
}: ChatToastProps): React.JSX.Element {
    // Intercepts close button click so it does not trigger the parent container's onClick
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation(); // stops click event from bubbling up to the toast container
        onDismiss(); // executes dismissal callback
    };

    return (
        <div
            className={styles.toastContainer}
            onClick={onClick}
            role="alert"
            aria-live="polite"
        >
            {/* Glowing ember spark dot on the left */}
            <span className={styles.sparkDot} aria-hidden="true" />

            {/* Notification content body */}
            <div className={styles.contentBlock}>
                <div className={styles.topRow}>
                    <span className={styles.senderName}>{senderUsername}</span>
                    <span className={styles.roomBadge}>{roomName}</span>
                </div>
                <p className={styles.snippetText}>{snippet}</p>
            </div>

            {/* Close button to dismiss immediately */}
            <button
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                aria-label="Dismiss notification"
                title="Dismiss"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}
