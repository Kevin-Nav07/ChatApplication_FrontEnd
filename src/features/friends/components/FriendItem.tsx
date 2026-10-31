import React, { useState } from 'react';
import type { Friend } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatShortDate } from '../utils/formatDates';

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
}

// Component that renders an individual confirmed friend in the left 320px column
export default function FriendItem({ friend, onSendMessage, onRemove, disabled = false }: FriendItemProps): React.JSX.Element {
    // Extracts the first letter of the username for the fallback avatar circle
    const avatarInitial = friend.username.charAt(0).toUpperCase();
    // When true the row swaps its icon buttons for a Remove / Keep choice, so a single misclick cannot unfriend someone
    const [isConfirmingRemove, setIsConfirmingRemove] = useState<boolean>(false);
    // Empty when the server did not send a usable date
    const connectedDate = friend.createdAt ? formatShortDate(friend.createdAt) : '';

    return (
        <div className={styles.friendItemRow}>
            <div className={styles.friendItemLeft}>
                {/* Avatar initial badge without online presence indicators */}
                <div className={styles.friendAvatar}>
                    {avatarInitial}
                </div>

                {/* Friend user handle and metadata */}
                <div className={styles.friendMeta}>
                    <span className={styles.friendUsername}>
                        {friend.username}
                    </span>
                    <span className={styles.friendSubtext}>
                        {isConfirmingRemove ? 'Remove this friend?' : connectedDate ? `Connected ${connectedDate}` : 'Friend'}
                    </span>
                </div>
            </div>

            {isConfirmingRemove ? (
                /* Inline confirmation replaces the normal actions until the user picks one */
                <div className={styles.requestActionGroup}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
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
                        className={styles.declineBtn}
                        onClick={() => setIsConfirmingRemove(false)}
                    >
                        Keep
                    </button>
                </div>
            ) : (
                <div className={styles.friendActions}>
                    {/* Direct message action button */}
                    <button
                        type="button"
                        className={styles.directMessageBtn}
                        title={`Message ${friend.username}`}
                        aria-label={`Send direct message to ${friend.username}`}
                        onClick={() => onSendMessage && onSendMessage(friend)}
                    >
                        {/* Speech bubble icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>

                    {/* Remove friend button, only opens the confirmation and does not delete anything yet */}
                    <button
                        type="button"
                        className={styles.removeFriendBtn}
                        title={`Remove ${friend.username}`}
                        aria-label={`Remove ${friend.username} from friends`}
                        disabled={disabled}
                        onClick={() => setIsConfirmingRemove(true)}
                    >
                        {/* Person with a minus sign icon */}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
