import React, { memo, useEffect, useState } from 'react';
import styles from './styles/MessageItem.module.css';
import type { ChatMessage } from '../../../models/ChatMessage';
import { useHearth } from '../../../components/hearth/useHearth';
import { coolingStyle, isFresh } from '../utils/heat';

// Props accepted by one line of a message group
export interface MessageItemProps {
    message: ChatMessage; // the message data object to render
    isMe: boolean; // which side of the spine the line hangs on, decides where the arrival streak runs
}

// One message as a line of text. Its colour cools from ember to charcoal over an hour, driven by CSS alone.
// A message that just arrived plays its moment: a streak of heat runs up the spine from the fire,
// then the words kindle in. When it is someone else's, the fire flares as if it was fed
function MessageItemComponent({ message, isMe }: MessageItemProps): React.JSX.Element {
    const hearth = useHearth();
    // Decided once, when the line first appears, so a later re-render never replays the moment
    const [fresh] = useState<boolean>(() => isFresh(message.created_at));

    // An arriving message from someone else feeds the fire
    useEffect(() => {
        if (fresh && !isMe) {
            hearth.flare();
        }
    }, [fresh, isMe, hearth]);

    return (
        <p className={`${styles.line} ${isMe ? styles.lineMe : styles.lineThem} ${fresh ? styles.fresh : ''}`}>
            {fresh && <span className={styles.streak} aria-hidden="true" />}
            <span className={styles.text} style={coolingStyle(message.created_at)}>
                {message.content}
            </span>
        </p>
    );
}

// Memoized export to prevent re-rendering historical lines when a new message is appended to the list
export default memo(MessageItemComponent);
