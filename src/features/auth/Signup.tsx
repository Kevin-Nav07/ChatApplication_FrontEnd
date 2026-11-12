import React, { useState } from 'react';
import styles from './styles/Signup.module.css';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { SignupForm } from './types/SignupForm';
import Spinner from '../../components/Spinner';
import StatusCard, { type StatusFeedback } from '../../components/StatusCard';
import FieldError from '../../components/FieldError';
import { signup, checkUsernameExists } from '../../services/authService';
import { getErrorMessage } from '../../models/AppError';

// The server's rules for new accounts (Models/Schemas.js in the backend). The form uses the same numbers,
// so anything the form accepts the server accepts too, instead of failing after submitting
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes of a password
const EMAIL_MAX = 254;

// Component that renders the signup page and handles new user registration
export default function Signup(): React.JSX.Element {
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

        // signup is called directly, like in Login, because the server's reason for refusing (for example
        // "Username is already taken") is needed for the message, and useAPI only returns null on failure.
        // react-hook-form keeps isSubmitting true until this function finishes, which drives the loading state
        try {
            await signup(formData);
            setStatus({
                type: 'success',
                title: 'Success!',
                message: `Welcome, ${formData.username}! Your account has been created. You can log in now.`,
            });
            reset(); // clears the form fields
        } catch (error: unknown) {
            setStatus({
                type: 'error',
                title: 'Could not create account',
                message: getErrorMessage(error),
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
                  while submitting or while the async username check is in flight
                */}
                <fieldset disabled={isSubmitting || isCheckingUsername} className={styles.fieldset}>
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
                                    value: EMAIL_MAX,
                                    message: `Email cannot exceed ${EMAIL_MAX} characters`, // Maximum length constraint
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
                                    value: USERNAME_MIN,
                                    message: `Username must be at least ${USERNAME_MIN} characters`, // Synchronous check 2
                                },
                                maxLength: {
                                    value: USERNAME_MAX,
                                    message: `Username cannot exceed ${USERNAME_MAX} characters`, // Synchronous check 3
                                },
                                pattern: {
                                    value: /^[a-zA-Z0-9_-]+$/, // the same characters the server allows
                                    message: "Username can only contain letters, numbers, underscores and hyphens",
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
                                    value: PASSWORD_MIN,
                                    message: `Password must be at least ${PASSWORD_MIN} characters`, // Minimum length constraint
                                },
                                maxLength: {
                                    value: PASSWORD_MAX,
                                    message: `Password cannot exceed ${PASSWORD_MAX} characters`, // Maximum length constraint
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
                    disabled={isSubmitting || isCheckingUsername}
                >
                    {isSubmitting ? (
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
