import React, { useEffect, useState } from 'react';
import ConversationList from './ConversationList';
import ChatStage from './ChatStage';
import type { Room } from '../../../models/Room';
import { getRooms } from '../../../services/roomService';
import { AppError } from '../../../models/AppError';

// Type defining the active message list filter
export type MessageFilter = 'all' | 'unread';

// Main coordinator component for the messages feature tab
// This parent component manages the shared state between ConversationList and ChatStage
export default function MessagesView(): React.JSX.Element {
    // --------------------------------------------------------------------------
    // Step 1: Shared Feature State
    // --------------------------------------------------------------------------
    const [rooms, setRooms] = useState<Room[]>([]); // holds the list of conversations loaded from the backend
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null); // holds the active conversation viewed in both the sidebar and chat stage
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // stores any error returned from API or socket operations





    // --------------------------------------------------------------------------
    // Step 2: Load rooms from the backend on mount
    // --------------------------------------------------------------------------
    useEffect(() => {
        // Asynchronous function defined inside the effect because React effects cannot be async
        const fetchRooms = async () => {
            try {
                const fetchedRooms: Room[] = await getRooms(); // calls backend GET /rooms endpoint
                setRooms(fetchedRooms); // stores room records in state

                // Automatically selects the first room when rooms exist
                if (fetchedRooms.length >= 1) {
                    setSelectedRoom(fetchedRooms[0]);
                }
            } catch (error: unknown) {
                // Extracts normalized error message from backend AppError
                if (error instanceof AppError) {
                    setErrorMessage(error.message);
                } else {
                    setErrorMessage("An unexpected error occurred while loading rooms.");
                }
            }
        };

        fetchRooms(); // executes fetch operation on initial mount
    }, []); // empty dependency array ensures this effect only executes once on mount


    // --------------------------------------------------------------------------
    // Step 3: Event Handlers
    // --------------------------------------------------------------------------
    // Handles message submission originating from the ChatStage composer
    const handleSendMessage = (text: string) => {
        if (!selectedRoom) return;

        // Dispatches the message content for the active room (connected to WebSocket in Phase 2)
        console.log(`Sending message to room ${selectedRoom.id}: ${text}`);
    };

    return (
        <>
            {/* Displays a warning banner if room loading encounters a server error */}
            {errorMessage && (
                <div role="alert" style={{ color: 'var(--accent)', padding: '8px 16px', fontSize: '13px' }}>
                    {errorMessage}
                </div>
            )}

            {/* Left conversation sidebar */}
            <ConversationList
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onRoomCreated={(newRoom) => {
                    setRooms((prev) => [newRoom, ...prev]); // prepend to room list
                    setSelectedRoom(newRoom); // switch active stage to new room
                }}
            />

            {/* Right chat canvas and composer */}
            <ChatStage
                selectedRoom={selectedRoom}
                onSendMessage={handleSendMessage}
            />
        </>
    );
}
