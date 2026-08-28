import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './styles/AuthPage.module.css';


export default function AuthPage(): React.JSX.Element {
    return (
        <div className={styles.authLayout}>
            {/* Left Side: Minimalist atmospheric visual */}
            <div className={styles.visualPane}>
                <div className={styles.visualContent}>
                    <div className={styles.watermark}>e.</div>
                    <h2 className={styles.brandTitle}>Keep the fire alive.</h2>
                    <p className={styles.brandTagline}>A warm space for real-time conversations.</p>
                </div>
            </div>

            {/* Right Side: The interactive form area */}
            <div className={styles.formPane}>
                <div className={styles.formContainer}>
                    {/* The form components will render directly here */}
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
