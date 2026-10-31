import React, { useState } from 'react';
import styles from '../styles/Friends.module.css';
import { getErrorMessage } from '../../../models/AppError';

// Props definition for the AddFriendCard component
interface AddFriendCardProps {
    // Callback invoked when the user submits a username, resolves when the request was created and rejects with the reason if not
    onSendRequest: (username: string) => Promise<void>;
}

// Feedback shown under the form after a submit, the type decides whether it is coloured as success or error
interface Feedback {
    type: 'success' | 'error';
    text: string;
}

// Component that renders the top stage card allowing users to search and add friends
export default function AddFriendCard({ onSendRequest }: AddFriendCardProps): React.JSX.Element {
    // Local state to track the username input field value
    const [targetUsername, setTargetUsername] = useState<string>('');
    // Local state for the success or error message under the form
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    // True while the request is on its way to the server, used to stop double submits
    const [isSending, setIsSending] = useState<boolean>(false);

    // Handles form submission, waits for the server before telling the user it worked
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault(); // stops the browser from reloading the page, which is the default for a form submit
        const trimmed = targetUsername.trim();
        if (!trimmed || isSending) {
            return;
        }

        setIsSending(true);
        setFeedback(null);
        try {
            await onSendRequest(trimmed);
            setFeedback({ type: 'success', text: `Friend request sent to ${trimmed}` });
            setTargetUsername(''); // only cleared on success so a typo can be fixed without retyping everything
        }
        catch (error: unknown) {
            setFeedback({ type: 'error', text: getErrorMessage(error) }); // shows the server's reason, such as an unknown username
        }
        finally {
            setIsSending(false);
        }
    };

    return (
        <div className={styles.addFriendCard}>
            <div className={styles.addFriendHeader}>
                <h3 className={styles.addFriendTitle}>Add a Friend</h3>
                <p className={styles.addFriendSubtitle}>
                    You can add friends on Ember using their unique username.
                </p>
            </div>

            {/* Input form with Apple capsule input and primary terracotta button */}
            <form className={styles.addFriendForm} onSubmit={handleSubmit}>
                <input
                    type="text"
                    className={styles.addFriendInput}
                    placeholder="Enter username (e.g. alex_rivera)"
                    value={targetUsername}
                    onChange={(e) => {
                        setTargetUsername(e.target.value);
                        setFeedback(null); // hides the old message once the user starts typing a new name
                    }}
                    maxLength={32} // matches the longest username the server allows
                />
                <button
                    type="submit"
                    className={styles.sendRequestBtn}
                    disabled={!targetUsername.trim() || isSending}
                >
                    {isSending ? 'Sending...' : 'Send Request'}
                </button>
            </form>

            {/* Inline result text, role status makes screen readers announce it */}
            {feedback && (
                <span
                    role="status"
                    className={`${styles.feedbackText} ${feedback.type === 'error' ? styles.feedbackTextError : ''}`}
                >
                    {feedback.text}
                </span>
            )}
        </div>
    );
}
