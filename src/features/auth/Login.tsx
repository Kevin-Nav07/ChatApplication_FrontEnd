import React from 'react';
import styles from './styles/Login.module.css';

export default function Login(): React.JSX.Element {
    return (
        <div className={styles.loginWrapper}>
            <div className={styles.headerBlock}>
                <h1 className={styles.title}>Log in</h1>
                <p className={styles.subtitle}>Welcome back to the fire.</p>
            </div>

            <form className={styles.formElement}>
                <div className={styles.inputGroup}>
                    <label htmlFor="username" className={styles.label}>Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        className={styles.inputField}
                        placeholder="Enter your username"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className={styles.inputField}
                        placeholder="Enter your password"
                    />
                </div>

                <button type="submit" className={styles.submitButton}>
                    Sign in
                </button>
            </form>

            <div className={styles.footerLink}>
                <span>Don't have an account? </span>
                <a href="#" className={styles.link}>Sign up</a>
            </div>
        </div>
    );
}

