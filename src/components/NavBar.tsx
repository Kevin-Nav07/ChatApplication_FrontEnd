import React from 'react';

import styles from './styles/NavBar.module.css';
import { Link } from 'react-router-dom';

export default function NavBar(): React.JSX.Element {
    return (
        <>
            {/* Minimal Top Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.navBrand}>
                    <span className={styles.brandTitle}>ember</span>
                </div>

                <div className={styles.authActions}>
                    <Link to="/auth/login">
                        <button className={styles.logInBtn}>Log in</button>
                    </Link>

                    <Link to="/auth/signup">
                        <button className={styles.signUpBtn}>Sign up</button>
                    </Link>
                </div>
            </nav>
        </>
    );
}


