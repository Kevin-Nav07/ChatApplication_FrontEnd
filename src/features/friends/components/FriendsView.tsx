import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Friend, FriendRequestItem } from '../types/friends';
import FriendItem from './FriendItem';
import AddFriendCard from './AddFriendCard';
import FriendsCircle from './FriendsCircle';
import IncomingRequestItem from './IncomingRequestItem';
import PendingRequestItem from './PendingRequestItem';
import styles from '../styles/Friends.module.css';
import { getErrorMessage } from '../../../models/AppError';
import { useHearth } from '../../../components/hearth/useHearth';
import { burnAway, restoreBurned } from '../../../components/hearth/burn';
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

// Extra steps for runAction around the server call
interface ActionOptions {
    // data-burn-key of the elements to burn away once the server confirms, for example "i12"
    burnKey?: string;
    // Runs after the new lists are on screen, used to glow the row that just changed
    afterApply?: () => void;
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

// A brief warm glow across a list row, so the eye finds what just changed
function glowRow(row: Element | null, reducedMotion: boolean): void {
    if (!row) {
        return;
    }
    row.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    row.animate(
        [{ backgroundColor: 'rgba(229, 117, 61, 0.28)' }, { backgroundColor: 'rgba(229, 117, 61, 0)' }],
        { duration: reducedMotion ? 600 : 1400, easing: 'ease-out' }
    );
}

// "1 friend", "3 friends"
function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// Master component for the Friends feature: the circle around the fire on the left, everyone as a list on the right
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
    // True until the first load finishes, so the fire burns as kindling and the list says it is still loading
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // True while accept, decline, cancel or remove is running, disables those buttons to prevent double clicks
    const [isMutating, setIsMutating] = useState<boolean>(false);
    // Message from the last failed load or action, shown under the header
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // The person hovered in the circle or the list, such as "f12", so both places light up together
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const hearth = useHearth();

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

    // Shared wrapper for accept, decline, cancel and remove
    // Order matters: the server call comes first, so nothing burns unless the server really deleted it.
    // Then the burn and the reload run at the same time, and the new lists are applied once both are done
    const runAction = async (action: () => Promise<void>, options: ActionOptions = {}): Promise<void> => {
        setIsMutating(true);
        setErrorMessage(null);
        let burned: HTMLElement[] = [];
        try {
            await action();
            if (options.burnKey) {
                // Every element tagged with this key: the row in the list and the coal and name in the circle
                burned = Array.from(document.querySelectorAll<HTMLElement>(`[data-burn-key="${options.burnKey}"]`));
            }
            const [data] = await Promise.all([fetchFriendsData(), burnAway(burned, hearth)]);
            // flushSync makes React put the new lists on screen before the next line runs, so afterApply can find the new rows
            flushSync(() => applyFriendsData(data));
            options.afterApply?.();
        }
        catch (error: unknown) {
            setErrorMessage(getErrorMessage(error));
        }
        finally {
            restoreBurned(burned); // only matters if a burned item is still on screen because the reload failed
            setIsMutating(false);
        }
    };

    // Filters the friends list by the user-typed query, then sorts it by name so it is easy to scan
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const filteredFriends = friends
        .filter((f) => f.username.toLowerCase().includes(normalizedQuery))
        .sort((a, b) => a.username.localeCompare(b.username));

    // Sends a request, then reloads so it appears under "Waiting on them" and glows there
    // Errors are not caught here on purpose: AddFriendCard catches them and shows the message under its own input
    const handleSendRequest = async (targetUsername: string): Promise<void> => {
        await sendFriendRequest(targetUsername);
        const data = await fetchFriendsData();
        flushSync(() => applyFriendsData(data));
        glowRow(document.querySelector(`[data-row-name="${CSS.escape(targetUsername)}"]`), hearth.reducedMotion); // CSS.escape makes any username safe inside a selector
    };

    // Accepting moves the request into the circle once the lists reload; the circle sees the same id change kind and kindles it
    const handleAcceptRequest = (friendshipId: number): void => {
        runAction(() => acceptFriendRequest(friendshipId), {
            afterApply: () => glowRow(document.getElementById(`friend-row-${friendshipId}`), hearth.reducedMotion)
        });
    };

    // Declining, cancelling and removing all delete the same friendship row on the server; each burns its own elements
    const handleDecline = (friendshipId: number): void => {
        runAction(() => deleteFriendship(friendshipId), { burnKey: `i${friendshipId}` });
    };
    const handleCancel = (friendshipId: number): void => {
        runAction(() => deleteFriendship(friendshipId), { burnKey: `o${friendshipId}` });
    };
    const handleRemoveFriend = (friendshipId: number): void => {
        runAction(() => deleteFriendship(friendshipId), { burnKey: `f${friendshipId}` });
    };

    // A click on a coal in the circle finds that friend in the list
    const handleSeatClick = (friendshipId: number): void => {
        glowRow(document.getElementById(`friend-row-${friendshipId}`), hearth.reducedMotion);
    };

    return (
        // data-hearth-calm keeps drifting embers out of the room; the fire and the sparks from actions still burn
        <div className={styles.friendsContainer} data-hearth-calm="">
            {/* ----------------------------------------------------------------
                Left: the stage, with the title, the add friend form and the circle
               ---------------------------------------------------------------- */}
            <section className={styles.stage} aria-labelledby="friends-title">
                <header className={styles.stageHead}>
                    <div>
                        <h1 id="friends-title" className={styles.title}>Around the fire</h1>
                        <p className={styles.subtitle}>
                            {isLoading ? (
                                'Lighting the fire...'
                            ) : (
                                <>
                                    {plural(friends.length, 'friend')} by the fire ·{' '}
                                    {incomingRequests.length > 0
                                        ? <em className={styles.subtitleWarm}>{incomingRequests.length} waiting at the edge of the light</em>
                                        : 'nobody waiting'}
                                </>
                            )}
                        </p>
                    </div>
                    <AddFriendCard onSendRequest={handleSendRequest} />
                </header>

                {/* Error notice for failed loads and actions, role alert makes screen readers read it out */}
                {errorMessage && (
                    <div className={styles.errorBanner} role="alert">
                        <span>{errorMessage}</span>
                        <button
                            type="button"
                            className={styles.errorBannerClose}
                            onClick={() => setErrorMessage(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <FriendsCircle
                    friends={friends}
                    incoming={incomingRequests}
                    isLoading={isLoading}
                    searchQuery={normalizedQuery}
                    hoveredKey={hoveredKey}
                    onHover={setHoveredKey}
                    onSeatClick={handleSeatClick}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDecline}
                    disabled={isMutating}
                />
            </section>

            {/* ----------------------------------------------------------------
                Right: everyone as a list, which scales past what the circle can show
               ---------------------------------------------------------------- */}
            <aside className={styles.listPanel} aria-label="Everyone">
                <div className={styles.listTop}>
                    <h2 className={styles.panelTitle}>Everyone</h2>
                    <div className={styles.field}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Find a friend"
                            aria-label="Find a friend"
                            autoComplete="off"
                            spellCheck={false}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.listScroll}>
                    {/* Requests that need the user's answer come first */}
                    <h3 className={`${styles.listHead} ${incomingRequests.length > 0 ? styles.listHeadWarm : ''}`}>
                        Waiting on you <span>{incomingRequests.length}</span>
                    </h3>
                    {incomingRequests.length === 0 ? (
                        <p className={styles.emptyLine}>{isLoading ? 'Looking...' : 'No one at the edge of the light.'}</p>
                    ) : (
                        incomingRequests.map((req) => (
                            <IncomingRequestItem
                                key={req.friendshipId}
                                request={req}
                                onAccept={handleAcceptRequest}
                                onDecline={handleDecline}
                                disabled={isMutating}
                                highlighted={hoveredKey === `i${req.friendshipId}`}
                                onHover={setHoveredKey}
                            />
                        ))
                    )}

                    <h3 className={styles.listHead}>
                        Waiting on them <span>{outgoingRequests.length}</span>
                    </h3>
                    {outgoingRequests.length === 0 ? (
                        <p className={styles.emptyLine}>{isLoading ? 'Looking...' : 'No requests out.'}</p>
                    ) : (
                        outgoingRequests.map((req) => (
                            <PendingRequestItem
                                key={req.friendshipId}
                                request={req}
                                onCancel={handleCancel}
                                disabled={isMutating}
                            />
                        ))
                    )}

                    <h3 className={styles.listHead}>
                        Friends <span>{friends.length}</span>
                    </h3>
                    {isLoading ? (
                        <p className={styles.emptyLine}>Lighting the fire...</p>
                    ) : filteredFriends.length === 0 ? (
                        <p className={styles.emptyLine}>{searchQuery ? 'Nobody by that name.' : 'The circle is empty for now.'}</p>
                    ) : (
                        filteredFriends.map((friend) => (
                            <FriendItem
                                key={friend.friendshipId}
                                friend={friend}
                                onSendMessage={onDirectMessage}
                                onRemove={handleRemoveFriend}
                                disabled={isMutating}
                                highlighted={hoveredKey === `f${friend.friendshipId}`}
                                onHover={setHoveredKey}
                            />
                        ))
                    )}
                </div>
            </aside>
        </div>
    );
}
