import React, { useState } from 'react';
import styles from '../../../pages/styles/DashboardPage.module.css';
import type { Room } from '../../../models/Room';
import CreateGroupModal from './CreateGroupModal';

// Properties expected by the ConversationList component
export interface ConversationListProps {
    rooms: Room[]; // list of rooms retrieved from the backend
    selectedRoom: Room | null; // the room currently selected and open in the chat stage
    onSelectRoom: (room: Room) => void; // callback function triggered when a user clicks on a room
    onRoomCreated: (newRoom: Room) => void; // callback triggered when a new room is created via modal
}

// Sidebar list component displaying searchable conversations and rooms
export default function ConversationList({
    rooms,
    selectedRoom,
    onSelectRoom,
    onRoomCreated,
}: ConversationListProps): React.JSX.Element {
    // Local filter tab state colocated here because only this sidebar uses it
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isModalOpen, setisModalOpen] = useState<boolean>(false);
    // Local search input state for filtering rooms by name
    const [searchTerm, setSearchTerm] = useState<string>('');

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
                {/* 
                  TODO(you): Write the dynamic room list rendering here.
                  1. Filter `rooms` using `searchTerm` if text is typed in search.
                  2. Map over the filtered rooms array to produce a row for each room.
                  3. If `selectedRoom?.id === room.id`, apply `styles.chatItemActive`.
                  4. Attach `onClick={() => onSelectRoom(room)}` to select the room.
                */}
                {rooms.map((room) => {
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
                                        {new Date(room.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className={styles.chatBottomRow}>
                                    <p className={styles.chatSnippet}>{room.room_type}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty fallback if no rooms exist */}
                {rooms.length === 0 && (
                    <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 8px', fontSize: '13px' }}>
                        No conversations found
                    </p>
                )}
            </div>

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={isModalOpen}
                onClose={() => setisModalOpen(false)}
                onRoomCreated={(newRoom) => {
                    onRoomCreated(newRoom); // passes newly created room up to parent coordinator
                    onSelectRoom(newRoom); // automatically selects and opens the newly created room
                }}
            />
        </aside>
    );
}

