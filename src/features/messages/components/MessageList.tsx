import React, { useEffect, useRef } from 'react';
import styles from './styles/MessageList.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import MessageItem from './MessageItem';

// Props accepted by the MessageList stream component
export interface MessageListProps {
    messages: ChatMessage[]; // array of message objects to render in chronological order
}

// Presentation component managing the scroll container and rendering individual MessageItem bubbles
export default function MessageList({
    messages,
}: MessageListProps): React.JSX.Element {
    // Reference attached to an invisible bottom element to enable auto-scrolling
    const bottomRef = useRef<HTMLDivElement>(null); // holds DOM pointer to the end of the stream

    // Automatically scrolls down whenever a new message is appended to the list
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); // smoothly scrolls viewport to latest message
    }, [messages.length]); // triggers only when the count of messages changes

    return (
        <div className={styles.container} role="log" aria-label="Conversation message stream">
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                />
            ))}

            {/* Invisible anchor element used by bottomRef to scroll down */}
            <div ref={bottomRef} aria-hidden="true" />
        </div>
    );
}
