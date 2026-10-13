import React, { useEffect } from 'react';
import styles from './styles/StatusCard.module.css';

export interface StatusFeedback {
    type: 'success' | 'error';
    title?: string;
    message: string;
    confirmText?: string;
}

export interface StatusCardProps extends StatusFeedback {
    onClose: () => void;
    autoDismissSeconds?: number;
}

// Centered modal dialog matching the circular outline icon and bottom confirm button design
export default function StatusCard({
    type,
    title,
    message,
    confirmText = 'Confirm',
    onClose,
    autoDismissSeconds,
}: StatusCardProps): React.JSX.Element {
    // Optional timer to dismiss the modal automatically
    useEffect(() => {
        if (!autoDismissSeconds || autoDismissSeconds <= 0) return;

        const timer = setTimeout(() => {
            onClose();
        }, autoDismissSeconds * 1000);

        return () => clearTimeout(timer);
    }, [autoDismissSeconds, onClose]);

    const isSuccess = type === 'success';
    const displayTitle = title || (isSuccess ? 'Success!' : 'Oops!');

    return (
        <div
            className={styles.modalBackdrop}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            {/* Modal card stops click propagation so clicking inside does not dismiss */}
            <div
                className={styles.modalCard}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.bodyContent}>
                    {/* Large circular outline icon */}
                    <div
                        className={`${styles.iconCircle} ${isSuccess ? styles.successIcon : styles.errorIcon
                            }`}
                    >
                        {isSuccess ? (
                            <svg
                                className={styles.iconSvg}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg
                                className={styles.iconSvg}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        )}
                    </div>

                    <h3 className={styles.title}>{displayTitle}</h3>
                    <p className={styles.message}>{message}</p>
                </div>

                {/* Bottom full-width action button */}
                <button
                    type="button"
                    className={styles.confirmButton}
                    onClick={onClose}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
}
