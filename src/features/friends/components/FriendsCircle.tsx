import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Friend, FriendRequestItem } from '../types/friends';
import styles from '../styles/Friends.module.css';
import { coalStyle, friendRing, friendWarmth, heatTextColor, requestHeat, type CSSVars } from '../utils/heat';
import { formatRelativeTime } from '../utils/formatDates';
import { useHearth } from '../../../components/hearth/useHearth';
import type { HearthApi } from '../../../components/hearth/hearthContext';

// Props for the circle around the fire
interface FriendsCircleProps {
    // Confirmed friends, each takes a seat on one of the three rings
    friends: Friend[];
    // Requests waiting on the user, they stand at the edge of the light
    incoming: FriendRequestItem[];
    // True during the first load, the fire burns low as kindling until it is done
    isLoading: boolean;
    // Lowercase search text from the list, seats that do not match fade back
    searchQuery: string;
    // The person currently hovered in the circle or the list, so both light up together
    hoveredKey: string | null;
    onHover: (key: string | null) => void;
    // Called when a friend's coal is clicked, the list scrolls to them
    onSeatClick: (friendshipId: number) => void;
    onAccept: (friendshipId: number) => void;
    onDecline: (friendshipId: number) => void;
    // True while a friend action is running
    disabled: boolean;
}

// One spot in the circle, worked out from the data before anything is drawn
interface Seat {
    id: number; // the friendship id, which stays the same when a request becomes a friendship
    kind: 'friend' | 'waiting';
    name: string;
    ring: number; // 0 to 2 for friends, 3 for the edge of the light
    createdAt?: string;
    x: number; // position as a percentage of the circle's width
    y: number;
}

const RING_RADII = [17, 28, 39]; // percent of the circle's width
const RING_OFFSETS = [0, 20, -14]; // degrees, so seats on neighbouring rings do not line up
const RING_LIGHT = [1, 0.8, 0.62]; // how much firelight reaches each ring, the outer ring sits further into the dark
const EDGE_RADIUS = 47;
const MAX_WAITING_SEATS = 4; // more than this would crowd the bottom edge, the rest are only in the list
const DESIGN_SIZE = 600; // the circle size the coals and labels were designed at
const EASE = 'cubic-bezier(.22,.9,.24,1)';
// When people are waiting at the bottom edge, the outer ring would put friends on top of them,
// so its seats use these two arcs instead (in degrees, 0 is to the right and 90 is straight down), either side of the top label
const OUTER_ARCS: [number, number][] = [[150, 250], [290, 390]];

// Spreads count seats evenly along the outer arcs and returns each seat's angle in degrees
function outerArcAngles(count: number): number[] {
    const total = OUTER_ARCS.reduce((sum, [from, to]) => sum + (to - from), 0);
    return Array.from({ length: count }, (_, i) => {
        let along = ((i + 0.5) * total) / count; // the middle of this seat's share of the arcs
        for (const [from, to] of OUTER_ARCS) {
            if (along <= to - from) {
                return from + along;
            }
            along -= to - from; // past this arc, carry the rest over to the next one
        }
        return OUTER_ARCS[0][0];
    });
}

// Places every friend on a ring, spaced evenly, and the waiting requests along the bottom edge
// Half a step past the top keeps the top of each ring free for its label
function layoutSeats(friends: Friend[], incoming: FriendRequestItem[]): Seat[] {
    const rings: Friend[][] = [[], [], []];
    friends.forEach((friend) => rings[friendRing(friend.createdAt)].push(friend));

    const seats: Seat[] = [];
    rings.forEach((group, ring) => {
        const sorted = [...group].sort((a, b) => a.username.localeCompare(b.username)); // stable order, so seats do not shuffle between loads
        const step = 360 / Math.max(1, sorted.length);
        const avoidBottom = ring === 2 && incoming.length > 0;
        const arcAngles = avoidBottom ? outerArcAngles(sorted.length) : [];
        sorted.forEach((friend, i) => {
            const degrees = avoidBottom ? arcAngles[i] : -90 + step / 2 + i * step + RING_OFFSETS[ring];
            const angle = (degrees * Math.PI) / 180;
            seats.push({
                id: friend.friendshipId,
                kind: 'friend',
                name: friend.username,
                ring,
                createdAt: friend.createdAt,
                x: 50 + RING_RADII[ring] * Math.cos(angle), // cos and sin turn an angle into a point on the ring
                y: 50 + RING_RADII[ring] * Math.sin(angle)
            });
        });
    });

    const count = incoming.length;
    const spread = count <= 1 ? 0 : Math.min(116, 46 * (count - 1)); // degrees of the bottom arc they share
    incoming.forEach((request, i) => {
        const degrees = count <= 1 ? 90 : 90 - spread / 2 + (i * spread) / (count - 1); // 90 degrees is straight down
        const angle = (degrees * Math.PI) / 180;
        seats.push({
            id: request.friendshipId,
            kind: 'waiting',
            name: request.username,
            ring: 3,
            createdAt: request.createdAt,
            x: 50 + EDGE_RADIUS * Math.cos(angle),
            y: 50 + EDGE_RADIUS * Math.sin(angle)
        });
    });
    return seats;
}

// A newcomer's coal catches as it reaches its seat: it arrives cold, embers arc in from the fire, and it flares
function kindle(seatElement: HTMLDivElement, hearth: HearthApi): void {
    const coal = seatElement.querySelector<HTMLElement>('[data-coal]');
    if (!coal) {
        return;
    }
    const target = seatElement.getBoundingClientRect(); // read before the glide starts, so this is where the coal will land
    hearth.emberArc(target.left, target.top, 7);
    // A single keyframe animates from that look to the coal's normal CSS look, so there is no jump at the end
    coal.animate([{ filter: 'grayscale(1) brightness(.45)' }], { duration: 860, easing: 'ease-in' });
    window.setTimeout(() => {
        coal.animate(
            [{ transform: 'scale(1.22)', boxShadow: '0 0 0 2px rgba(255,214,160,.95), 0 0 54px rgba(255,140,60,.95)' }],
            { duration: 1100, easing: 'cubic-bezier(.2,.7,.3,1)' }
        );
        hearth.burst(target.left, target.top, 22, 1.1);
    }, 820);
}

// The friends screen's centrepiece: a fire with friends seated around it on three rings by how long they have been friends,
// and people waiting to join standing at the edge of the light
export default function FriendsCircle({
    friends,
    incoming,
    isLoading,
    searchQuery,
    hoveredKey,
    onHover,
    onSeatClick,
    onAccept,
    onDecline,
    disabled
}: FriendsCircleProps): React.JSX.Element {
    const hearth = useHearth();
    const wrapRef = useRef<HTMLDivElement>(null);
    // Seat elements by friendship id, filled by the ref callbacks below, read by the layout effect for the glide animations
    const seatElements = useRef(new Map<number, HTMLDivElement>());
    // Where every seat was after the last render, as percentages, so the next render can animate from there
    const previousSeats = useRef(new Map<number, Pick<Seat, 'x' | 'y' | 'kind'>>());
    const [size, setSize] = useState<number>(520);

    // useMemo only recomputes the layout when the data changes, not on every hover
    const seats = useMemo(() => layoutSeats(friends, incoming.slice(0, MAX_WAITING_SEATS)), [friends, incoming]);
    const hiddenWaiting = Math.max(0, incoming.length - MAX_WAITING_SEATS);
    const scale = Math.max(0.7, Math.min(1, size / DESIGN_SIZE));

    // Keeps the circle square and as large as the space allows. ResizeObserver reports whenever the wrapper changes size
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap) {
            return;
        }
        const measure = (): void => {
            const style = getComputedStyle(wrap);
            const width = wrap.clientWidth;
            const height = wrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            const stacked = window.matchMedia('(max-width: 900px)').matches; // on narrow screens the page scrolls, so only the width limits it
            const next = stacked ? Math.min(width - 16, 560) : Math.max(300, Math.min(width - 120, height - 30, 780));
            setSize(Math.round(next));
        };
        const observer = new ResizeObserver(measure);
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);

    // FLIP (First, Last, Invert, Play): the browser has already moved each seat to its new spot, so each one is shifted back
    // to where it was and animated forward. useLayoutEffect runs before the screen is painted, so the jump is never seen
    useLayoutEffect(() => {
        const before = previousSeats.current;
        const next = new Map<number, Pick<Seat, 'x' | 'y' | 'kind'>>();
        seats.forEach((seat) => {
            next.set(seat.id, { x: seat.x, y: seat.y, kind: seat.kind });
            const old = before.get(seat.id);
            const element = seatElements.current.get(seat.id);
            if (!old || !element || hearth.reducedMotion) {
                return;
            }
            if (old.kind === 'waiting' && seat.kind === 'friend') {
                kindle(element, hearth);
            }
            const dx = ((old.x - seat.x) / 100) * size;
            const dy = ((old.y - seat.y) / 100) * size;
            if (Math.abs(dx) + Math.abs(dy) > 0.5) {
                element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 860, easing: EASE });
            }
        });
        previousSeats.current = next;
    }, [seats, size, hearth]);

    const circleStyle: CSSVars = { width: `${size}px`, height: `${size}px`, '--k': scale.toFixed(3) };

    return (
        <div className={styles.circleWrap} ref={wrapRef}>
            {/* data-hearth-fire tells the hearth canvas to burn its fire in the centre of this element */}
            <div
                className={`${styles.circle} ${scale < 0.8 ? styles.compact : ''}`} // a small circle hides names until hovered, or neighbours overlap
                style={circleStyle}
                data-hearth-fire=""
                data-hearth-intensity={isLoading ? 'kindling' : 'full'}
            >
                {/* The three rings, drawn on like charcoal when the screen opens, each labelled along its top */}
                <svg className={styles.rings} viewBox="0 0 100 100" aria-hidden="true">
                    <defs>
                        <path id="ring-path-0" d="M 33 50 A 17 17 0 0 1 67 50" />
                        <path id="ring-path-1" d="M 22 50 A 28 28 0 0 1 78 50" />
                        <path id="ring-path-2" d="M 11 50 A 39 39 0 0 1 89 50" />
                    </defs>
                    <g filter="url(#hearth-rough-svg)" fill="none" stroke="rgba(214,198,180,.17)" strokeWidth="0.24">
                        {/* pathLength="100" lets the CSS draw each circle from 0 to 100 percent whatever its real length */}
                        <circle className={styles.ringLine} cx="50" cy="50" r="17" pathLength={100} transform="rotate(-90 50 50)" />
                        <circle className={styles.ringLine} cx="50" cy="50" r="28" pathLength={100} transform="rotate(-90 50 50)" />
                        <circle className={styles.ringDashed} cx="50" cy="50" r="39" strokeDasharray="1.4 1.1" />
                    </g>
                    <g className={styles.ringText}>
                        <text dy="-1"><textPath href="#ring-path-0" startOffset="50%" textAnchor="middle">old friends</textPath></text>
                        <text dy="-1"><textPath href="#ring-path-1" startOffset="50%" textAnchor="middle">this month</textPath></text>
                        <text dy="-1"><textPath href="#ring-path-2" startOffset="50%" textAnchor="middle">new</textPath></text>
                    </g>
                </svg>

                <div className={styles.seats}>
                    {seats.map((seat, index) => {
                        const key = seat.kind === 'friend' ? `f${seat.id}` : `i${seat.id}`;
                        const matches = !searchQuery || seat.name.toLowerCase().includes(searchQuery);
                        const heat = seat.kind === 'friend' ? friendWarmth(seat.createdAt) : requestHeat(seat.createdAt);
                        const seatStyle: CSSVars = {
                            left: `${seat.x}%`,
                            top: `${seat.y}%`,
                            '--lit': String(seat.kind === 'friend' ? RING_LIGHT[seat.ring] : 0.5),
                            '--arrive-delay': `${300 + index * 70}ms`, // seats catch one after another when the circle first appears
                            '--breath-delay': `${-((seat.id * 0.37) % 1) * 4}s`, // worked out from the id so every coal breathes out of step
                            '--breath-length': `${3.2 + (seat.id % 5) * 0.45}s`,
                            ...(seat.kind === 'friend' ? coalStyle(heat) : {})
                        };
                        const seatClass = [
                            styles.seat,
                            seat.kind === 'friend' ? styles[`ring${seat.ring}`] : styles.waiting,
                            matches ? '' : styles.dim,
                            hoveredKey === key ? styles.hl : ''
                        ].join(' ');

                        return (
                            // key is the friendship id for both kinds, so when a request is accepted React keeps the same element and it can glide
                            <div
                                key={seat.id}
                                className={seatClass}
                                style={seatStyle}
                                ref={(element) => {
                                    if (!element) {
                                        return;
                                    }
                                    seatElements.current.set(seat.id, element);
                                    return () => {
                                        seatElements.current.delete(seat.id); // React 19 runs this when the element leaves the page
                                    };
                                }}
                                onMouseEnter={() => onHover(key)}
                                onMouseLeave={() => onHover(null)}
                            >
                                {seat.kind === 'friend' ? (
                                    <>
                                        <button
                                            type="button"
                                            className={styles.coal}
                                            data-coal=""
                                            data-burn-key={key}
                                            aria-label={`${seat.name}, find in the list`}
                                            onClick={() => onSeatClick(seat.id)}
                                        >
                                            {seat.name.charAt(0).toUpperCase()}
                                        </button>
                                        <span className={styles.seatName} data-burn-key={key}>{seat.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className={`${styles.coal} ${styles.coalCold}`} data-coal="" data-burn-key={key} aria-hidden="true">
                                            {seat.name.charAt(0).toUpperCase()}
                                        </span>
                                        <div className={styles.seatLabel} data-burn-key={key}>
                                            <span className={styles.seatName}>{seat.name}</span>
                                            <span className={styles.seatMeta} style={{ color: heatTextColor(heat) }}>
                                                asked {formatRelativeTime(seat.createdAt ?? '')}
                                            </span>
                                            <span className={styles.seatActions}>
                                                <button
                                                    type="button"
                                                    className={styles.acceptBtn}
                                                    disabled={disabled}
                                                    aria-label={`Accept ${seat.name}`}
                                                    onClick={() => onAccept(seat.id)}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.textActionBtn}
                                                    disabled={disabled}
                                                    aria-label={`Decline ${seat.name}`}
                                                    onClick={() => onDecline(seat.id)}
                                                >
                                                    Decline
                                                </button>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Words under the fire for the two moments the circle has nothing to show yet */}
                {isLoading && <p className={styles.circleCaption}>Lighting the fire...</p>}
                {!isLoading && friends.length === 0 && incoming.length === 0 && (
                    <p className={styles.circleCaption}>
                        The circle is empty.<br />Add someone by their username to pull up a seat.
                    </p>
                )}
                {hiddenWaiting > 0 && <p className={styles.moreWaiting}>+{hiddenWaiting} more waiting in the list</p>}
            </div>
        </div>
    );
}
