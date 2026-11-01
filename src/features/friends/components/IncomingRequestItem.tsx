import React from 'react';
import type { FriendRequestItem } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { formatRelativeTime } from '../utils/formatDates';
import { heatTextColor, requestHeat } from '../utils/heat';

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
    // True while this person is hovered here or in the circle
    highlighted?: boolean;
    // Reports hovering in and out so the circle can light the same person
    onHover?: (key: string | null) => void;
}

// Component that renders an incoming friend request row with action buttons
export default function IncomingRequestItem({
    request,
    onAccept,
    onDecline,
    disabled = false,
    highlighted = false,
    onHover
}: IncomingRequestItemProps): React.JSX.Element {
    // Computes user initial for avatar presentation
    const initial = request.username.charAt(0).toUpperCase();
    // A request starts hot and cools toward ash the longer it waits
    const heat = requestHeat(request.createdAt);
    const key = `i${request.friendshipId}`;

    return (
        <div
            className={`${styles.row} ${highlighted ? styles.rowHighlighted : ''}`}
            data-burn-key={key}
            onMouseEnter={() => onHover?.(key)}
            onMouseLeave={() => onHover?.(null)}
        >
            {/* A cold coal: they are not in the circle yet */}
            <span className={`${styles.coal} ${styles.coalCold}`} aria-hidden="true">
                {initial}
            </span>

            {/* Requester handle and how long they have been waiting, in a colour that cools with time */}
            <div className={styles.rowMeta}>
                <span className={styles.rowName}>{request.username}</span>
                <span className={styles.rowSub} style={{ color: heatTextColor(heat) }}>
                    asked {formatRelativeTime(request.createdAt)}
                </span>
            </div>

            {/* Action buttons group: Accept is an outlined pill, Decline is a quieter text action */}
            <div className={styles.rowActions}>
                <button
                    type="button"
                    className={styles.acceptBtn}
                    disabled={disabled}
                    aria-label={`Accept ${request.username}`}
                    onClick={() => onAccept && onAccept(request.friendshipId)}
                >
                    Accept
                </button>
                <button
                    type="button"
                    className={styles.textActionBtn}
                    disabled={disabled}
                    aria-label={`Decline ${request.username}`}
                    onClick={() => onDecline && onDecline(request.friendshipId)}
                >
                    Decline
                </button>
            </div>
        </div>
    );
}
