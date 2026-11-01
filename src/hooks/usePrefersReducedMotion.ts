import { useSyncExternalStore } from 'react';

// The media query browsers match when the user has asked their system for less motion
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Tells React how to listen for changes to the setting, and how to stop listening
function subscribe(onChange: () => void): () => void {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

// Reads the current value of the setting
function getSnapshot(): boolean {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// True when the user prefers reduced motion, and updates live if they change it while the app is open
// useSyncExternalStore is React's built in way to read a value that lives outside React, such as a browser setting
export function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, () => false); // the last function is the value used during server rendering
}
