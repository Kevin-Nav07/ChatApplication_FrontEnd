import React, { useRef, useState } from 'react';
import styles from '../styles/Friends.module.css';
import { getErrorMessage } from '../../../models/AppError';
import { useHearth } from '../../../components/hearth/useHearth';

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

// Component that renders the add friend form in the friends header
export default function AddFriendCard({ onSendRequest }: AddFriendCardProps): React.JSX.Element {
    // Local state to track the username input field value
    const [targetUsername, setTargetUsername] = useState<string>('');
    // Local state for the success or error message under the form
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    // True while the request is on its way to the server, used to stop double submits
    const [isSending, setIsSending] = useState<boolean>(false);
    // The button element, so sparks can fly from it when the request goes through
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hearth = useHearth();

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
            setFeedback({ type: 'success', text: `Request sent to ${trimmed}` });
            setTargetUsername(''); // only cleared on success so a typo can be fixed without retyping everything
            const rect = buttonRef.current?.getBoundingClientRect();
            if (rect) {
                hearth.burst(rect.left + rect.width / 2, rect.top, 12, 0.8); // a few sparks off the button as the request leaves
            }
        }
        catch (error: unknown) {
            setFeedback({ type: 'error', text: getErrorMessage(error) }); // shows the server's reason, such as an unknown username
        }
        finally {
            setIsSending(false);
        }
    };

    return (
        <form className={styles.addForm} onSubmit={handleSubmit}>
            {/* htmlFor ties the label to the input, so clicking it focuses the field and screen readers announce it */}
            <label htmlFor="add-friend-username" className={styles.addLabel}>
                Add a friend
            </label>
            <div className={styles.addRow}>
                <div className={styles.field}>
                    <input
                        id="add-friend-username"
                        type="text"
                        placeholder="their username"
                        autoComplete="off"
                        spellCheck={false}
                        value={targetUsername}
                        onChange={(e) => {
                            setTargetUsername(e.target.value);
                            setFeedback(null); // hides the old message once the user starts typing a new name
                        }}
                        maxLength={32} // matches the longest username the server allows
                    />
                </div>
                <button
                    ref={buttonRef}
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={!targetUsername.trim() || isSending}
                >
                    {isSending ? 'Sending...' : 'Send request'}
                </button>
            </div>

            {/* Result text, role status makes screen readers announce it. The line is always there so the layout does not jump */}
            <p
                role="status"
                className={`${styles.feedbackText} ${feedback?.type === 'error' ? styles.feedbackError : ''} ${feedback?.type === 'success' ? styles.feedbackSuccess : ''}`}
            >
                {feedback?.text ?? ''}
            </p>
        </form>
    );
}
