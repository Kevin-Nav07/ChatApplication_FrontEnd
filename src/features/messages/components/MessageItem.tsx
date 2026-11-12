import React, { memo } from 'react';
import styles from './styles/MessageItem.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import { useUserContext } from '../../../hooks/useUserContext';

// Props accepted by the individual MessageItem component
export interface MessageItemProps {
    message: ChatMessage; // the message data object to render
}

// Formats an ISO date string into a clean localized time string like "11:04 AM"
function formatMessageTime(isoString: string): string {
    try {
        const date = new Date(isoString); // converts ISO string to Date instance
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // formats to standard hour:minute
    } catch {
        return ''; // returns empty string if timestamp parsing encounters an error
    }
}

// Renders an individual message bubble, automatically checking UserContext to determine left/right placement
function MessageItemComponent({ message }: MessageItemProps): React.JSX.Element {
    // Reads authenticated user directly from context (Approach A)
    const { user } = useUserContext(); // reaches up to UserContextProvider

    // Determines whether the current logged in user sent this message
    const isMe = user != null && message.sender_id === user.id; // true if sender ID matches authenticated user

    return (
        <div className={`${styles.messageRow} ${isMe ? styles.rowMe : styles.rowThem}`}>
            {/* Author username is displayed above messages originating from others */}
            {!isMe && (
                <span className={styles.author}>
                    {message.sender_username}
                </span>
            )}

            {/* Bubble containing the message body */}
            <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                {message.content}
            </div>

            {/* Timestamp label displayed below the bubble */}
            <span className={styles.timestamp}>
                {formatMessageTime(message.created_at)}
            </span>
        </div>
    );
}

// Memoized export to prevent re-rendering historical bubbles when a new message is appended to the list
export default memo(MessageItemComponent);

