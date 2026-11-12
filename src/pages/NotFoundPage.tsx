import React from 'react';
import { Link } from 'react-router-dom';

// Shown for any URL that matches no route, and as the error screen if a page crashes while rendering.
// Without it React Router shows its own developer error page, which is not meant for users
export default function NotFoundPage(): React.JSX.Element {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: 'var(--color-background-deep)',
                color: 'var(--color-text-main)',
                fontFamily: 'var(--font-body)',
                textAlign: 'center',
                padding: '16px',
            }}
        >
            <h1 style={{ margin: 0 }}>This page has gone cold</h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>The page you were looking for does not exist.</p>
            <Link to="/" style={{ color: 'var(--color-primary)' }}>Back to the fire</Link>
        </main>
    );
}
