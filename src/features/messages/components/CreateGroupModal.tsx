import React, { useEffect, useState } from 'react';
import styles from '../styles/CreateGroupModal.module.css';
import type { Room } from '../../../models/Room';
import type { Friend } from '../../friends/types/friends';
import { getFriends } from '../../../services/friendService';
import { createRoom } from '../../../services/roomService';
import { AppError } from '../../../models/AppError';
import { friendWarmth, type CSSVars } from '../../friends/utils/heat';
import { lumpShape } from '../utils/heat';

// Props contract for the CreateGroupModal component
export interface CreateGroupModalProps {
    isOpen: boolean; // determines whether the modal is visible
    onClose: () => void; // callback function to dismiss the modal
    onRoomCreated: (newRoom: Room) => void; // callback passing the created room to the parent
}

const MAX_ARC_SEATS = 10; // more friends than this would crowd the arc, so they are listed in rows instead
const ARC_FROM = 200; // degrees: the arc runs over the top of the fire, from lower left (200) to lower right (340)
const ARC_TO = 340;
const OUTER_RADIUS = 46; // percent of the arc area's width: where friends wait
const INNER_RADIUS = 31; // where a chosen friend moves to, closer to the fire

// Where one friend sits on the arc around the fire, as percentages of the arc area. Chosen friends sit on the inner arc
function seatPosition(index: number, count: number, isChosen: boolean): CSSVars {
    const step = count <= 1 ? 0 : (ARC_TO - ARC_FROM) / (count - 1);
    const degrees = count <= 1 ? 270 : ARC_FROM + index * step; // 270 degrees points straight up
    const angle = (degrees * Math.PI) / 180;
    const radius = isChosen ? INNER_RADIUS : OUTER_RADIUS;
    // cos and sin turn an angle into a point on a circle; the circle's centre is the fire at the bottom middle.
    // The area is twice as wide as it is tall, so the vertical distance is doubled to keep the arc round
    return {
        left: `${50 + radius * Math.cos(angle)}%`,
        top: `${92 + radius * 2 * Math.sin(angle)}%`,
    };
}

// Modal dialog allowing the user to name a room and select friends to invite.
// Friends wait in a half circle around a small fire; choosing one brings them into the light
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

    // Fetches confirmed friends each time the modal opens, so a friend added since last time is listed
    useEffect(() => {
        if (!isOpen) return; // do not fetch if modal is hidden

        let ignore = false; // set by cleanup so a response that arrives after closing is thrown away
        getFriends()
            .then((confirmedFriends) => {
                if (!ignore) setFriends(confirmedFriends);
            })
            .catch((err: unknown) => {
                if (!ignore) setError(err instanceof AppError ? err.message : 'Failed to load friends list.');
            });
        return () => {
            ignore = true;
        };
    }, [isOpen]);

    // Clears everything typed or picked, then closes, so the next time the modal opens it starts empty
    const handleClose = () => {
        setGroupName('');
        setSelectedUserIds([]);
        setError(null);
        onClose();
    };

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
            handleClose(); // resets the fields and closes the modal
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

    const useArc = friends.length > 0 && friends.length <= MAX_ARC_SEATS;
    const chosenCount = selectedUserIds.length;

    return (
        <div
            className={styles.backdrop}
            onClick={handleClose} // clicking the backdrop closes the modal
        >
            {/* Modal sheet, stops click propagation so clicking inside does not close it */}
            <div
                className={styles.sheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-group-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className={styles.header}>
                    <div>
                        <h2 id="create-group-title" className={styles.title}>Start a group</h2>
                        <p className={styles.subtitle}>Name it, then choose who sits around this fire.</p>
                    </div>
                    <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close dialog">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Group name, written on a single charcoal line */}
                    <label htmlFor="group-name-input" className={styles.label}>Group name</label>
                    <input
                        id="group-name-input"
                        type="text"
                        className={styles.nameInput}
                        placeholder="Frontend guild, game night..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        autoFocus
                    />

                    <span className={styles.label} id="group-members-label">Who sits with you</span>

                    {/* The circle: friends wait on an outer arc around a small glow; choosing one moves them inward and lights their coal */}
                    <div
                        className={useArc ? styles.arc : styles.rows}
                        role="group"
                        aria-labelledby="group-members-label"
                    >
                        {useArc && <span className={styles.glow} aria-hidden="true" />}
                        {friends.map((friend, index) => {
                            const isSelected = selectedUserIds.includes(friend.userId);
                            const heat = friendWarmth(friend.createdAt); // the same warmth the friend's coal has on the Friends screen
                            const coalStyle: CSSVars = {
                                borderRadius: lumpShape(friend.userId),
                                '--warm': `rgb(${heat.rgb.join(',')})`,
                            };
                            return (
                                <button
                                    key={friend.userId}
                                    type="button"
                                    className={`${styles.seat} ${isSelected ? styles.seatChosen : ''}`}
                                    style={useArc ? seatPosition(index, friends.length, isSelected) : undefined}
                                    aria-pressed={isSelected}
                                    onClick={() => handleToggleFriend(friend.userId)}
                                >
                                    <span className={styles.coal} style={coalStyle} aria-hidden="true">
                                        {friend.username.charAt(0).toUpperCase()}
                                    </span>
                                    <span className={styles.seatName}>{friend.username}</span>
                                </button>
                            );
                        })}

                        {friends.length === 0 && (
                            <p className={styles.noFriends}>No friends yet. Add someone from the Friends tab first.</p>
                        )}
                    </div>

                    {error && <p className={styles.errorMessage} role="alert">{error}</p>}

                    <div className={styles.footer}>
                        <span className={styles.count}>
                            {chosenCount === 0 ? 'Nobody chosen yet' : `${chosenCount} ${chosenCount === 1 ? 'person' : 'people'} chosen`}
                        </span>
                        <div className={styles.actions}>
                            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
                            >
                                {isSubmitting ? 'Creating...' : 'Create group'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
