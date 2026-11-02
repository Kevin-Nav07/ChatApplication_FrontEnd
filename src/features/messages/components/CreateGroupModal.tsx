import React, { useEffect, useState } from 'react';
import styles from '../styles/CreateGroupModal.module.css';
import type { Room } from '../../../models/Room';
import type { Friend } from '../../friends/types/friends';
import { getFriends } from '../../../services/friendService';
import { createRoom } from '../../../services/roomService';
import { AppError } from '../../../models/AppError';

// Props contract for the CreateGroupModal component
export interface CreateGroupModalProps {
    isOpen: boolean; // determines whether the modal is visible
    onClose: () => void; // callback function to dismiss the modal
    onRoomCreated: (newRoom: Room) => void; // callback passing the created room to the parent
}

// Modal dialog allowing the user to name a room and select friends to invite
export default function CreateGroupModal({
    isOpen,
    onClose,
    onRoomCreated,
}: CreateGroupModalProps): React.JSX.Element | null {
    // --------------------------------------------------------------------------
    // TODO(you): State Management
    // --------------------------------------------------------------------------
    // Name typed for the new group
    const [groupName, setGroupName] = useState<string>('');

    // List of confirmed friends fetched from backend to choose from
    const [friends, setFriends] = useState<Friend[]>([]);

    // Array of user IDs currently selected to be added to the new room
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

    // Loading indicator during async operations
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Error message display state
    const [error, setError] = useState<string | null>(null);

    // --------------------------------------------------------------------------
    // TODO(you): Step 1 - Fetch confirmed friends when modal opens
    // --------------------------------------------------------------------------
    useEffect(() => {
        if (!isOpen) return; // do not fetch if modal is hidden

        const loadFriends = async () => {
            try {
                // Call getFriends() from friendService to populate friends list
                const confirmedFriends = await getFriends();
                setFriends(confirmedFriends);
            } catch (err: unknown) {
                if (err instanceof AppError) {
                    setError(err.message);
                } else {
                    setError('Failed to load friends list.');
                }
            }
        };

        loadFriends();
    }, [isOpen]);

    // --------------------------------------------------------------------------
    // TODO(you): Step 2 - Toggle friend selection in selectedUserIds
    // - If userId is already in selectedUserIds, filter it out (deselect)
    // - If userId is not in selectedUserIds, add it to the array (select)
    // --------------------------------------------------------------------------
    const handleToggleFriend = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId) // removes id if already selected
                : [...prev, userId] // appends id if newly selected
        );
    };

    // --------------------------------------------------------------------------
    // TODO(you): Step 3 - Submit group creation to backend
    // - Validate groupName.trim() is not empty
    // - Validate at least one friend is selected (selectedUserIds.length > 0)
    // - Call createRoom({ name: groupName.trim(), room_type: 'group', users: selectedUserIds })
    // - On success: call onRoomCreated(newRoom), reset fields, and call onClose()
    // --------------------------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!groupName.trim()) {
            setError('Please provide a group name.');
            return;
        }

        if (selectedUserIds.length === 0) {
            setError('Please select at least one friend to join the group.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Calls roomService to persist the new group in Postgres
            const newRoom = await createRoom({
                name: groupName.trim(),
                room_type: 'group',
                users: selectedUserIds,
            });

            onRoomCreated(newRoom); // notifies parent coordinator
            setGroupName(''); // resets input
            setSelectedUserIds([]); // resets selected friends
            onClose(); // closes modal
        } catch (err: unknown) {
            if (err instanceof AppError) {
                setError(err.message);
            } else {
                setError('Failed to create group room.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Return nothing if modal is closed
    if (!isOpen) return null;

    return (
        <div
            className={styles.backdrop}
            onClick={onClose} // clicking the backdrop closes the modal
            role="dialog"
            aria-modal="true"
        >
            {/* Modal Card, stops click propagation so clicking inside does not close it */}
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <header className={styles.header}>
                    <h2 className={styles.title}>Create a Group</h2>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </header>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Error Banner */}
                    {error && <p className={styles.errorMessage}>{error}</p>}

                    {/* Group Name Field */}
                    <div className={styles.fieldGroup}>
                        <label htmlFor="group-name-input" className={styles.label}>
                            Group Name
                        </label>
                        <input
                            id="group-name-input"
                            type="text"
                            className={styles.textInput}
                            placeholder="e.g. Frontend Guild, Game Night..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Member Selection List */}
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            Select Friends ({selectedUserIds.length} selected)
                        </label>

                        <div className={styles.friendsList}>
                            {friends.map((friend) => {
                                const isSelected = selectedUserIds.includes(friend.userId);

                                return (
                                    <div
                                        key={friend.userId}
                                        className={`${styles.friendRow} ${isSelected ? styles.friendRowSelected : ''}`}
                                        onClick={() => handleToggleFriend(friend.userId)}
                                    >
                                        <div className={styles.friendLeft}>
                                            <div className={styles.avatarMini}>
                                                {friend.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={styles.friendName}>{friend.username}</span>
                                        </div>

                                        {/* Checkbox Box */}
                                        <div className={`${styles.checkboxBox} ${isSelected ? styles.checkboxChecked : ''}`}>
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {friends.length === 0 && (
                                <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '13px', padding: '16px 0' }}>
                                    No friends found. Add friends first to start a group!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionsRow}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

