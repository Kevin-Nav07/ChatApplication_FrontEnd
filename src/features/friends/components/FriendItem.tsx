import React, { useState } from 'react';
import type { Friend } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatShortDate } from '../utils/formatDates';
import { coalStyle, friendWarmth, heatTextColor } from '../utils/heat';
import { lumpShape } from '../../../components/hearth/lumpShape';

// Props definition for the individual friend row component
interface FriendItemProps {
    // The friend data record derived from the database
    friend: Friend;
    // Optional callback invoked when the user clicks the direct message shortcut
    onSendMessage?: (friend: Friend) => void;
    // Callback invoked after the user confirms they want to remove this friend
    onRemove?: (friendshipId: number) => void;
    // True while another friend action is running, disables the buttons to prevent double submits
    disabled?: boolean;
    // True while this friend is hovered here or in the circle, so both light up together
    highlighted?: boolean;
    // Reports hovering in and out so the circle can light the same person
    onHover?: (key: string | null) => void;
}

// Component that renders one friend in the "Everyone" list beside the circle
export default function FriendItem({ friend, onSendMessage, onRemove, disabled = false, highlighted = false, onHover }: FriendItemProps): React.JSX.Element {
    // Extracts the first letter of the username for the avatar coal
    const avatarInitial = friend.username.charAt(0).toUpperCase();
    // When true the row swaps its icon buttons for a Remove / Keep choice, so a single misclick cannot unfriend someone
    const [isConfirmingRemove, setIsConfirmingRemove] = useState<boolean>(false);
    // Empty when the server did not send a usable date
    const connectedDate = friend.createdAt ? formatShortDate(friend.createdAt) : '';
    // The friendship's warmth: a bright spark when new, a deep coal when old
    const warmth = friendWarmth(friend.createdAt);
    const key = `f${friend.friendshipId}`;

    return (
        <div
            id={`friend-row-${friend.friendshipId}`} // lets a click on this friend's coal in the circle scroll to this row
            className={`${styles.row} ${highlighted ? styles.rowHighlighted : ''}`}
            data-burn-key={key} // the burn finds every element of this person by this key
            onMouseEnter={() => onHover?.(key)}
            onMouseLeave={() => onHover?.(null)}
        >
            <span className={styles.coal} style={{ ...coalStyle(warmth), borderRadius: lumpShape(friend.friendshipId) }} aria-hidden="true">
                {avatarInitial}
            </span>

            {/* Friend user handle and metadata */}
            <div className={styles.rowMeta}>
                <span className={styles.rowName}>{friend.username}</span>
                {isConfirmingRemove ? (
                    <span className={`${styles.rowSub} ${styles.rowSubDanger}`}>Remove from your circle?</span>
                ) : (
                    <span className={styles.rowSub} style={{ color: heatTextColor(warmth) }}>
                        {connectedDate ? `Friends since ${connectedDate}` : 'Friend'}
                    </span>
                )}
            </div>

            {isConfirmingRemove ? (
                /* Inline confirmation replaces the normal actions until the user picks one */
                <div className={styles.rowActions}>
                    <button
                        type="button"
                        className={styles.removeConfirmBtn}
                        disabled={disabled}
                        onClick={() => {
                            setIsConfirmingRemove(false);
                            onRemove?.(friend.friendshipId); // ?. only calls the function when the parent passed one
                        }}
                    >
                        Remove
                    </button>
                    <button
                        type="button"
                        className={styles.textActionBtn}
                        onClick={() => setIsConfirmingRemove(false)}
                    >
                        Keep
                    </button>
                </div>
            ) : (
                <div className={styles.rowActions}>
                    {/* Direct message action button */}
                    <button
                        type="button"
                        className={styles.iconBtn}
                        title={`Message ${friend.username}`}
                        aria-label={`Send direct message to ${friend.username}`}
                        onClick={() => onSendMessage && onSendMessage(friend)}
                    >
                        {/* Speech bubble icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>

                    {/* Remove friend button, only opens the confirmation and does not delete anything yet */}
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title={`Remove ${friend.username}`}
                        aria-label={`Remove ${friend.username} from friends`}
                        disabled={disabled}
                        onClick={() => setIsConfirmingRemove(true)}
                    >
                        {/* Person with a minus sign icon */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
