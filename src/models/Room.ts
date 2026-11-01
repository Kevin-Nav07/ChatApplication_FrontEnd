// Defines the shape of a conversation room returned by the backend
export interface Room {
    id: number; // primary key identifier for the room in postgres
    name: string; // display name for the group or direct chat
    room_type: 'direct' | 'group'; // determines if the room is a 1 on 1 direct message or multi user group
    created_at: string; // ISO timestamp string of when the room was created
}

