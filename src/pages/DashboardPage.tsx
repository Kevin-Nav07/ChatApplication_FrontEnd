import React, { useState } from 'react';
import styles from './styles/DashboardPage.module.css';

// Type defining the active primary navigation mode in the left rail
type NavTab = 'messages' | 'friends' | 'settings';

// Type defining the active message list filter
type MessageFilter = 'all' | 'unread';

// Main dashboard page component rendered after user authentication
// Structured as a native macOS Messages three-column split view
export default function DashboardPage(): React.JSX.Element {
    // Tracks which icon is active in the slim left navigation rail
    const [activeTab, setActiveTab] = useState<NavTab>('messages');

    // Tracks whether the user is filtering by all conversations or unread only
    const [filter, setFilter] = useState<MessageFilter>('all');

    // Holds the text currently typed into the bottom message input dock
    const [draftMessage, setDraftMessage] = useState<string>('');

    return (
        <div className={styles.dashboardContainer}>
            {/* ----------------------------------------------------------------
                1. Nav Rail (Slim 64px icon bar on the far left)
                Houses primary navigation targets: Messages, Friends, Settings, and Profile
               ---------------------------------------------------------------- */}
            <nav className={styles.navRail} aria-label="Primary Navigation">
                <div className={styles.railTopSection}>
                    {/* Brand Flame Icon */}
                    <div className={styles.brandIcon} title="Ember">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                    </div>

                    {/* Navigation Buttons Group */}
                    <div className={styles.navGroup}>
                        {/* Messages Tab Button */}
                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'messages' ? styles.navButtonActive : ''}`}
                            onClick={() => setActiveTab('messages')}
                            title="Messages"
                            aria-label="Messages"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </button>

                        {/* Friends Tab Button */}
                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'friends' ? styles.navButtonActive : ''}`}
                            onClick={() => setActiveTab('friends')}
                            title="Friends and Requests"
                            aria-label="Friends and Requests"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                        </button>

                        {/* Settings Tab Button */}
                        <button
                            type="button"
                            className={`${styles.navButton} ${activeTab === 'settings' ? styles.navButtonActive : ''}`}
                            onClick={() => setActiveTab('settings')}
                            title="Settings"
                            aria-label="Settings"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Rail Bottom Section: Profile Avatar with online indicator */}
                <div className={styles.railBottomSection}>
                    <div className={styles.avatarContainer}>
                        <button
                            type="button"
                            className={styles.avatarRing}
                            title="Your Profile"
                            aria-label="Profile Avatar"
                        >
                            <span>U</span>
                        </button>
                        {/* Green indicator indicating user is online */}
                        <span className={styles.onlineIndicator} />
                    </div>
                </div>
            </nav>

            {/* ----------------------------------------------------------------
                2. List Pane (Middle Column, 320px Native Conversation List)
                Houses iMessage-style conversation list, search capsule, and filters
               ---------------------------------------------------------------- */}
            <aside className={styles.listPane} aria-label="Conversation and Category List">
                <header className={styles.listHeader}>
                    <h2 className={styles.listTitle}>
                        {activeTab === 'messages' && 'Messages'}
                        {activeTab === 'friends' && 'Friends'}
                        {activeTab === 'settings' && 'Settings'}
                    </h2>
                    {activeTab !== 'settings' && (
                        <button
                            type="button"
                            className={styles.composeBtn}
                            title={activeTab === 'messages' ? 'New Message' : 'Add Friend'}
                            aria-label={activeTab === 'messages' ? 'Compose new message' : 'Add new friend'}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    )}
                </header>

                {/* Apple capsule search bar */}
                {activeTab !== 'settings' && (
                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputWrapper}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={activeTab === 'messages' ? 'Search conversations' : 'Search friends'}
                            />
                        </div>
                    </div>
                )}

                {/* Filter pills: All and Unread */}
                {activeTab === 'messages' && (
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
                )}

                {/* Living conversation thread item */}
                <div className={styles.listBody}>
                    {activeTab === 'messages' && (
                        <div className={`${styles.chatItem} ${styles.chatItemActive}`}>
                            {/* Flame avatar for Ember Hearth welcome channel */}
                            <div className={styles.chatAvatar}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                    )}

                    {activeTab === 'friends' && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8e8e93', fontSize: '0.85rem' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1d1d1f' }}>No friend requests</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem' }}>Incoming friend requests will show here.</p>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8e8e93', fontSize: '0.85rem' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: '#1d1d1f' }}>Settings</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem' }}>Profile, notifications, and security preferences.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* ----------------------------------------------------------------
                3. Detail / Chat Stage (Integrated window, NO floating cards)
               ---------------------------------------------------------------- */}
            <main className={styles.stagePane} aria-label="Main Canvas">
                {/* Integrated top header bar */}
                <header className={styles.stageHeader}>
                    <span className={styles.stageHeaderTitle}>Ember Hearth</span>
                    <span className={styles.stageHeaderMeta}>Online</span>
                </header>

                {/* Center empty state content */}
                <div className={styles.stageEmptyContent}>
                    <div className={styles.emptyBadge}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                        </svg>
                    </div>

                    <h1 className={styles.emptyHeading}>The hearth is warm</h1>

                    <p className={styles.emptySubtitle}>
                        You are connected to Ember. Select a conversation or start a new thread to begin chatting.
                    </p>

                    <button type="button" className={styles.primaryPillBtn}>
                        Start New Thread
                    </button>
                </div>

                {/* Bottom Apple message input dock */}
                <div className={styles.chatInputDock}>
                    <div className={styles.dockInputWrapper}>
                        <input
                            type="text"
                            className={styles.dockInput}
                            placeholder="Message Ember Hearth..."
                            value={draftMessage}
                            onChange={(e) => setDraftMessage(e.target.value)}
                        />
                    </div>
                    <button type="button" className={styles.dockSendBtn} aria-label="Send message">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                    </button>
                </div>
            </main>
        </div>
    );
}
