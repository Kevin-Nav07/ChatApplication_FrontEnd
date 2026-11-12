import React, { useState } from 'react';
import styles from '../styles/Messages.module.css';
import type { Room } from '../../../models/Room';
import CreateGroupModal from './CreateGroupModal';
import { useUserContext } from '../../../hooks/useUserContext';
import { ageMinutes, coolingStyle, lumpShape, shortAgo } from '../utils/heat';

// Properties expected by the ConversationList component
export interface ConversationListProps {
    rooms: Room[]; // list of rooms retrieved from the backend, most recently active first
    roomsLoaded: boolean; // false until the first room list arrives, so "no conversations" is not shown while loading
    selectedRoom: Room | null; // the room currently selected and open in the chat stage
    unreadRoomIds?: Set<number>; // set of room IDs that currently have unread incoming messages
    toastRoomId?: number | null; // the room the notification on screen is about, its coal flares once
    onSelectRoom: (room: Room) => void; // callback function triggered when a user clicks on a room
    onRoomCreated: (newRoom: Room) => void; // callback triggered when a new room is created via modal
}

// One thing on the cooling scale: a room, or a labelled mark such as "1 hour"
type ScaleEntry =
    | { kind: 'room'; room: Room; age: number; gap: number }
    | { kind: 'mark'; label: string; age: number; gap: number };

// The labelled marks on the scale, as [age in minutes, label]
const MARKS: [number, string][] = [[0, 'now'], [10, '10 min'], [60, '1 hour'], [1440, '1 day'], [10080, '1 week'], [43200, '1 month']];
const PX_PER_LOG_STEP = 34; // how much space one step on the log scale gets
const MIN_GAP = 2;
const MAX_GAP = 80; // a long silence still leaves a visible gap, but never a screen of empty axis
const NEW_ROOM_MS = 15000; // a room this young with no messages was just created, so its coal catches

// When a room was last active: its newest message, or when it was created if it has none
function lastActivity(room: Room): string {
    return room.last_message?.created_at ?? room.created_at;
}

// True for a room created a moment ago that has no messages yet, whose coal plays its catching animation
function isJustCreated(room: Room): boolean {
    return room.last_message == null && ageMinutes(room.created_at) * 60000 < NEW_ROOM_MS;
}

// Short preview line under a room name: the newest message, "You:" for your own, and the sender's name in groups
function previewText(room: Room, currentUserId: number | null): string {
    const last = room.last_message;
    if (last == null) {
        return 'No messages yet';
    }
    if (last.sender_id === currentUserId) {
        return `You: ${last.content}`;
    }
    return room.room_type === 'group' ? `${last.sender_username}: ${last.content}` : last.content; // in a direct chat the name is the room's own
}

// Lays rooms and marks out by age on a log scale, so the first hour gets as much room as the following day.
// Each entry's gap is the space between it and the newer entry below it
function buildScale(rooms: Room[]): ScaleEntry[] {
    const roomEntries: ScaleEntry[] = rooms.map((room) => ({ kind: 'room', room, age: ageMinutes(lastActivity(room)), gap: 0 }));
    const oldest = roomEntries.reduce((max, entry) => Math.max(max, entry.age), 0);

    // Marks up to the first one older than the oldest room, so the axis ends just past the last room
    const markEntries: ScaleEntry[] = [];
    for (const [age, label] of MARKS) {
        markEntries.push({ kind: 'mark', label, age, gap: 0 });
        if (age >= oldest) {
            break;
        }
    }

    // Youngest first; a mark comes before a room of the same age so "now" stays at the very bottom
    const all = [...markEntries, ...roomEntries].sort((a, b) => a.age - b.age || (a.kind === 'mark' ? -1 : 1));
    let previousAge = 0;
    return all.map((entry, index) => {
        const step = Math.log1p(entry.age) - Math.log1p(previousAge); // log1p(x) is log(1 + x), so an age of 0 is fine
        previousAge = entry.age;
        const gap = index === 0 ? 0 : Math.min(MAX_GAP, Math.max(MIN_GAP, step * PX_PER_LOG_STEP));
        return { ...entry, gap };
    });
}

// The ledger beside the conversation. Rooms sit on a cooling scale: "now" at the bottom by the fire,
// older conversations higher up and colder, each placed by how long ago it was last active
export default function ConversationList({
    rooms,
    roomsLoaded,
    selectedRoom,
    unreadRoomIds,
    toastRoomId,
    onSelectRoom,
    onRoomCreated,
}: ConversationListProps): React.JSX.Element {
    // Local filter tab state colocated here because only this sidebar uses it
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isModalOpen, setisModalOpen] = useState<boolean>(false);
    // Local search input state for filtering rooms by name
    const [searchTerm, setSearchTerm] = useState<string>('');
    const { user } = useUserContext();
    const currentUserId = user?.id ?? null;

    // The rooms that pass both the search box and the All or Unread filter
    const visibleRooms = rooms.filter((room) => {
        const matchesSearch = room.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        const matchesFilter = filter === 'all' || (unreadRoomIds?.has(room.id) ?? false);
        return matchesSearch && matchesFilter;
    });
    const unreadCount = unreadRoomIds?.size ?? 0;

    // What to say when nothing is listed, which depends on why the list is empty
    const emptyMessage = !roomsLoaded
        ? 'Gathering your conversations...'
        : rooms.length === 0
            ? 'No conversations yet. Start a group, or message a friend from the Friends tab.'
            : filter === 'unread' && !searchTerm.trim()
                ? 'Nothing unread.'
                : 'No conversations match that search.';

    // Draws one room on the scale: its coal on the axis, its name, when it was last active and a preview
    const renderRoom = (room: Room, gap: number) => {
        const isSelected = selectedRoom?.id === room.id;
        const isUnread = unreadRoomIds?.has(room.id) ?? false;
        const isGroup = room.room_type === 'group';
        const isCatching = isJustCreated(room);
        const heat = coolingStyle(lastActivity(room)); // the coal cools on the same one hour clock as the messages
        const className = [
            styles.entry,
            isSelected ? styles.entryOn : '',
            isUnread ? styles.entryUnread : '',
            isCatching ? styles.entryCatching : '',
            toastRoomId === room.id ? styles.entryFlash : '',
        ].join(' ');

        return (
            <button
                key={room.id}
                type="button"
                className={className}
                style={{ marginBottom: `${gap}px` }} // the space below this room shows how long passed since the newer one below it
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelectRoom(room)}
            >
                <span className={`${styles.seat} ${isGroup ? styles.seatGroup : ''}`} aria-hidden="true">
                    {/* A group gets a second, smaller coal behind the first */}
                    {isGroup && <span className={`${styles.coal} ${styles.coalBack}`} style={{ ...heat, borderRadius: lumpShape(room.id + 7) }} />}
                    <span className={styles.coal} style={{ ...heat, borderRadius: lumpShape(room.id) }}>
                        {room.name.charAt(0).toUpperCase()}
                    </span>
                </span>
                <span className={styles.entryText}>
                    <span className={styles.entryTop}>
                        <span className={styles.entryName}>{room.name}</span>
                        <span className={styles.entryWhen}>{isUnread ? 'new' : shortAgo(lastActivity(room))}</span>
                    </span>
                    <span className={styles.entryPreview}>{previewText(room, currentUserId)}</span>
                </span>
            </button>
        );
    };

    return (
        <aside className={styles.ledger} aria-label="Conversations">
            <header className={styles.ledgerHead}>
                <h1 className={styles.ledgerTitle}>Messages</h1>
                <button type="button" className={styles.newGroup} onClick={() => setisModalOpen(true)}>
                    <span className={styles.newGroupMark} aria-hidden="true">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                    </span>
                    New group
                </button>
            </header>

            {/* Search: a line to write on */}
            <label className={styles.search}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7.5" />
                    <path d="M21 21l-4.6-4.6" />
                </svg>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search conversations"
                    aria-label="Search conversations"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)} // tracks search input changes
                />
            </label>

            {/* All and Unread. aria-pressed tells screen readers which one is on */}
            <div className={styles.tabs}>
                <button
                    type="button"
                    className={`${styles.tab} ${filter === 'all' ? styles.tabOn : ''}`}
                    aria-pressed={filter === 'all'}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${filter === 'unread' ? styles.tabOn : ''}`}
                    aria-pressed={filter === 'unread'}
                    onClick={() => setFilter('unread')}
                >
                    Unread
                    {unreadCount > 0 && <span className={styles.tabCount}>{unreadCount}</span>}
                </button>
            </div>

            {/* The cooling scale. Both containers run bottom to top, so the list starts at "now" and older rooms rise above it */}
            <div className={styles.scale}>
                <div className={styles.track}>
                    {visibleRooms.length > 0 && buildScale(visibleRooms).map((entry) =>
                        entry.kind === 'room' ? (
                            renderRoom(entry.room, entry.gap)
                        ) : (
                            <div
                                key={`mark-${entry.label}`}
                                className={`${styles.mark} ${entry.age === 0 ? styles.markNow : ''}`}
                                style={{ marginBottom: `${entry.gap}px` }}
                                aria-hidden="true" // the marks are a visual scale, each room already says when it was active
                            >
                                {entry.label}
                            </div>
                        )
                    )}
                    {visibleRooms.length === 0 && <p className={styles.listEmpty}>{emptyMessage}</p>}
                </div>
            </div>

            <CreateGroupModal
                isOpen={isModalOpen}
                onClose={() => setisModalOpen(false)}
                onRoomCreated={onRoomCreated} // the parent adds the room and opens it
            />
        </aside>
    );
}
