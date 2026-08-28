import React from 'react';
import styles from './styles/Signup.module.css';

export default function Signup(): React.JSX.Element {
    return (
        <div className={styles.signupWrapper}>
            <div className={styles.headerBlock}>
                <h1 className={styles.title}>Create account</h1>
                <p className={styles.subtitle}>Join the conversation today.</p>
            </div>

            <form className={styles.formElement}>
                <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={styles.inputField}
                        placeholder="you@example.com"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="username" className={styles.label}>Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        className={styles.inputField}
                        placeholder="Choose a username"
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label htmlFor="password" className={styles.label}>Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        className={styles.inputField}
                        placeholder="Create a password"
                    />
                </div>

                <button type="submit" className={styles.submitButton}>
                    Create account
                </button>
            </form>

            <div className={styles.footerLink}>
                <span>Already have an account? </span>
                <a href="#" className={styles.link}>Log in</a>
            </div>
        </div>
    );
}

