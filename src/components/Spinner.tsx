import React from 'react';
import styles from './styles/Spinner.module.css'

export interface SpinnerProps {
    size?: number;
    className?: string;
}

// Minimalist circular SVG spinner component
export default function Spinner({ size = 16, className = '' }: SpinnerProps): React.JSX.Element {
    return (
        <svg
            className={`${styles.spinnerSvg} ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background track */}
            <circle
                className={styles.spinnerTrack}
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
            />
            {/* Rotating head segment */}
            <path
                className={styles.spinnerHead}
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}

