// Type representing the friendship status stored in the database
// Corresponds directly to the friendship_status enum in PostgreSQL
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// Model representing a confirmed friend from the friendships and users tables
export interface Friend {
    // Unique identifier for the friendship record
    friendshipId: number;
    // Database identifier of the friend user record
    userId: number;
    // The friend user name
    username: string;
    // ISO timestamp of when the friend request was originally sent
    createdAt?: string;
}

// Model representing a pending friend request (incoming or outgoing)
export interface FriendRequestItem {
    // Unique identifier for the friendship record in the database
    friendshipId: number;
    // Database identifier of the other user in this friendship
    userId: number;
    // User name of the other user
    username: string;
    // ISO timestamp of when the request was initiated
    createdAt: string;
    // Indicates if the current user received this request or sent it
    direction: 'incoming' | 'outgoing';
}

// One row exactly as GET /friendship returns it, in the snake_case naming the backend uses
// The friend service converts these rows into the camelCase models above so components never see this shape
export interface FriendshipApiRow {
    request_id: number;
    status: FriendshipStatus;
    created_at: string;
    other_user_id: number;
    other_username: string;
    direction: 'incoming' | 'outgoing';
}
