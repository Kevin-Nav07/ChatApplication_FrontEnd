import React from 'react';
import { Link } from 'react-router-dom';
import styles from './styles/HomePage.module.css';
import NavBar from '../components/NavBar';

// One line of the conversation shown in the hero. heat runs from 0 (just arrived) to 3 (cooled to charcoal)
interface PreviewLine {
    side: 'theirs' | 'mine';
    who: string;
    text: string;
    time: string;
    heat: 0 | 1 | 2 | 3;
}

// A short exchange, oldest first, hung on the spine the way the real Messages screen hangs it
const PREVIEW: PreviewLine[] = [
    { side: 'theirs', who: 'theo.b', text: 'anyone still up for saturday?', time: '21:02', heat: 3 },
    { side: 'mine', who: 'You', text: "I'm in. I'll bring the kettle", time: '21:14', heat: 2 },
    { side: 'theirs', who: 'mira', text: 'save me a seat by the fire', time: '21:31', heat: 1 },
    { side: 'mine', who: 'You', text: 'already saved', time: 'now', heat: 0 },
];

// The landing page. The fire from HearthProvider burns at the foot of the hero, and the product's own
// conversation spine rises out of it, so the first thing a visitor sees is what Ember actually looks like
export default function HomePage(): React.JSX.Element {
    return (
        <div className={styles.page}>
            <NavBar />

            <main className={styles.hero}>
                {/* The words: what Ember is, for whom, and the way in */}
                <div className={styles.copy}>
                    <p className={styles.eyebrow}>Real-time messaging</p>
                    <h1 className={styles.title}>Chat for the people around your fire.</h1>
                    <p className={styles.lede}>
                        Direct messages and group rooms with your friends, delivered the moment they are sent.
                        New messages arrive hot and cool to charcoal over the hour, so you can see at a glance where a conversation is alive.
                    </p>
                    <div className={styles.actions}>
                        <Link to="/auth/signup" className={styles.plate}>Create an account</Link>
                        <Link to="/auth/login" className={styles.textLink}>I already have one</Link>
                    </div>
                </div>

                {/* The product itself: a conversation hanging on the spine, rising out of the fire.
                    It is a picture of the interface, so screen readers skip it; the words beside it say what it shows */}
                <div className={styles.scene} aria-hidden="true">
                    <span className={styles.spine} />
                    <div className={styles.thread}>
                        {PREVIEW.map((line, index) => (
                            <div
                                key={line.time}
                                className={`${styles.row} ${line.side === 'mine' ? styles.mine : styles.theirs} ${styles[`heat${line.heat}`]}`}
                                style={{ animationDelay: `${1.3 + index * 0.18}s` }} // the older lines settle in one after another
                            >
                                <div className={styles.body}>
                                    <span className={styles.who}>{line.who}</span>
                                    <span className={styles.text}>{line.text}</span>
                                </div>
                                <span className={styles.tick} />
                                <span className={styles.when}>{line.time}</span>
                                {line.heat === 0 && <span className={styles.streak} />}
                            </div>
                        ))}
                    </div>
                    {/* The fire burns in the centre of this box, drawn by the hearth canvas behind the page */}
                    <div className={styles.fireSpot} data-hearth-fire="" data-hearth-size="620" />
                </div>
            </main>

            <footer className={styles.footer}>
                <span>Direct messages</span>
                <span>Group rooms</span>
                <span>Friends around the fire</span>
            </footer>
        </div>
    );
}
