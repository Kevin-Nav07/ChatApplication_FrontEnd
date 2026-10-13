import React, { useState } from 'react';
import styles from './styles/Signup.module.css';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { SignupForm } from './types/SignupForm';
import Spinner from '../../components/Spinner';
import StatusCard, { type StatusFeedback } from '../../components/StatusCard';
import FieldError from '../../components/FieldError';
import { signup, checkUsernameExists } from '../../services/authService';
import useAPI from '../../hooks/useAPI';

// Component that renders the signup page and handles new user registration
export default function Signup(): React.JSX.Element {
    // Custom hook managing the network call and loading state for registration
    const { execute: executeSignup, isLoading } = useAPI(signup);
    // State to store feedback card data after submission (null when no notification is active)
    const [status, setStatus] = useState<StatusFeedback | null>(null);

    // React Hook Form initialization
    // register connects inputs to form state, handleSubmit wraps submit logic,
    // and formState provides errors, submission state, and active async field validations
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, validatingFields },
    } = useForm<SignupForm>({
        mode: 'onBlur',
        reValidateMode: "onBlur" // Validates on blur initially, and re-validates live as the user types once the field is touched
    });

    // Submit handler executed only after all synchronous and asynchronous validations pass
    const submitHandler = async (formData: SignupForm) => {
        // Clear any previous notification before starting a new submission
        setStatus(null);

        // Execute signup request through our useAPI custom hook
        const result = await executeSignup(formData);

        if (result) {
            // Set positive feedback state when the account is created
            setStatus({
                type: 'success',
                title: 'Success!',
                message: `Welcome, ${formData.username}! Your account has been created.`,
            });
            // Reset all form input fields back to initial empty state
            reset();
        } else {
            // Set error feedback state when the registration request fails
            setStatus({
                type: 'error',
                title: 'Oops!',
                message: 'Unable to create account. Please verify your details or try again.',
            });
        }
    };

    // Flag indicating whether the username async validator is actively running in the background
    const isCheckingUsername = Boolean(validatingFields?.username);

    return (
        <div className={styles.signupWrapper}>
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

            {/* Header Block containing title and subtitle */}
            <div className={styles.headerBlock}>
                <h1 className={styles.title}>Create account</h1>
                <p className={styles.subtitle}>Join the conversation today.</p>
            </div>

            <form className={styles.formElement} onSubmit={handleSubmit(submitHandler)}>
                {/* 
                  The native fieldset element automatically disables all nested inputs
                  when isSubmitting, isLoading, or async validation is in flight
                */}
                <fieldset disabled={isSubmitting || isLoading || isCheckingUsername} className={styles.fieldset}>
                    {/* Email Input Group */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>
                            Email
                        </label>

                        {/*  the spread operator ... basically takes the output
                             object of register and turns it into properties for the jsx. output will have form:
                             // What register("username") returns:
                                {
                                name: "username",
                                onChange: function(e) 
                                onBlur: function(e) 
                                ref: function(el) 
                                } 
                                these will be destructured as properties for the <input> element
                                so name will be "username" eliminating the need to have a name="username" property */}
                        <input
                            {...register('email', {
                                required: 'Email is required', // Required validation check
                                minLength: {
                                    value: 6,
                                    message: 'Email must be at least 6 characters', // Minimum length constraint
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Email cannot exceed 40 characters', // Maximum length constraint
                                },
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Please enter a valid email address', // Email format regex check
                                },
                            })}
                            type="email"
                            id="email"
                            className={`${styles.inputField} ${errors.email ? styles.inputFieldError : ''}`}
                            placeholder="you@example.com"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.email} />
                    </div>

                    {/* Username Input Group */}
                    <div className={styles.inputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="username" className={styles.label}>
                                Username
                            </label>
                            {/* Render status indicator while the async availability check runs in the background */}
                            {isCheckingUsername && (
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Spinner size={12} />
                                    <span>Checking availability...</span>
                                </span>
                            )}
                        </div>

                        <input
                            {...register('username', {
                                required: 'Username is required', // Synchronous check 1
                                setValueAs: (value) => value.trim(),
                                minLength: {
                                    value: 6,
                                    message: 'Username must be at least 6 characters', // Synchronous check 2
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Username cannot exceed 40 characters', // Synchronous check 3
                                },
                                pattern: {
                                    value: /^[a-zA-Z0-9_]+$/,
                                    message: "Username can only contain letters, numbers, and underscores",
                                },
                                validate: {
                                    // Asynchronous validation: only executes if all synchronous checks pass
                                    isUsernameAvailable: async (username: string) => {
                                        try {
                                            const exists = await checkUsernameExists(username); // Calls backend endpoint

                                            // If the user already exists in the backend, return error message
                                            if (exists) {
                                                return 'This username is already taken. Please choose another.';
                                            }

                                            // If user was not found (404), it is available for signup
                                            return true;
                                        } catch {
                                            // Fallback message if server is unreachable or returns 500
                                            return 'Unable to verify username availability. Please try again.';
                                        }
                                    },
                                },
                            })}
                            type="text"
                            id="username"
                            className={`${styles.inputField} ${errors.username ? styles.inputFieldError : ''}`}
                            placeholder="Choose a username"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.username} />
                    </div>

                    {/* Password Input Group */}
                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            {...register('password', {
                                required: 'Password is required', // Required password validation
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters', // Minimum length constraint
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Password cannot exceed 40 characters', // Maximum length constraint
                                },
                            })}
                            type="password"
                            id="password"
                            className={`${styles.inputField} ${errors.password ? styles.inputFieldError : ''}`}
                            placeholder="Create a password"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.password} />
                    </div>
                </fieldset>

                {/* Submit button dynamically renders the spinner when submitting and disables during validation */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || isLoading || isCheckingUsername}
                >
                    {isSubmitting || isLoading ? (
                        <span className={styles.buttonLoadingContent}>
                            <Spinner size={16} />
                            <span>Creating account...</span>
                        </span>
                    ) : (
                        'Create account'
                    )}
                </button>
            </form>

            <div className={styles.footerLink}>
                <span>Already have an account? </span>
                <Link to="/auth/login" className={styles.link}>
                    Log in
                </Link>
            </div>
        </div>
    );
}
