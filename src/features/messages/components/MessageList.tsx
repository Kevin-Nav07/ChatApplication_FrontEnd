import React, { useLayoutEffect, useMemo, useRef } from 'react';
import styles from './styles/MessageList.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import MessageGroup from './MessageGroup';
import { useUserContext } from '../../../hooks/useUserContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

const NEAR_BOTTOM_PX = 80; // within this distance of the bottom, the reader counts as "following the conversation"
const GROUP_WINDOW_MS = 5 * 60 * 1000; // messages from one person this close together share one group and one name

// Props accepted by the MessageList stream component
export interface MessageListProps {
    roomId: number; // which room is shown, a change means a different conversation was opened
    messages: ChatMessage[]; // message objects in chronological order, oldest first
    hasOlderMessages: boolean; // shows the "Earlier messages" button
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

// One row of the thread: a day break, or a run of messages from one person
type ThreadRow =
    | { kind: 'day'; key: string; label: string }
    | { kind: 'group'; key: string; isMe: boolean; senderName: string; messages: ChatMessage[] };

// Splits the messages into day breaks and speaker groups. A new group starts when the speaker changes,
// the day changes, or more than five minutes pass. This only reads created_at and sender_id the messages already have
function buildRows(messages: ChatMessage[], currentUserId: number | null): ThreadRow[] {
    const rows: ThreadRow[] = [];
    let lastDay = '';
    let group: Extract<ThreadRow, { kind: 'group' }> | null = null; // Extract picks the group variant out of the union type
    let groupEnd = 0;

    messages.forEach((message) => {
        const date = new Date(message.created_at);
        const day = date.toDateString();
        if (day !== lastDay) {
            rows.push({
                kind: 'day',
                key: `day-${day}`,
                label: date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }),
            });
            lastDay = day;
            group = null; // a day break always starts a new group
        }
        const time = date.getTime();
        const continues = group != null && group.messages[0].sender_id === message.sender_id && time - groupEnd < GROUP_WINDOW_MS;
        if (group != null && continues) {
            group.messages.push(message);
        } else {
            group = {
                kind: 'group',
                key: `group-${message.id}`, // the first message's id, which stays the same as later messages join the group
                isMe: message.sender_id === currentUserId,
                senderName: message.sender_username,
                messages: [message],
            };
            rows.push(group);
        }
        groupEnd = time;
    });
    return rows;
}

// The conversation thread. A charcoal spine runs down the middle into the fire: other people's messages hang on
// the left, yours on the right, and day breaks cut across it. This component also owns the scroll position
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
    const currentUserId = user?.id ?? null;
    const prefersReducedMotion = usePrefersReducedMotion();

    // Grouping only reruns when the messages or the user change, not on every render
    const rows = useMemo(() => buildRows(messages, currentUserId), [messages, currentUserId]);

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
            className={styles.scroller}
            role="log"
            aria-label="Conversation message stream"
            onScroll={handleScroll}
        >
            {/* key={roomId} rebuilds the thread when another room opens, which replays the spine growing up out of the fire */}
            <div key={roomId} className={styles.thread}>
                <span className={styles.spine} aria-hidden="true" />

                {hasOlderMessages && (
                    <button type="button" className={styles.loadOlder} onClick={onLoadOlder} disabled={isLoadingOlder}>
                        {isLoadingOlder ? 'Gathering...' : 'Earlier messages'}
                    </button>
                )}

                {rows.map((row) =>
                    row.kind === 'day' ? (
                        <div key={row.key} className={styles.dayBreak}>
                            <span className={styles.dayLabel}>{row.label}</span>
                        </div>
                    ) : (
                        <MessageGroup key={row.key} isMe={row.isMe} senderName={row.senderName} messages={row.messages} />
                    )
                )}
            </div>
        </div>
    );
}
