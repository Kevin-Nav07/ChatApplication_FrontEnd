import React, { useState } from 'react';
import styles from './styles/AuthForm.module.css'; // shared with Signup
import { Form, Link, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import type { LoginForm } from './types/LoginForm';
import FieldError from '../../components/FieldError';
import Spinner from '../../components/Spinner';
import StatusCard, { type StatusFeedback } from '../../components/StatusCard';
import { login } from '../../services/authService';
import { AppError, getErrorMessage } from '../../models/AppError';

// Picks the text to show when login fails
// No status code means the request never got a response (server down, certificate not trusted, CORS blocked),
// which is a different problem from wrong credentials, so it gets its own message
function describeLoginError(error: unknown): string {
    if (error instanceof AppError && error.statusCode === undefined) {
        return 'Could not reach the server. Make sure the backend is running and its certificate is trusted in this browser.';
    }
    return getErrorMessage(error); // the server's own message, for example "Invalid username or password"
}

// Component that renders the login page and handles user sign-in
export default function Login(): React.JSX.Element {

    // State to store feedback card data after submission (null when no notification is active)
    const [status, setStatus] = useState<StatusFeedback | null>(null);

    const navigate = useNavigate();// this is from react data router, allows programatic navigaiton
    // Initialize React Hook Form for login input handling and validation
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({
        mode: 'onTouched', // Validates on blur initially, and re-validates on change after blur
    });

    // Form submit handler that runs only after all client-side field validations pass
    const onSubmit: SubmitHandler<LoginForm> = async (formData: LoginForm) => {
        // Clear any previous notification before starting a new login request
        setStatus(null);

        // login is called directly instead of through useAPI because useAPI swallows the error and returns null,
        // and we need the error itself to tell a wrong password apart from an unreachable server.
        // react-hook-form keeps isSubmitting true until this async function finishes, so it already acts as the loading state
        try {
            await login(formData); // the server stores the tokens in HttpOnly cookies, so there is nothing to save here
            // Set positive feedback state when the credentials are valid
            setStatus({
                type: 'success',
                title: 'Welcome back!',
                message: `Logged in successfully as ${formData.username}.`,
            });
            navigate("/dashboard")
        }
        catch (error: unknown) {
            // Set error feedback state when the credentials are invalid or request fails
            setStatus({
                type: 'error',
                title: 'Sign in failed',
                message: describeLoginError(error),
            });
        }
    };

    return (
        <div className={styles.loginWrapper}>
            {/* Top popup notification rendered conditionally when status is active */}
            {status && (
                <StatusCard
                    type={status.type}
                    title={status.title}
                    message={status.message}
                    onClose={() => setStatus(null)}
                    autoDismissSeconds={5}
                />
            )}

            <div className={styles.headerBlock}>
                <h1 className={styles.title}>Log in</h1>
                <p className={styles.subtitle}>Welcome back to the fire.</p>
            </div>

            <Form className={styles.formElement} onSubmit={handleSubmit(onSubmit)} action="/dashboard">
                {/* 
                  The native fieldset element automatically disables all nested inputs
                  when isSubmitting is true, preventing user edits during network requests
                */}
                <fieldset disabled={isSubmitting} className={styles.fieldset}>
                    {/* Username Input Group */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            {...register("username", {
                                required: "Username is required", // Required field validation
                                // Same limits as signup and the server (3 to 32), so every existing account can log in
                                minLength: { value: 3, message: "Must be at least 3 characters" },
                                maxLength: { value: 32, message: "Cannot exceed 32 characters" },
                            })}
                            className={`${styles.inputField} ${errors.username ? styles.inputFieldError : ''}`}
                            placeholder="Enter your username"
                        />
                        {/* Reusable component to display field validation errors */}
                        <FieldError error={errors.username} />
                    </div>

                    {/* Password Input Group */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            {...register("password", {
                                required: "Password is required", // Required password validation
                            })}
                            className={`${styles.inputField} ${errors.password ? styles.inputFieldError : ''}`}
                            placeholder="Enter your password"
                        />
                        {/* Reusable component to display field validation errors */}
                        <FieldError error={errors.password} />
                    </div>
                </fieldset>

                {/* Submit button dynamically renders a spinner while loading */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <span className={styles.buttonLoadingContent}>
                            <Spinner size={16} />
                            <span>Signing in...</span>
                        </span>
                    ) : (
                        'Sign in'
                    )}
                </button>
            </Form>

            <div className={styles.footerLink}>
                <span>Don't have an account? </span>
                <Link to="/auth/signup" className={styles.link}>
                    Sign up
                </Link>
            </div>
        </div>
    );
}
