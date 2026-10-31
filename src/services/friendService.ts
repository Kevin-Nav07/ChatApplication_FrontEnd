import type { AxiosResponse } from "axios";
import { api } from "./appService";
import type { Friend, FriendRequestItem, FriendshipApiRow } from "../features/friends/types/friends";

// Service function to load the logged in user's confirmed friends
// The server works out who "me" is from the access token cookie, so no user id is sent
export async function getFriends(): Promise<Friend[]> {
    const response: AxiosResponse<FriendshipApiRow[]> = await api.get("/friendship", { params: { status: "accepted" } }); // params becomes ?status=accepted
    return response.data.map((row) => ({ // renames the backend's snake_case fields to the camelCase the components use
        friendshipId: row.request_id,
        userId: row.other_user_id,
        username: row.other_username,
        createdAt: row.created_at
    }));
}

// Service function to load every pending request involving the logged in user
// One call returns both directions, each row says whether it is incoming or outgoing so the caller can split them
export async function getPendingRequests(): Promise<FriendRequestItem[]> {
    const response: AxiosResponse<FriendshipApiRow[]> = await api.get("/friendship", { params: { status: "pending" } });
    return response.data.map((row) => ({
        friendshipId: row.request_id,
        userId: row.other_user_id,
        username: row.other_username,
        createdAt: row.created_at,
        direction: row.direction
    }));
}

// Service function to send a friend request to the user with this username
// Rejects with an AppError carrying the server's reason, for example an unknown username (404) or an existing request (409)
export async function sendFriendRequest(username: string): Promise<void> {
    await api.post("/friendship", { receiver_username: username });
}

// Service function to accept an incoming request, only the receiver of the request is allowed to do this
export async function acceptFriendRequest(friendshipId: number): Promise<void> {
    await api.put("/friendship/accept", { request_id: friendshipId });
}

// Service function that deletes a friendship row
// The same call declines an incoming request, cancels an outgoing one, or removes an existing friend
export async function deleteFriendship(friendshipId: number): Promise<void> {
    await api.delete(`/friendship/${friendshipId}`);
}
