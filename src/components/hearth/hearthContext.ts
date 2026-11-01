import { createContext } from 'react';

// What the hearth layer lets any dashboard component do with the fire and its sparks
export interface HearthApi {
    // True when the user's system asks for reduced motion; components then skip travel and particles
    reducedMotion: boolean;
    // Throws a small fan of sparks upward from a point on the screen, used when an action succeeds
    burst: (x: number, y: number, count?: number, power?: number) => void;
    // Sends embers from the fire in an arc to a point, used when someone joins the circle
    emberArc: (toX: number, toY: number, count?: number) => void;
    // One frame of sparks rising and ash falling from an element that is burning away
    scorch: (rect: DOMRect) => void;
}

// Holds the API for every component below a HearthProvider; null means no provider is mounted
export const HearthContext = createContext<HearthApi | null>(null);
