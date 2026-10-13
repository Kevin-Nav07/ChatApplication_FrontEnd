import React, { useState } from 'react';
import styles from './styles/Login.module.css';
import { Form, Link, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import type { LoginForm } from './types/LoginForm';
import FieldError from '../../components/FieldError';
import Spinner from '../../components/Spinner';
import StatusCard, { type StatusFeedback } from '../../components/StatusCard';
import { login } from '../../services/authService';
import useAPI from '../../hooks/useAPI';

// Component that renders the login page and handles user sign-in
export default function Login(): React.JSX.Element {
    // Custom hook managing the network call, loading state, and error handling for login
    const { execute: executeLogin, isLoading } = useAPI(login);

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

        // Execute login request through useAPI custom hook
        const result = await executeLogin(formData);

        if (result) {
            // Set positive feedback state when the credentials are valid
            setStatus({
                type: 'success',
                title: 'Welcome back!',
                message: `Logged in successfully as ${formData.username}.`,
            });
            navigate("/dashboard")
            // Token storage and navigation will be implemented here
        } else {
            // Set error feedback state when the credentials are invalid or request fails
            setStatus({
                type: 'error',
                title: 'Sign in failed',
                message: 'Invalid username or password. Please try again.',
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
                  when isSubmitting or isLoading is true, preventing user edits during network requests
                */}
                <fieldset disabled={isSubmitting || isLoading} className={styles.fieldset}>
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
                                minLength: { value: 4, message: "Must be at least 4 characters" }, // Minimum length check
                                maxLength: { value: 20, message: "Cannot exceed 20 characters" }, // Maximum length check
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
                    disabled={isSubmitting || isLoading}
                >
                    {isSubmitting || isLoading ? (
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
