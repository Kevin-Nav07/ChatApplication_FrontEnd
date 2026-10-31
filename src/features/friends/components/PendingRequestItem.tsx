import React from 'react';
import type { FriendRequestItem } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatRelativeTime } from '../utils/formatDates';

// Props definition for the outgoing pending friend request item
interface PendingRequestItemProps {
    // The request record initiated by the current user
    request: FriendRequestItem;
    // Callback to cancel the pending friend request
    onCancel?: (friendshipId: number) => void;
    // True while another friend action is running, disables the buttons to prevent double submits
    disabled?: boolean;
}

// Component that renders a sent friend request row with a cancel option
export default function PendingRequestItem({
    request,
    onCancel,
    disabled = false
}: PendingRequestItemProps): React.JSX.Element {
    // Computes target user initial for avatar presentation
    const initial = request.username.charAt(0).toUpperCase();

    return (
        <div className={styles.requestItemRow}>
            <div className={styles.requestItemLeft}>
                {/* Target user avatar indicator */}
                <div className={styles.requestAvatar}>
                    {initial}
                </div>

                {/* Recipient handle and relative date notice */}
                <div className={styles.requestMeta}>
                    <span className={styles.requestUsername}>
                        {request.username}
                    </span>
                    <span className={styles.requestCaption}>
                        Request sent {formatRelativeTime(request.createdAt)}
                    </span>
                </div>
            </div>

            {/* Action button to cancel outgoing pending request */}
            <div className={styles.requestActionGroup}>
                <button
                    type="button"
                    className={styles.cancelBtn}
                    disabled={disabled}
                    onClick={() => onCancel && onCancel(request.friendshipId)}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

