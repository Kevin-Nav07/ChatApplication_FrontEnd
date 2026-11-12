import React, { useState } from 'react';
import styles from './styles/DashboardPage.module.css';
import FriendsView from '../features/friends/components/FriendsView';
import MessagesView from '../features/messages/components/MessagesView';
import HearthProvider from '../components/hearth/HearthProvider';
import { WebSocketProvider } from '../features/messages/context/WebSocketProvider';
import { useUserContext } from '../hooks/useUserContext';
import ProfileMenu from '../features/auth/components/ProfileMenu';

// Type defining the active primary navigation mode in the left rail
type NavTab = 'messages' | 'friends' | 'settings';

// Main dashboard page component rendered after user authentication
// Every screen sits in one dark room lit by a fire: HearthProvider draws the fire, embers and sparks around the interface
export default function DashboardPage(): React.JSX.Element {
    // Tracks which tab is active in the left navigation rail
    const [activeTab, setActiveTab] = useState<NavTab>('messages');
    const [isProfileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
    const { user, logoutFn, isAuthenticated } = useUserContext();

    return (
        <WebSocketProvider>
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
                        <button type="button" className={styles.avatarRing} title="Your Profile" aria-label="Your profile"
                            onClick={() => setProfileMenuOpen(true)}>
                            <span>{isAuthenticated ? user?.username.trim().charAt(0).toUpperCase() : 'U'}</span>
                        </button>
                        <ProfileMenu isOpen={isProfileMenuOpen}
                            username={user?.username}
                            email={user?.email}
                            onClose={() => setProfileMenuOpen(false)}
                            onLogout={() => logoutFn()}>
                        </ProfileMenu>
                    </nav>

                    {/* ----------------------------------------------------------------
                    Feature Render Switching based on activeTab
                    - 'messages': Renders conversation list and chat stage
                    - 'friends': Renders the FriendsView component, the circle around the fire
                    - 'settings': Renders settings placeholder
                   ---------------------------------------------------------------- */}
                    {activeTab === 'messages' && (
                        <MessagesView />
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
        </WebSocketProvider>
    );
}
