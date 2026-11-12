import React from 'react';
import { Link } from 'react-router-dom';
import styles from './styles/NotFoundPage.module.css';

// Shown for any URL that matches no route, and as the error screen if a page crashes while rendering.
// Without it React Router shows its own developer error page, which is not meant for users.
// The fire here is only kindling, burned low, because the page has gone cold. It uses no hearth hooks on purpose:
// as the crash screen it renders outside HearthProvider, and then it simply shows the words on the dark ground
export default function NotFoundPage(): React.JSX.Element {
    return (
        <main className={styles.page}>
            {/* kindling asks the hearth canvas for a low, smouldering fire in this box */}
            <div className={styles.fireSpot} data-hearth-fire="" data-hearth-size="420" data-hearth-intensity="kindling" aria-hidden="true" />
            <p className={styles.code}>404</p>
            <h1 className={styles.title}>This page has gone cold.</h1>
            <p className={styles.text}>Nothing is burning at this address.</p>
            <Link to="/" className={styles.link}>Back to the fire</Link>
        </main>
    );
}
