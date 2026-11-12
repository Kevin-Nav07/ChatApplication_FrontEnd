import type { CSSVars } from '../../friends/utils/heat';

// How long something on the messages screen takes to cool from hot to charcoal, in seconds
export const COOL_SECONDS = 60 * 60;

// How recent a message must be, when it first appears, to count as one that just arrived and play its arrival moment
const FRESH_MS = 6000;

// Milliseconds since an ISO timestamp, or null when the timestamp is missing or unreadable
function ageMs(isoDate?: string | null): number | null {
    const time = isoDate ? Date.parse(isoDate) : Number.NaN;
    return Number.isNaN(time) ? null : Date.now() - time;
}

// The style that makes an element cool on its own. The CSS animation is one cooling period long, and a negative delay
// starts it part way through, as far in as the thing is old. The browser then keeps cooling it without any React re-render
export function coolingStyle(isoDate?: string | null): CSSVars {
    const age = ageMs(isoDate);
    const seconds = age == null ? COOL_SECONDS : Math.min(COOL_SECONDS, Math.max(0, age / 1000)); // unknown age starts cold
    return { '--cool-delay': `-${seconds.toFixed(1)}s` };
}

// True for a message created in the last few seconds, which is one that just arrived rather than one loaded from history
export function isFresh(isoDate?: string | null): boolean {
    const age = ageMs(isoDate);
    return age != null && age < FRESH_MS && age > -60000; // the lower bound tolerates a server clock up to a minute ahead
}

// Minutes since an ISO timestamp, 0 when it cannot be read
export function ageMinutes(isoDate?: string | null): number {
    const age = ageMs(isoDate);
    return age == null ? 0 : Math.max(0, age / 60000);
}

// A short label for how long ago something happened: "now", "4 min", "3 h", "Yesterday" or a date such as "9 Nov"
export function shortAgo(isoDate?: string | null): string {
    const minutes = ageMinutes(isoDate);
    if (!isoDate || Number.isNaN(Date.parse(isoDate))) {
        return '';
    }
    if (minutes < 1) {
        return 'now';
    }
    if (minutes < 60) {
        return `${Math.floor(minutes)} min`;
    }
    const date = new Date(isoDate);
    if (date.toDateString() === new Date().toDateString()) {
        return `${Math.floor(minutes / 60)} h`;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// An irregular rounded outline for a coal, so no two coals are the same perfect circle.
// It is worked out from the id with fixed arithmetic, so the same room always gets the same lump
export function lumpShape(id: number): string {
    const a = 40 + ((id * 37) % 21); // each value lands between 40 and 60 percent
    const b = 40 + ((id * 53) % 21);
    const c = 40 + ((id * 71) % 21);
    const d = 40 + ((id * 89) % 21);
    // The eight values set the horizontal and vertical radius of each corner, the slash separates the two sets
    return `${a}% ${100 - a}% ${b}% ${100 - b}% / ${c}% ${d}% ${100 - d}% ${100 - c}%`;
}
