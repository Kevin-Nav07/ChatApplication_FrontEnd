import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './styles/AuthPage.module.css';

// The layout around the login and signup forms. The shared fire glides over from the landing page and burns
// in the left pane; the form for the current route renders in the right pane through <Outlet />
export default function AuthPage(): React.JSX.Element {
    return (
        <div className={styles.authLayout}>
            <div className={styles.visualPane}>
                <Link to="/" className={styles.brand}>ember</Link>

                {/* The fire burns in the centre of this box, drawn by the hearth canvas behind the page */}
                <div className={styles.fireSpot} data-hearth-fire="" data-hearth-size="560" aria-hidden="true" />

                <div className={styles.visualContent}>
                    <p className={styles.brandTitle}>Keep the fire alive.</p>
                    <p className={styles.brandTagline}>Real-time messaging with your friends</p>
                </div>
            </div>

            <div className={styles.formPane}>
                <div className={styles.formContainer}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
