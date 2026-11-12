import React, { useLayoutEffect, useRef } from 'react';
import styles from './styles/MessageList.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import MessageItem from './MessageItem';
import { useUserContext } from '../../../hooks/useUserContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

const NEAR_BOTTOM_PX = 80; // within this distance of the bottom, the reader counts as "following the conversation"

// Props accepted by the MessageList stream component
export interface MessageListProps {
    roomId: number; // which room is shown, a change means a different conversation was opened
    messages: ChatMessage[]; // message objects in chronological order, oldest first
    hasOlderMessages: boolean; // shows the "Load older messages" button
    isLoadingOlder: boolean; // disables that button while a page is loading
    onLoadOlder: () => void; // asks the parent for the next older page
}

// What the list looked like after the previous render, compared with the new one to decide how to scroll
interface ScrollSnapshot {
    roomId: number | null;
    firstId: number | null;
    lastId: number | null;
    scrollHeight: number;
    scrollTop: number;
}

// Presentation component managing the scroll container and rendering individual MessageItem bubbles
export default function MessageList({
    roomId,
    messages,
    hasOlderMessages,
    isLoadingOlder,
    onLoadOlder,
}: MessageListProps): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousRef = useRef<ScrollSnapshot>({ roomId: null, firstId: null, lastId: null, scrollHeight: 0, scrollTop: 0 });
    const isNearBottomRef = useRef<boolean>(true); // updated on every scroll
    const { user } = useUserContext();
    const prefersReducedMotion = usePrefersReducedMotion();

    // Remembers where the reader is, so the effect below knows whether to follow new messages
    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
        previousRef.current.scrollTop = el.scrollTop; // the reader may have scrolled since the last render
    };

    // useLayoutEffect runs after React updates the DOM but before the browser paints,
    // so the scroll position is corrected without a visible jump
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const previous = previousRef.current;
        const firstId = messages[0]?.id ?? null;
        const lastMessage = messages[messages.length - 1];
        const lastId = lastMessage?.id ?? null;

        if (previous.roomId !== roomId) {
            // A different room was opened: start at its newest message
            el.scrollTop = el.scrollHeight;
            isNearBottomRef.current = true;
        } else if (firstId !== previous.firstId && lastId === previous.lastId) {
            // Older messages were added above: move down by exactly the height they added, so the reader's place stays put
            el.scrollTop = previous.scrollTop + (el.scrollHeight - previous.scrollHeight);
        } else if (lastId !== previous.lastId) {
            // A new message arrived at the bottom: follow it only if the reader was already at the bottom or sent it,
            // so someone reading older messages is not pulled away
            const isMine = lastMessage != null && user != null && lastMessage.sender_id === user.id;
            if (isNearBottomRef.current || isMine) {
                el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
        }

        previousRef.current = { roomId, firstId, lastId, scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    }, [roomId, messages, user, prefersReducedMotion]);

    return (
        <div
            ref={containerRef}
            className={styles.container}
            role="log"
            aria-label="Conversation message stream"
            onScroll={handleScroll}
        >
            {hasOlderMessages && (
                <button type="button" className={styles.loadOlder} onClick={onLoadOlder} disabled={isLoadingOlder}>
                    {isLoadingOlder ? 'Loading...' : 'Load older messages'}
                </button>
            )}

            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                />
            ))}
        </div>
    );
}
