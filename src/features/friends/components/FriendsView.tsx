import React, { useEffect, useState } from 'react';
import type { Friend, FriendRequestItem } from '../types/friends';
import FriendItem from './FriendItem';
import AddFriendCard from './AddFriendCard';
import FriendsRequestsDrawer from './FriendsRequestsDrawer';
import styles from '../styles/Friends.module.css';
import { getErrorMessage } from '../../../models/AppError';
import {
    acceptFriendRequest,
    deleteFriendship,
    getFriends,
    getPendingRequests,
    sendFriendRequest
} from '../../../services/friendService';

// Props definition for the top-level FriendsView feature component
interface FriendsViewProps {
    // Optional callback when a user triggers direct messaging with a friend
    onDirectMessage?: (friend: Friend) => void;
}

// Everything the Friends page shows, already split into the three lists the UI renders
interface FriendsData {
    friends: Friend[];
    incoming: FriendRequestItem[];
    outgoing: FriendRequestItem[];
}

// Fetches friends and pending requests from the server and splits the requests by direction
// It only returns data and never touches React state, which lets the effect and the action handlers decide when to store it
async function fetchFriendsData(): Promise<FriendsData> {
    // Promise.all runs both requests at the same time instead of one after the other
    const [friends, pendingRequests] = await Promise.all([getFriends(), getPendingRequests()]);
    return {
        friends,
        incoming: pendingRequests.filter((r) => r.direction === 'incoming'),
        outgoing: pendingRequests.filter((r) => r.direction === 'outgoing')
    };
}

// Master component for the Friends feature implementing Method 3 (Split-View Partitioned)
// It owns all friend data. After every change it reloads both lists from the server instead of editing them by hand,
// so what is on screen always matches the database
export default function FriendsView({ onDirectMessage }: FriendsViewProps): React.JSX.Element {
    // State holding confirmed friends
    const [friends, setFriends] = useState<Friend[]>([]);
    // State holding incoming friend requests
    const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
    // State holding outgoing pending requests
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
    // State for filtering confirmed friends by search text
    const [searchQuery, setSearchQuery] = useState<string>('');
    // True until the first load finishes, so the list can say "Loading" instead of "No friends added yet"
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // True while accept, decline, cancel or remove is running, disables those buttons to prevent double clicks
    const [isMutating, setIsMutating] = useState<boolean>(false);
    // Message from the last failed load or action, shown in a banner above the cards
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Copies freshly fetched data into the three pieces of state the lists render from
    const applyFriendsData = (data: FriendsData): void => {
        setFriends(data.friends);
        setIncomingRequests(data.incoming);
        setOutgoingRequests(data.outgoing);
    };

    // Loads the data once when the Friends tab is opened
    // State is only set inside the .then callbacks, after the network answers, which is the pattern React recommends for fetching in an effect
    useEffect(() => {
        // Set to true by the cleanup when the component unmounts (for example the user switches tabs mid load),
        // so a late response is thrown away instead of being written into a component that is gone.
        // In development StrictMode runs effects twice on purpose, and this flag also stops the first run from setting state
        let ignore = false;
        fetchFriendsData()
            .then((data) => {
                if (!ignore) {
                    setFriends(data.friends);
                    setIncomingRequests(data.incoming);
                    setOutgoingRequests(data.outgoing);
                }
            })
            .catch((error: unknown) => {
                if (!ignore) {
                    setErrorMessage(getErrorMessage(error));
                }
            })
            .finally(() => {
                if (!ignore) {
                    setIsLoading(false);
                }
            });
        return () => {
            ignore = true;
        };
    }, []); // empty array means run once when the component first appears

    // Shared wrapper for accept, decline, cancel and remove: runs the server call, then reloads the lists,
    // or shows the server's reason if the call failed
    const runAction = async (action: () => Promise<void>): Promise<void> => {
        setIsMutating(true);
        setErrorMessage(null);
        try {
            await action();
            applyFriendsData(await fetchFriendsData());
        }
        catch (error: unknown) {
            setErrorMessage(getErrorMessage(error));
        }
        finally {
            setIsMutating(false);
        }
    };

    // Filters the friends list by the user-typed query
    const filteredFriends = friends.filter((f) =>
        f.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    // Sends a request, then reloads so it appears under Sent Pending
    // Errors are not caught here on purpose: AddFriendCard catches them and shows the message under its own input
    const handleSendRequest = async (targetUsername: string): Promise<void> => {
        await sendFriendRequest(targetUsername);
        applyFriendsData(await fetchFriendsData());
    };

    // Accepting moves the request into the friends list once the lists reload
    const handleAcceptRequest = (friendshipId: number): void => {
        runAction(() => acceptFriendRequest(friendshipId));
    };

    // Declining, cancelling and removing all delete the same friendship row on the server
    const handleDeleteFriendship = (friendshipId: number): void => {
        runAction(() => deleteFriendship(friendshipId));
    };

    return (
        <div className={styles.friendsContainer}>
            {/* ----------------------------------------------------------------
                Left Column: Confirmed Friends List Pane (320px)
               ---------------------------------------------------------------- */}
            <aside className={styles.friendsListPane} aria-label="Friends List">
                {/* Header bar with total friends badge */}
                <div className={styles.friendsListHeader}>
                    <h2 className={styles.friendsListTitle}>Friends</h2>
                    <span className={styles.countBadge}>{friends.length}</span>
                </div>

                {/* Search bar capsule */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputWrapper}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Find in friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Confirmed Friends Scrollable List */}
                <div className={styles.friendsListBody}>
                    {isLoading ? (
                        <div className={styles.emptyListMessage}>Loading friends...</div>
                    ) : filteredFriends.length === 0 ? (
                        <div className={styles.emptyListMessage}>
                            {searchQuery ? 'No friends match your search.' : 'No friends added yet.'}
                        </div>
                    ) : (
                        filteredFriends.map((friend) => (
                            <FriendItem
                                key={friend.friendshipId}
                                friend={friend}
                                onSendMessage={onDirectMessage}
                                onRemove={handleDeleteFriendship}
                                disabled={isMutating}
                            />
                        ))
                    )}
                </div>
            </aside>

            {/* ----------------------------------------------------------------
                Right Column: Split Stage Canvas (Flex 1)
                Houses AddFriendCard on top and FriendsRequestsDrawer on bottom
               ---------------------------------------------------------------- */}
            <section className={styles.friendsStagePane} aria-label="Friends Management Canvas">
                {/* Error banner for failed loads and actions, role alert makes screen readers read it out */}
                {errorMessage && (
                    <div className={styles.errorBanner} role="alert">
                        <span>{errorMessage}</span>
                        <button
                            type="button"
                            className={styles.errorBannerClose}
                            aria-label="Dismiss error"
                            onClick={() => setErrorMessage(null)}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Top Panel: Add Friend input card */}
                <AddFriendCard onSendRequest={handleSendRequest} />

                {/* Bottom Panel: Requests drawer (Incoming vs Sent Pending) */}
                <FriendsRequestsDrawer
                    incomingRequests={incomingRequests}
                    outgoingRequests={outgoingRequests}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeleteFriendship}
                    onCancel={handleDeleteFriendship}
                    disabled={isMutating}
                />
            </section>
        </div>
    );
}
