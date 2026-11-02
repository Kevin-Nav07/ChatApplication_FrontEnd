import React from 'react';
import styles from './styles/ProfileMenu.module.css';

// Props accepted by the ProfileMenu display component
export interface ProfileMenuProps {
    isOpen: boolean; // controls whether the popover menu is visible
    username?: string; // name of the signed in user to display in the header
    email?: string; // email address of the signed in user
    onClose: () => void; // callback triggered when clicking outside the menu card
    onLogout: () => void; // callback triggered when clicking the log out action button
}

// Presentation component rendering a floating profile card and logout option beside the nav rail
export default function ProfileMenu({
    isOpen,
    username = 'User',
    email,
    onClose,
    onLogout,
}: ProfileMenuProps): React.JSX.Element | null {
    // If the menu is toggled off, do not render anything into the DOM
    if (!isOpen) {
        return null; // hides the element completely
    }

    // Takes the first character of the username as an avatar initial
    const initial = username.charAt(0).toUpperCase() || 'U'; // defaults to U if username is empty

    return (
        <>
            {/* Transparent backdrop that catches clicks outside the menu to dismiss it */}
            <div
                className={styles.backdrop}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* The floating card containing user information and the sign-out trigger */}
            <div
                className={styles.menuCard}
                role="menu"
                aria-label="User Account Menu"
            >
                {/* User information header */}
                <div className={styles.userInfo}>
                    <div className={styles.avatarBadge}>
                        <span>{initial}</span>
                    </div>
                    <div className={styles.userMeta}>
                        <span className={styles.username}>{username}</span>
                        {email && <span className={styles.email}>{email}</span>}
                    </div>
                </div>

                {/* Subtle separator */}
                <div className={styles.divider} />

                {/* Sign-out action trigger */}
                <button
                    type="button"
                    className={styles.logoutButton}
                    role="menuitem"
                    onClick={() => {
                        onClose(); // closes menu immediately
                        onLogout(); // executes logout callback passed from parent
                    }}
                >
                    {/* Logout icon */}
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log out</span>
                </button>
            </div>
        </>
    );
}

