import React, { useState } from 'react';
import styles from '../../../pages/styles/DashboardPage.module.css';
import type { Room } from '../../../models/Room';
import CreateGroupModal from './CreateGroupModal';
import { useUserContext } from '../../../hooks/useUserContext';

// Properties expected by the ConversationList component
export interface ConversationListProps {
    rooms: Room[]; // list of rooms retrieved from the backend, most recently active first
    roomsLoaded: boolean; // false until the first room list arrives, so "no conversations" is not shown while loading
    selectedRoom: Room | null; // the room currently selected and open in the chat stage
    unreadRoomIds?: Set<number>; // set of room IDs that currently have unread incoming messages
    onSelectRoom: (room: Room) => void; // callback function triggered when a user clicks on a room
    onRoomCreated: (newRoom: Room) => void; // callback triggered when a new room is created via modal
}

// Short preview line under a room name: the newest message, with "You:" for your own
function previewText(room: Room, currentUserId: number | null): string {
    const last = room.last_message;
    if (last == null) {
        return 'No messages yet';
    }
    const author = last.sender_id === currentUserId ? 'You' : last.sender_username;
    return `${author}: ${last.content}`;
}

// Time shown beside a room: today's messages show the time, older ones the date
function activityLabel(room: Room): string {
    const date = new Date(room.last_message?.created_at ?? room.created_at);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday
        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Sidebar list component displaying searchable conversations and rooms
export default function ConversationList({
    rooms,
    roomsLoaded,
    selectedRoom,
    unreadRoomIds,
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

    // What to say when nothing is listed, which depends on why the list is empty
    const emptyMessage = !roomsLoaded
        ? 'Loading conversations...'
        : rooms.length === 0
            ? 'No conversations yet'
            : filter === 'unread' && !searchTerm.trim()
                ? 'No unread conversations'
                : 'No conversations match your search';

    return (
        <aside className={styles.listPane} aria-label="Conversation List">
            {/* Header with section title and new message compose button */}
            <header className={styles.listHeader}>
                <h1 className={styles.listTitle}>Messages</h1>
                <button
                    type="button"
                    className={styles.composeBtn}
                    title="New Message"
                    aria-label="Compose new message"
                    onClick={() => setisModalOpen(true)}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </header>

            {/* Search filter input dock */}
            <div className={styles.searchContainer}>
                <div className={styles.searchInputWrapper}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search conversations"
                        aria-label="Search conversations"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} // tracks search input changes
                    />
                </div>
            </div>

            {/* Filter pills: All and Unread */}
            <div className={styles.filterPillsRow}>
                <button
                    type="button"
                    className={`${styles.filterPill} ${filter === 'all' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilter('all')} // updates local filter state to all
                >
                    All
                </button>
                <button
                    type="button"
                    className={`${styles.filterPill} ${filter === 'unread' ? styles.filterPillActive : ''}`}
                    onClick={() => setFilter('unread')} // updates local filter state to unread
                >
                    Unread
                </button>
            </div>

            {/* Conversation list body */}
            <div className={styles.listBody}>
                {visibleRooms
                    .map((room) => {
                        const isSelected = selectedRoom?.id === room.id; // checks if this item is currently active

                        return (
                            <div
                                key={room.id}
                                className={`${styles.chatItem} ${isSelected ? styles.chatItemActive : ''}`}
                                onClick={() => onSelectRoom(room)} // triggers selection callback
                            >
                                {/* Avatar placeholder with first letter of room name */}
                                <div className={styles.chatAvatar}>
                                    <span>{room.name.charAt(0).toUpperCase()}</span>
                                </div>

                                {/* Contact title and message preview */}
                                <div className={styles.chatDetails}>
                                    <div className={styles.chatTopRow}>
                                        <span className={styles.chatName}>{room.name}</span>
                                        <span className={styles.chatTime}>
                                            {activityLabel(room)}
                                        </span>
                                    </div>
                                    <div className={styles.chatBottomRow}>
                                        <p className={styles.chatSnippet}>{previewText(room, currentUserId)}</p>
                                        {/* Glowing ember spark badge if room has unread messages */}
                                        {unreadRoomIds?.has(room.id) && (
                                            <span className={styles.unreadBadge} aria-label="Unread message" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                {/* Shown whenever nothing is listed, whether because of loading, no rooms, or the current filter */}
                {visibleRooms.length === 0 && (
                    <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 8px', fontSize: '13px' }}>
                        {emptyMessage}
                    </p>
                )}
            </div>

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={isModalOpen}
                onClose={() => setisModalOpen(false)}
                onRoomCreated={onRoomCreated} // the parent adds the room and opens it
            />
        </aside>
    );
}

