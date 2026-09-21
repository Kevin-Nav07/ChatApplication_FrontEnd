import React from 'react';
import type { FieldError as RHFFieldError } from 'react-hook-form';
import styles from './styles/FieldError.module.css';

export interface FieldErrorProps {
    // Optional error object provided by React Hook Form (formState.errors.fieldName)
    error?: RHFFieldError;
    // Optional custom CSS class if caller wants to override styling
    className?: string;
}

// Reusable micro-component for rendering field-level validation errors cleanly
export default function FieldError({ error, className = '' }: FieldErrorProps): React.JSX.Element | null {
    // If there is no error or the error message is empty, render nothing (null)
    if (!error?.message) {
        return null;
    }

    // Render the error message inside a styled span
    return (
        <span className={`${styles.errorMessage} ${className}`} role="alert">
            {error.message}
        </span>
    );
}

