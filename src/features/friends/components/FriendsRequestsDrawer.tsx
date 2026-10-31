import React, { useState } from 'react';
import type { FriendRequestItem, RequestDrawerTab } from '../types/friends';
import IncomingRequestItem from './IncomingRequestItem';
import PendingRequestItem from './PendingRequestItem';
import styles from '../styles/Friends.module.css';

// Props definition for the requests drawer card
interface FriendsRequestsDrawerProps {
    // Array of incoming friend requests
    incomingRequests: FriendRequestItem[];
    // Array of outgoing pending requests
    outgoingRequests: FriendRequestItem[];
    // Handler to accept an incoming request
    onAccept?: (friendshipId: number) => void;
    // Handler to decline an incoming request
    onDecline?: (friendshipId: number) => void;
    // Handler to cancel a sent pending request
    onCancel?: (friendshipId: number) => void;
    // True while a friend action is running, passed down so every request button is disabled
    disabled?: boolean;
}

// Component that renders the bottom stage card with a segmented toggle for requests
export default function FriendsRequestsDrawer({
    incomingRequests,
    outgoingRequests,
    onAccept,
    onDecline,
    onCancel,
    disabled = false
}: FriendsRequestsDrawerProps): React.JSX.Element {
    // Tracks whether the user is viewing incoming requests or outgoing sent requests
    const [activeTab, setActiveTab] = useState<RequestDrawerTab>('incoming');

    return (
        <div className={styles.requestsDrawerCard}>
            {/* Drawer top bar with segmented control */}
            <div className={styles.drawerHeader}>
                <div className={styles.segmentedGroup}>
                    {/* Incoming Tab */}
                    <button
                        type="button"
                        className={`${styles.segmentedTab} ${activeTab === 'incoming' ? styles.segmentedTabActive : ''}`}
                        onClick={() => setActiveTab('incoming')}
                    >
                        Incoming ({incomingRequests.length})
                    </button>

                    {/* Sent Pending Tab */}
                    <button
                        type="button"
                        className={`${styles.segmentedTab} ${activeTab === 'outgoing' ? styles.segmentedTabActive : ''}`}
                        onClick={() => setActiveTab('outgoing')}
                    >
                        Sent Pending ({outgoingRequests.length})
                    </button>
                </div>

                <span className={styles.drawerSubtitle}>
                    {activeTab === 'incoming' ? 'Requests awaiting your response' : 'Requests awaiting friend response'}
                </span>
            </div>

            {/* Request items scrollable list */}
            <div className={styles.requestsListBody}>
                {/* Incoming Requests View */}
                {activeTab === 'incoming' && (
                    <>
                        {incomingRequests.length === 0 ? (
                            <div className={styles.emptyRequestsBox}>
                                <p className={styles.emptyRequestsTitle}>No incoming requests</p>
                                <p className={styles.emptyRequestsDesc}>When someone sends you a friend request, it will appear here.</p>
                            </div>
                        ) : (
                            incomingRequests.map((req) => (
                                <IncomingRequestItem
                                    key={req.friendshipId}
                                    request={req}
                                    onAccept={onAccept}
                                    onDecline={onDecline}
                                    disabled={disabled}
                                />
                            ))
                        )}
                    </>
                )}

                {/* Sent Pending Requests View */}
                {activeTab === 'outgoing' && (
                    <>
                        {outgoingRequests.length === 0 ? (
                            <div className={styles.emptyRequestsBox}>
                                <p className={styles.emptyRequestsTitle}>No pending sent requests</p>
                                <p className={styles.emptyRequestsDesc}>Friend requests you have sent to others will be tracked here.</p>
                            </div>
                        ) : (
                            outgoingRequests.map((req) => (
                                <PendingRequestItem
                                    key={req.friendshipId}
                                    request={req}
                                    onCancel={onCancel}
                                    disabled={disabled}
                                />
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

