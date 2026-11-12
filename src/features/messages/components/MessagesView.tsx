import React, { useEffect, useRef, useState } from 'react';
import ConversationList from './ConversationList';
import ChatStage from './ChatStage';
import ChatToast from './ChatToast';
import type { Room } from '../../../models/Room';
import { getRoomMessages, getRooms, type RoomMessagesResponse } from '../../../services/roomService';
import { AppError } from '../../../models/AppError';
import useWebsocketContext from '../../../hooks/useWebsocketContext';
import { useUserContext } from '../../../hooks/useUserContext';
import type { ChatMessage } from '../../../models/ChatMessage';

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
    const { status,
        isConnected,
        subscribeToMessages,
        sendMessage } = useWebsocketContext(); // accesses websocket connection status and transmission methods
    const { isAuthenticated, user } = useUserContext();
    const [messagesByRoom, setMessagesByRoom] = useState<Map<number, ChatMessage[]>>(() => new Map());

    // Tracks which conversation room IDs currently have unread incoming messages
    const [unreadRoomIds, setUnreadRoomIds] = useState<Set<number>>(() => new Set());

    // Holds payload for the active floating notification toast banner
    const [toastNotification, setToastNotification] = useState<{
        roomId: number;
        roomName: string;
        senderUsername: string;
        snippet: string;
    } | null>(null);

    // Mutable refs to prevent stale closures inside the long-lived subscription callback
    const selectedRoomRef = useRef<Room | null>(selectedRoom); // holds active room pointer for callbacks
    selectedRoomRef.current = selectedRoom; // keeps pointer updated on every render

    const roomsRef = useRef<Room[]>(rooms); // holds current room list pointer for callbacks
    roomsRef.current = rooms; // keeps pointer updated on every render

    // Retrieves cached message list for the currently viewed room
    const getMessageForSelectedRoom = () => {
        let messages: ChatMessage[] | undefined = undefined;
        if (selectedRoom != null) {
            messages = messagesByRoom.get(selectedRoom.id);
        }
        return messages;
    };

    // Selects a room, clears its unread indicator, and dismisses any active toast for that room
    const handleSelectRoom = (room: Room) => {
        setSelectedRoom(room); // sets the active room

        // Clears unread badge if this room was marked unread
        setUnreadRoomIds((prevSet) => {
            if (!prevSet.has(room.id)) return prevSet; // no-op if room was not unread
            const nextSet = new Set(prevSet); // creates new Set to trigger re-render
            nextSet.delete(room.id); // removes unread flag
            return nextSet;
        });

        // Dismisses toast notification if it corresponds to the newly opened room
        if (toastNotification?.roomId === room.id) {
            setToastNotification(null); // clears toast
        }
    };

    // Auto-dismisses toast notification banner after 4.5 seconds of display
    useEffect(() => {
        if (!toastNotification) return; // does nothing if no toast is active

        const timer = setTimeout(() => {
            setToastNotification(null); // clears toast after duration expires
        }, 4500);

        return () => clearTimeout(timer); // cancels timer if another notification arrives or user dismisses
    }, [toastNotification]);

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
    // Step 3: Fetch messages whenever the selected room changes
    // --------------------------------------------------------------------------
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                if (selectedRoom?.id !== undefined) {
                    // Cache check: only fetch from backend if not already stored in memory
                    if (!messagesByRoom.has(selectedRoom.id)) {
                        const response: RoomMessagesResponse = await getRoomMessages(selectedRoom.id, 30);
                        const fetchedMessages = response?.messages || [];
                        const chronological = [...fetchedMessages].reverse(); // reverses to display oldest at top, newest at bottom

                        // Stores formatted messages under the room id in the Map state
                        setMessagesByRoom((prevMap) => {
                            const newMap = new Map(prevMap); // creates new Map to trigger React re-render
                            newMap.set(selectedRoom.id, chronological);
                            return newMap;
                        });
                    }
                }
            } catch (error: unknown) {
                if (error instanceof AppError) {
                    setErrorMessage(error.message);
                } else {
                    setErrorMessage("An unexpected error occurred while loading messages.");
                }
            }
        };

        fetchMessages();
    }, [selectedRoom?.id]); // watches for changes to the selected room ID

    // --------------------------------------------------------------------------
    // Step 4: Event Handlers
    // --------------------------------------------------------------------------
    // Handles message submission originating from the ChatStage composer
    const handleSendMessage = (text: string) => {
        if (!selectedRoom) return; // guards against sending without an active conversation

        // Transmits the message content to the server via WebSocket
        sendMessage(selectedRoom.id, text); // backend saves to database and broadcasts confirmed message back
        console.log(`Dispatched message to room ${selectedRoom.id}: ${text}`);
    };

    // --------------------------------------------------------------------------
    // Step 5: Real-time Message Subscription via WebSocket
    // --------------------------------------------------------------------------
    useEffect(() => {
        // Subscribes to live incoming messages across all rooms
        const unsubscribe = subscribeToMessages((newMessage: ChatMessage) => {
            // Checks whether the incoming message belongs to the room currently active on screen
            const isCurrentRoom = selectedRoomRef.current?.id === newMessage.room_id;

            // If the message is for a different room, trigger notification and mark room as unread
            if (!isCurrentRoom) {
                // Adds room to unread set
                setUnreadRoomIds((prevSet) => {
                    const nextSet = new Set(prevSet); // creates new Set to trigger re-render
                    nextSet.add(newMessage.room_id); // marks room as unread
                    return nextSet;
                });

                // Locates room name from current rooms ref to display in the toast banner
                const targetRoom = roomsRef.current.find((room) => room.id === newMessage.room_id);
                const roomName = targetRoom?.name || 'A conversation';

                // Triggers the floating toast notification
                setToastNotification({
                    roomId: newMessage.room_id,
                    roomName,
                    senderUsername: newMessage.sender_username,
                    snippet: newMessage.content,
                });
            }

            // 1. Appends new message to the room in state if the room has already been loaded in memory
            setMessagesByRoom((prevMap) => {
                if (!prevMap.has(newMessage.room_id)) {
                    return prevMap; // room history not yet loaded into memory, so skip appending
                }

                const currentList = prevMap.get(newMessage.room_id) || [];
                const updatedList = [...currentList, newMessage]; // appends confirmed incoming message

                const newMap = new Map(prevMap); // creates new Map instance to trigger re-render
                newMap.set(newMessage.room_id, updatedList); // updates room entry
                return newMap; // returns new Map reference
            });

            // 2. Reorders conversation sidebar to place the most recently active room at the top
            setRooms((prevRooms) => {
                const targetRoom = prevRooms.find((room) => room.id === newMessage.room_id); // finds active room
                if (!targetRoom) {
                    return prevRooms; // returns unchanged list if room not found in state
                }

                const remainingRooms = prevRooms.filter((room) => room.id !== newMessage.room_id); // removes target room from its current index
                return [targetRoom, ...remainingRooms]; // prepends target room to index 0
            });
        });

        // Cleanup callback executed when MessagesView unmounts
        return () => {
            unsubscribe(); // detaches listener from websocket provider
        };
    }, [subscribeToMessages]); // registers listener once and updates if provider reference changes

    return (
        <>
            {/* Displays a warning banner if room loading encounters a server error */}
            {errorMessage && (
                <div role="alert" style={{ color: 'var(--accent)', padding: '8px 16px', fontSize: '13px' }}>
                    {errorMessage}
                </div>
            )}

            {/* Interactive floating toast notification for background messages */}
            {toastNotification && (
                <ChatToast
                    roomName={toastNotification.roomName}
                    senderUsername={toastNotification.senderUsername}
                    snippet={toastNotification.snippet}
                    onClick={() => {
                        // Finds target room and switches active view to it
                        const targetRoom = rooms.find((r) => r.id === toastNotification.roomId);
                        if (targetRoom) {
                            handleSelectRoom(targetRoom);
                        }
                    }}
                    onDismiss={() => setToastNotification(null)}
                />
            )}

            {/* Left conversation sidebar */}
            <ConversationList
                rooms={rooms}
                selectedRoom={selectedRoom}
                unreadRoomIds={unreadRoomIds}
                onSelectRoom={handleSelectRoom}
                onRoomCreated={(newRoom) => {
                    setRooms((prev) => [newRoom, ...prev]); // prepend to room list
                    handleSelectRoom(newRoom); // switch active stage to new room
                }}
            />

            {/* Right chat canvas and composer */}
            <ChatStage
                selectedRoom={selectedRoom}
                onSendMessage={handleSendMessage}
                messages={getMessageForSelectedRoom()}
            />
        </>
    );
}
