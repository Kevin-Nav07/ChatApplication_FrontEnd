import React from 'react';
import type { FriendRequestItem } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatRelativeTime } from '../utils/formatDates';

// Props definition for the incoming friend request item
interface IncomingRequestItemProps {
    // The request record received from another user
    request: FriendRequestItem;
    // Callback to accept the incoming friend request
    onAccept?: (friendshipId: number) => void;
    // Callback to decline the incoming friend request
    onDecline?: (friendshipId: number) => void;
    // True while another friend action is running, disables the buttons to prevent double submits
    disabled?: boolean;
}

// Component that renders an incoming friend request row with action buttons
export default function IncomingRequestItem({
    request,
    onAccept,
    onDecline,
    disabled = false
}: IncomingRequestItemProps): React.JSX.Element {
    // Computes user initial for avatar presentation
    const initial = request.username.charAt(0).toUpperCase();

    return (
        <div className={styles.requestItemRow}>
            <div className={styles.requestItemLeft}>
                {/* User avatar indicator */}
                <div className={styles.requestAvatar}>
                    {initial}
                </div>

                {/* Requester handle and subtitle */}
                <div className={styles.requestMeta}>
                    <span className={styles.requestUsername}>
                        {request.username}
                    </span>
                    <span className={styles.requestCaption}>
                        wants to connect with you, {formatRelativeTime(request.createdAt)}
                    </span>
                </div>
            </div>

            {/* Action buttons group: Accept and Decline */}
            <div className={styles.requestActionGroup}>
                <button
                    type="button"
                    className={styles.acceptBtn}
                    disabled={disabled}
                    onClick={() => onAccept && onAccept(request.friendshipId)}
                >
                    Accept
                </button>
                <button
                    type="button"
                    className={styles.declineBtn}
                    disabled={disabled}
                    onClick={() => onDecline && onDecline(request.friendshipId)}
                >
                    Decline
                </button>
            </div>
        </div>
    );
}

