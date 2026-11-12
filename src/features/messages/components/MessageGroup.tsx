import React from 'react';
import styles from './styles/MessageList.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import MessageItem from './MessageItem';
import { coolingStyle, isFresh } from '../utils/heat';

// Props for one run of messages from one person
export interface MessageGroupProps {
    isMe: boolean; // true for the logged in user's own messages, which hang on the right of the spine
    senderName: string; // shown once at the top of someone else's group
    messages: ChatMessage[]; // the messages in this run, oldest first, never empty
}

// Formats an ISO date string into a short local time such as "11:04 AM"
function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// A run of messages from one person, hung on the spine. Three columns: the left side, the spine, the right side.
// The words go on the speaker's side, the time sits against the spine on the other side like a mark on a ruler,
// and a short tick joins the words to the spine. The tick cools with the group's newest message
export default function MessageGroup({ isMe, senderName, messages }: MessageGroupProps): React.JSX.Element {
    const first = messages[0];
    const newest = messages[messages.length - 1];
    const tickFresh = isFresh(newest.created_at); // the tick draws itself out when the newest message just arrived

    return (
        <div className={`${styles.group} ${isMe ? styles.mine : styles.theirs}`}>
            <div className={styles.body}>
                {/* Other people's groups are named; "You" only shows on phones, where both sides share one column */}
                <span className={`${styles.who} ${isMe ? styles.whoMe : ''}`}>{isMe ? 'You' : senderName}</span>
                {messages.map((message) => (
                    <MessageItem key={message.id} message={message} isMe={isMe} />
                ))}
            </div>
            <span
                className={`${styles.tick} ${tickFresh ? styles.tickFresh : ''}`}
                style={coolingStyle(newest.created_at)} // re-heats when a new message joins the group
                aria-hidden="true"
            />
            <span className={styles.when}>{formatTime(first.created_at)}</span>
        </div>
    );
}
