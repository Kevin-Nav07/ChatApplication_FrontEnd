import React from 'react';
import { Link } from 'react-router-dom';
import styles from './styles/NavBar.module.css';
import SoundToggle from './hearth/SoundToggle';

// The top bar on the public pages: the wordmark, the fire's sound, and the two ways in.
// The links are styled directly instead of wrapping buttons, because a button inside a link is invalid HTML
export default function NavBar(): React.JSX.Element {
    return (
        <nav className={styles.navbar} aria-label="Main">
            <Link to="/" className={styles.brand}>ember</Link>

            <div className={styles.actions}>
                <SoundToggle variant="inline" />
                <Link to="/auth/login" className={styles.textLink}>Log in</Link>
                <Link to="/auth/signup" className={styles.plate}>Create an account</Link>
            </div>
        </nav>
    );
}
