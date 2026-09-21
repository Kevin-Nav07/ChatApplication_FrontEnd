import React, { useState } from 'react';
import styles from './styles/Signup.module.css';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { SignupForm } from './types/SignupForm';
import Spinner from './components/Spinner';
import StatusCard, { type StatusFeedback } from './components/StatusCard';
import FieldError from '../../components/FieldError';
import { signup } from '../../services/authService';
import useAPI from '../../hooks/useAPI';

export default function Signup(): React.JSX.Element {
    //continue implementing form

    // State to store feedback card data after submission (null when no notification is active)
    const { execute: executeSignup, isLoading } = useAPI(signup);
    const [status, setStatus] = useState<StatusFeedback | null>(null);

    //use form returns a register function which helps us register inputs into the form handler
    //also returns a handleSubmit function which  takes in another function, and then a formState object for the current state of the form
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SignupForm>({
        mode: 'onTouched', // Validates on blur initially, and re-validates live as the user types once the field is touched/dirtied
    }); //using react hookj form that spits out uitility methods

    //submit handler function
    const submitHandler = async (formData: SignupForm) => {
        // Clear any previous notification before starting a new submission
        setStatus(null);

        const result = await executeSignup(formData);

        if (result) {
            // Set positive feedback state
            setStatus({
                type: 'success',
                title: 'Success!',
                message: `Welcome, ${formData.username}! Your account has been created.`,
            });
            // Reset all form input fields back to initial empty state
            reset();
        } else {
            // Set error feedback state
            setStatus({
                type: 'error',
                title: 'Oops!',
                message: 'Unable to create account. Please verify your details or try again.',
            });
        }
    };

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
                  when isSubmitting is true, preventing user edits during network requests
                */}
                <fieldset disabled={isSubmitting || isLoading} className={styles.fieldset}>
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
                                required: 'Email is required',
                                minLength: {
                                    value: 6,
                                    message: 'Email must be at least 6 characters',
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Email cannot exceed 40 characters',
                                },
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Please enter a valid email address',
                                },
                            })}
                            type="email"
                            id="email"
                            className={`${styles.inputField} ${errors.email ? styles.inputFieldError : ''
                                }`}
                            placeholder="you@example.com"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.email} />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="username" className={styles.label}>
                            Username
                        </label>
                        <input
                            {...register('username', {
                                required: 'Username is required',
                                minLength: {
                                    value: 6,
                                    message: 'Username must be at least 6 characters',
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Username cannot exceed 40 characters',
                                },
                            })}
                            type="text"
                            id="username"
                            className={`${styles.inputField} ${errors.username ? styles.inputFieldError : ''
                                }`}
                            placeholder="Choose a username"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.username} />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>
                            Password
                        </label>
                        <input
                            {...register('password', {
                                required: 'Password is required',
                                minLength: {
                                    value: 6,
                                    message: 'Password must be at least 6 characters',
                                },
                                maxLength: {
                                    value: 40,
                                    message: 'Password cannot exceed 40 characters',
                                },
                            })}
                            type="password"
                            id="password"
                            className={`${styles.inputField} ${errors.password ? styles.inputFieldError : ''
                                }`}
                            placeholder="Create a password"
                        />
                        {/* Reusable FieldError handles conditional rendering and message display */}
                        <FieldError error={errors.password} />
                    </div>
                </fieldset>

                {/* Submit button dynamically renders the spinner when isSubmitting is true */}
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || isLoading}
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
