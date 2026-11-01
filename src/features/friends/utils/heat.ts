import type { CSSProperties } from 'react';

// A style object that may also set CSS custom properties such as '--heat'
// React's CSSProperties type does not know about custom properties, so this widens it to allow any '--name'
export type CSSVars = CSSProperties & Record<`--${string}`, string>;

type Rgb = [number, number, number];

// A colour temperature and how strongly it glows, from 0 (cold) to 1
export interface Heat {
    rgb: Rgb;
    glow: number;
}

// A waiting request starts hot and cools to ash if nobody answers it
const REQUEST_STOPS: [number, Rgb][] = [[0, [255, 176, 114]], [0.35, [229, 117, 61]], [0.7, [150, 88, 58]], [1, [111, 103, 95]]];
// A friendship starts as a bright spark and settles into a deep, steady coal. It never turns to ash
const FRIEND_STOPS: [number, Rgb][] = [[0, [255, 200, 120]], [0.4, [236, 124, 58]], [1, [196, 70, 38]]];
const TEXT_RGB: Rgb = [238, 234, 229];
const HOUR_MS = 60 * 60 * 1000;

// Hours since an ISO timestamp, 0 when the timestamp is missing or unreadable
function hoursSince(isoDate?: string): number {
    const time = isoDate ? new Date(isoDate).getTime() : Number.NaN;
    return Number.isNaN(time) ? 0 : Math.max(0, (Date.now() - time) / HOUR_MS);
}

// Position 0 to 1 on a log scale, so the first day changes the colour far more than the difference between week three and week four
function logProgress(hours: number, fullAtHours: number): number {
    return Math.min(1, Math.log1p(hours) / Math.log1p(fullAtHours));
}

// Blends between the colour stops on either side of the position t
function along(stops: [number, Rgb][], t: number): Rgb {
    for (let i = 1; i < stops.length; i++) {
        const [t1, c1] = stops[i];
        const [t0, c0] = stops[i - 1];
        if (t <= t1) {
            const k = (t - t0) / (t1 - t0);
            return c0.map((value, j) => Math.round(value + (c1[j] - value) * k)) as Rgb;
        }
    }
    return stops[stops.length - 1][1];
}

// How hot a waiting request still is: fully cold after two weeks
export function requestHeat(createdAt?: string): Heat {
    const t = logProgress(hoursSince(createdAt), 24 * 14);
    return { rgb: along(REQUEST_STOPS, t), glow: 1 - t };
}

// The warmth of a friendship: a new spark at first, a deep coal after about six months. Old friends still glow, only steadier
export function friendWarmth(createdAt?: string): Heat {
    const t = createdAt ? logProgress(hoursSince(createdAt), 24 * 180) : 0.5; // unknown age sits in the middle
    return { rgb: along(FRIEND_STOPS, t), glow: 0.95 - 0.35 * t };
}

// Which ring of the circle a friend sits on: 0 is the inner ring (friends for a month or more), 2 the outer ring (this week)
export function friendRing(createdAt?: string): number {
    if (!createdAt) {
        return 1;
    }
    const days = hoursSince(createdAt) / 24;
    return days >= 30 ? 0 : days >= 7 ? 1 : 2;
}

// The custom properties a coal reads: its colour, the rim around it and the glow it gives off
export function coalStyle(heat: Heat): CSSVars {
    const rgb = heat.rgb.join(',');
    return {
        '--heat': `rgb(${rgb})`,
        '--rim': `rgba(${rgb},0.8)`,
        '--halo': `rgba(${rgb},${(0.62 * heat.glow).toFixed(2)})`
    };
}

// The same hue lifted toward the text colour, so a caption in it still reads at 4.5:1 contrast on charcoal
export function heatTextColor(heat: Heat): string {
    return `rgb(${heat.rgb.map((value, i) => Math.round(value * 0.68 + TEXT_RGB[i] * 0.32)).join(',')})`;
}
