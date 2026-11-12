import React from 'react';
import styles from './SoundToggle.module.css';
import { useHearth } from './useHearth';

// Props for the fire's sound switch
interface SoundToggleProps {
    // 'rail' stacks the icon over its label like the dashboard's nav buttons; 'inline' sets them side by side for a top bar
    variant?: 'rail' | 'inline';
    className?: string; // lets the parent place it, for example pushing it to the bottom of the rail
}

// Switches the crackle of the fire on and off. aria-pressed tells screen readers whether it is on
export default function SoundToggle({ variant = 'inline', className = '' }: SoundToggleProps): React.JSX.Element {
    const { soundOn, toggleSound } = useHearth();

    return (
        <button
            type="button"
            className={`${styles.toggle} ${variant === 'rail' ? styles.rail : styles.inline} ${soundOn ? styles.on : ''} ${className}`}
            aria-pressed={soundOn}
            onClick={toggleSound}
            title={soundOn ? 'Quiet the fire' : 'Hear the fire'}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5L6 9H3v6h3l5 4V5z" />
                {soundOn ? (
                    <>
                        {/* Two arcs of sound when it is on */}
                        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                    </>
                ) : (
                    // A short stroke across when it is off
                    <path d="M16 9.5l5 5M21 9.5l-5 5" />
                )}
            </svg>
            <span className={styles.label}>Sound</span>
        </button>
    );
}
