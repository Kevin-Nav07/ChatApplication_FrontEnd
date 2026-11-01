import React, { useState } from 'react';
import styles from './styles/DashboardPage.module.css';
import FriendsView from '../features/friends/components/FriendsView';
import HearthProvider from '../components/hearth/HearthProvider';

// Type defining the active primary navigation mode in the left rail
type NavTab = 'messages' | 'friends' | 'settings';

// Type defining the active message list filter
type MessageFilter = 'all' | 'unread';

// Main dashboard page component rendered after user authentication
// Every screen sits in one dark room lit by a fire: HearthProvider draws the fire, embers and sparks around the interface
export default function DashboardPage(): React.JSX.Element {
    // Tracks which tab is active in the left navigation rail
    const [activeTab, setActiveTab] = useState<NavTab>('messages');

    // Tracks whether the user is filtering by all conversations or unread only
    const [filter, setFilter] = useState<MessageFilter>('all');

    // Holds the text currently typed into the bottom message input dock
    const [draftMessage, setDraftMessage] = useState<string>('');

    return (
        <HearthProvider>
            <div className={styles.dashboardContainer}>
                {/* ----------------------------------------------------------------
                    1. Nav Rail (72px bar on the far left, a bottom bar on phones)
                    Houses primary navigation targets: Messages, Friends, Settings, and Profile
                   ---------------------------------------------------------------- */}
                <nav className={styles.navRail} aria-label="Primary Navigation">
                    {/* Brand flame, glowing with the fire */}
                    <div className={styles.brandIcon} title="Ember">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                    </div>

                    {/* Navigation buttons, each with its name written under the icon */}
                    <div className={styles.navGroup}>
                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'messages' ? styles.navButtonActive : ''}`}
                            aria-current={activeTab === 'messages' ? 'page' : undefined} // tells screen readers which tab is open
                            onClick={() => setActiveTab('messages')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className={styles.navLabel}>Messages</span>
                        </button>

                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'friends' ? styles.navButtonActive : ''}`}
                            aria-current={activeTab === 'friends' ? 'page' : undefined}
                            onClick={() => setActiveTab('friends')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span className={styles.navLabel}>Friends</span>
                        </button>

                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'settings' ? styles.navButtonActive : ''}`}
                            aria-current={activeTab === 'settings' ? 'page' : undefined}
                            onClick={() => setActiveTab('settings')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            <span className={styles.navLabel}>Settings</span>
                        </button>
                    </div>

                    {/* Profile avatar, pushed to the bottom of the rail */}
                    <button type="button" className={styles.avatarRing} title="Your Profile" aria-label="Your profile">
                        <span>U</span>
                    </button>
                </nav>

                {/* ----------------------------------------------------------------
                    Feature Render Switching based on activeTab
                    - 'messages': Renders conversation list and chat stage
                    - 'friends': Renders the FriendsView component, the circle around the fire
                    - 'settings': Renders settings placeholder
                   ---------------------------------------------------------------- */}
                {activeTab === 'messages' && (
                    <>
                        {/* 2. Conversation list, a charcoal panel */}
                        <aside className={styles.listPane} aria-label="Conversation List">
                            <header className={styles.listHeader}>
                                <h1 className={styles.listTitle}>Messages</h1>
                                <button
                                    type="button"
                                    className={styles.composeBtn}
                                    title="New Message"
                                    aria-label="Compose new message"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </header>

                            {/* Search field */}
                            <div className={styles.searchContainer}>
                                <div className={styles.searchInputWrapper}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Search conversations"
                                        aria-label="Search conversations"
                                    />
                                </div>
                            </div>

                            {/* Filter pills: All and Unread */}
                            <div className={styles.filterPillsRow}>
                                <button
                                    type="button"
                                    className={`${styles.filterPill} ${filter === 'all' ? styles.filterPillActive : ''}`}
                                    onClick={() => setFilter('all')}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.filterPill} ${filter === 'unread' ? styles.filterPillActive : ''}`}
                                    onClick={() => setFilter('unread')}
                                >
                                    Unread
                                </button>
                            </div>

                            {/* Living conversation thread item */}
                            <div className={styles.listBody}>
                                <div className={`${styles.chatItem} ${styles.chatItemActive}`}>
                                    {/* Flame avatar for the Ember Hearth welcome channel, a glowing coal */}
                                    <div className={styles.chatAvatar}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                        </svg>
                                    </div>

                                    {/* Contact title and message preview */}
                                    <div className={styles.chatDetails}>
                                        <div className={styles.chatTopRow}>
                                            <span className={styles.chatName}>Ember Hearth</span>
                                            <span className={styles.chatTime}>Just now</span>
                                        </div>
                                        <div className={styles.chatBottomRow}>
                                            <p className={styles.chatSnippet}>Welcome to Ember! Start typing below...</p>
                                            <span className={styles.unreadBadge} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* 3. Chat stage, open to the room so the fire shows through */}
                        <main className={styles.stagePane} aria-label="Main Canvas">
                            <header className={styles.stageHeader}>
                                <span className={styles.stageHeaderTitle}>Ember Hearth</span>
                                <span className={styles.stageHeaderMeta}>General</span>
                            </header>

                            {/* Empty state: a small hearth burns here. The hearth canvas draws the fire in this element's centre */}
                            <div className={styles.stageEmptyContent}>
                                <div
                                    className={styles.hearthSpot}
                                    data-hearth-fire=""
                                    data-hearth-size="540" // asks for a fire drawn as if the element were 540px wide, bigger than its box
                                    aria-hidden="true"
                                />

                                <h2 className={styles.emptyHeading}>The hearth is warm</h2>

                                <p className={styles.emptySubtitle}>
                                    You are connected to Ember. Select a conversation or start a new thread to begin chatting.
                                </p>

                                <button type="button" className={styles.primaryPillBtn}>
                                    Start a new thread
                                </button>
                            </div>

                            {/* Bottom message composer */}
                            <div className={styles.chatInputDock}>
                                <div className={styles.dockInputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.dockInput}
                                        placeholder="Message Ember Hearth..."
                                        aria-label="Message Ember Hearth"
                                        value={draftMessage}
                                        onChange={(e) => setDraftMessage(e.target.value)}
                                    />
                                </div>
                                <button type="button" className={styles.dockSendBtn} aria-label="Send message">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="19" x2="12" y2="5" />
                                        <polyline points="5 12 12 5 19 12" />
                                    </svg>
                                </button>
                            </div>
                        </main>
                    </>
                )}

                {/* Friends Feature: the circle around the fire */}
                {activeTab === 'friends' && (
                    <FriendsView onDirectMessage={() => setActiveTab('messages')} />
                )}

                {/* Settings Tab Placeholder */}
                {activeTab === 'settings' && (
                    <section className={styles.settingsPane} aria-labelledby="settings-title">
                        <h1 id="settings-title" className={styles.settingsTitle}>Settings</h1>
                        <p className={styles.settingsText}>Profile, notifications, and security preferences.</p>
                    </section>
                )}
            </div>
        </HearthProvider>
    );
}
