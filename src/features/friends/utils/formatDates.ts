// Size of each time unit in seconds, largest first, so the first unit that fits gives the most natural wording
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60]
];

// Turns an ISO timestamp from the server into a short calendar date such as "Oct 24"
// Intl is built into the browser and formats in the user's own language, so no date library is needed
export function formatShortDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) { // the server sent something that is not a date, show nothing rather than "Invalid Date"
        return '';
    }
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date); // undefined means use the browser's locale
}

// Turns an ISO timestamp into wording relative to now, such as "2 hours ago" or "yesterday"
export function formatRelativeTime(isoDate: string): string {
    const timestamp = new Date(isoDate).getTime();
    if (Number.isNaN(timestamp)) {
        return '';
    }
    const secondsAgo = Math.max(0, Math.round((Date.now() - timestamp) / 1000)); // clamps to 0 in case the server clock is slightly ahead
    // numeric 'auto' lets Intl say "yesterday" instead of "1 day ago"
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    for (const [unit, unitSeconds] of RELATIVE_UNITS) {
        if (secondsAgo >= unitSeconds) {
            return formatter.format(-Math.floor(secondsAgo / unitSeconds), unit); // negative numbers mean the past
        }
    }
    return 'just now'; // anything under a minute old
}
