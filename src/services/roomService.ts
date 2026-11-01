import type { AxiosResponse } from 'axios';
import { api } from './appService';
import type { Room } from '../models/Room';

// Service function to retrieve all rooms the authenticated user is a member of
// The server determines the user identity from the http only jwt cookie, so no user id needs to be passed
export async function getRooms(): Promise<Room[]> {
    const response: AxiosResponse<Room[]> = await api.get('/rooms'); // issues a GET request to the /rooms endpoint
    return response.data; // returns the array of room records
}

// Payload contract for creating a new room
export interface CreateRoomPayload {
    name: string; // name of the room
    room_type: 'direct' | 'group'; // indicates whether this is a direct conversation or a group conversation
    users: number[]; // array of member user ids to add to the room
}

// Service function to create a new room and add its initial members
export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
    const response: AxiosResponse<Room> = await api.post('/rooms', payload); // issues a POST request with the room details
    return response.data; // returns the newly created room record
}

