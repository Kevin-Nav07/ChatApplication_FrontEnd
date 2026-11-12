import React from 'react';
import type { FriendRequestItem } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatRelativeTime } from '../utils/formatDates';
import { lumpShape } from '../../../components/hearth/lumpShape';

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
        <div
            className={styles.row}
            data-burn-key={`o${request.friendshipId}`}
            data-row-name={request.username} // lets the add friend form find this row and glow it right after sending
        >
            {/* A cold coal: they have not answered yet */}
            <span className={`${styles.coal} ${styles.coalCold}`} style={{ borderRadius: lumpShape(request.friendshipId) }} aria-hidden="true">
                {initial}
            </span>

            {/* Recipient handle and relative date notice */}
            <div className={styles.rowMeta}>
                <span className={styles.rowName}>{request.username}</span>
                <span className={styles.rowSub}>sent {formatRelativeTime(request.createdAt)}</span>
            </div>

            {/* Text action to take back the request */}
            <div className={styles.rowActions}>
                <button
                    type="button"
                    className={styles.textActionBtn}
                    disabled={disabled}
                    aria-label={`Cancel request to ${request.username}`}
                    onClick={() => onCancel && onCancel(request.friendshipId)}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
