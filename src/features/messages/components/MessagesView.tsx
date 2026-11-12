import React, { useEffect, useReducer, useRef } from 'react';
import ConversationList from './ConversationList';
import ChatStage from './ChatStage';
import ChatToast from './ChatToast';
import type { Room } from '../../../models/Room';
import { getRoomMessages, getRooms } from '../../../services/roomService';
import { getErrorMessage } from '../../../models/AppError';
import useWebsocketContext from '../../../hooks/useWebsocketContext';
import { useUserContext } from '../../../hooks/useUserContext';
import { chatReducer, createInitialChatState } from '../state/chatReducer';

const PAGE_SIZE = 30; // messages per history page
const TOAST_DURATION_MS = 4500; // how long a message toast stays before hiding itself

// Props passed down from DashboardPage
interface MessagesViewProps {
    initialRoomId: number | null; // the room that was open last time this tab was visible, reopened if it still exists
    onSelectedRoomChange: (roomId: number) => void; // tells the dashboard which room is open, so it can be reopened later
}

// Coordinator for the Messages tab. It owns the chat state through chatReducer, loads data, listens to the socket,
// and passes plain data and callbacks to the display components. This component unmounts when another tab opens,
// and everything is fetched fresh when it mounts again, so nothing is stale after visiting the Friends tab
export default function MessagesView({ initialRoomId, onSelectedRoomChange }: MessagesViewProps): React.JSX.Element {
    // The third argument builds the first state from initialRoomId, once, when the component mounts
    const [state, dispatch] = useReducer(chatReducer, initialRoomId, createInitialChatState);
    const { status, isConnected, sendMessage, subscribe } = useWebsocketContext();
    const { user } = useUserContext();
    const currentUserId = user?.id ?? null;

    // Which newest-page requests are running, keyed by "generation:roomId", so the same page is never requested twice at once
    const inFlightLatestRef = useRef<Set<string>>(new Set());

    // Values derived from state on every render instead of being stored separately, so they can never disagree with it
    const selectedRoomId = state.selectedRoomId;
    const generation = state.historyGeneration;
    const selectedRoom = state.rooms.find((room) => room.id === selectedRoomId) ?? null;
    const selectedHistory = selectedRoomId != null ? state.historyByRoom[selectedRoomId] : undefined;
    const needsLatestPage = selectedRoomId != null && !(selectedHistory?.hasLoadedLatest ?? false);

    // Loads the room list on mount, and again whenever the reducer asks for it (after a reconnect, or a message for an unknown room)
    useEffect(() => {
        let ignore = false; // set by cleanup so a response for an outdated request is thrown away
        getRooms()
            .then((rooms) => {
                if (!ignore) {
                    dispatch({ type: 'rooms/loaded', rooms });
                }
            })
            .catch((error: unknown) => {
                if (!ignore) {
                    dispatch({ type: 'error/set', error: getErrorMessage(error) });
                }
            });
        return () => {
            ignore = true;
        };
    }, [state.roomsRequestId]);

    // Loads the newest page of the open room when it has not been loaded yet.
    // The response is stored under its own room id, so switching rooms while it loads cannot put it in the wrong room
    useEffect(() => {
        if (selectedRoomId == null || !needsLatestPage) {
            return;
        }
        const key = `${generation}:${selectedRoomId}`;
        if (inFlightLatestRef.current.has(key)) {
            return; // already on its way, for example after StrictMode runs this effect a second time
        }
        inFlightLatestRef.current.add(key);
        getRoomMessages(selectedRoomId, PAGE_SIZE)
            .then((response) => dispatch({
                type: 'history/loaded',
                roomId: selectedRoomId,
                messages: response.messages,
                nextCursor: response.newCursor,
                page: 'latest',
                generation,
            }))
            .catch((error: unknown) => dispatch({ type: 'error/set', error: getErrorMessage(error) }))
            .finally(() => inFlightLatestRef.current.delete(key));
    }, [selectedRoomId, needsLatestPage, generation]);

    // Listens to the socket for as long as this tab is open. The handler only translates socket events into reducer
    // actions, so it never needs the current state and can never see an old copy of it
    useEffect(() => {
        return subscribe((event) => {
            switch (event.type) {
                case 'message:new':
                    dispatch({ type: 'message/received', message: event.message, currentUserId });
                    break;
                case 'message:error':
                    dispatch({ type: 'sendError/set', error: `Your message was not sent: ${event.error}` });
                    break;
                case 'room:new':
                    dispatch({ type: 'room/added', room: event.room });
                    break;
                case 'connection:reopened':
                    dispatch({ type: 'connection/reopened' });
                    break;
            }
        }); // subscribe returns the unsubscribe function, which React calls as this effect's cleanup
    }, [subscribe, currentUserId]);

    // Hides the toast after a few seconds; a newer toast restarts the timer because state.toast changes
    useEffect(() => {
        if (!state.toast) {
            return;
        }
        const timer = window.setTimeout(() => dispatch({ type: 'toast/dismissed' }), TOAST_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [state.toast]);

    // Reports the open room to the dashboard so it is reopened after visiting another tab
    useEffect(() => {
        if (selectedRoomId != null) {
            onSelectedRoomChange(selectedRoomId);
        }
    }, [selectedRoomId, onSelectedRoomChange]);

    // Opens a room, which also clears its unread dot
    const handleSelectRoom = (room: Room) => {
        dispatch({ type: 'room/selected', roomId: room.id });
    };

    // Adds a room the user just created and opens it. The server's room:new event for the same room is ignored as a duplicate
    const handleRoomCreated = (room: Room) => {
        dispatch({ type: 'room/added', room });
        dispatch({ type: 'room/selected', roomId: room.id });
    };

    // Sends the composer text. Returns false when nothing was sent, so the composer keeps the text instead of clearing it.
    // The message appears once the server confirms it with message:new, so it is never shown unless it was really saved
    const handleSendMessage = (text: string): boolean => {
        if (selectedRoomId == null) {
            return false;
        }
        const clientMessageId = sendMessage(selectedRoomId, text);
        if (clientMessageId == null) {
            dispatch({ type: 'sendError/set', error: 'You are offline, so the message was not sent. Try again once the connection is back.' });
            return false;
        }
        if (state.sendError) {
            dispatch({ type: 'sendError/cleared' });
        }
        return true;
    };

    // Fetches the page of messages older than the oldest one on screen
    const handleLoadOlder = () => {
        const roomId = selectedRoomId;
        const cursor = selectedHistory?.nextCursor;
        if (roomId == null || !cursor || selectedHistory?.isLoadingOlder) {
            return;
        }
        dispatch({ type: 'history/olderStarted', roomId });
        getRoomMessages(roomId, PAGE_SIZE, cursor)
            .then((response) => dispatch({
                type: 'history/loaded',
                roomId,
                messages: response.messages,
                nextCursor: response.newCursor,
                page: 'older',
                generation,
            }))
            .catch((error: unknown) => {
                dispatch({ type: 'history/olderFailed', roomId });
                dispatch({ type: 'error/set', error: getErrorMessage(error) });
            });
    };

    // The toast's room name comes from the current room list, so a renamed or newly loaded room shows correctly
    const toastRoom = state.toast ? state.rooms.find((room) => room.id === state.toast?.roomId) : undefined;

    return (
        <>
            {/* A failed load, dismissible so it does not stay forever */}
            {state.error && (
                <div role="alert" style={{ color: 'var(--accent)', padding: '8px 16px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{state.error}</span>
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'error/cleared' })}
                        aria-label="Dismiss error"
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Notification for a message in a room that is not open */}
            {state.toast && (
                <ChatToast
                    roomName={toastRoom?.name ?? 'A conversation'}
                    senderUsername={state.toast.senderUsername}
                    snippet={state.toast.snippet}
                    onClick={() => {
                        if (toastRoom) {
                            handleSelectRoom(toastRoom);
                        }
                    }}
                    onDismiss={() => dispatch({ type: 'toast/dismissed' })}
                />
            )}

            <ConversationList
                rooms={state.rooms}
                roomsLoaded={state.roomsLoaded}
                selectedRoom={selectedRoom}
                unreadRoomIds={state.unreadRoomIds}
                onSelectRoom={handleSelectRoom}
                onRoomCreated={handleRoomCreated}
            />

            <ChatStage
                selectedRoom={selectedRoom}
                messages={selectedHistory?.messages ?? []}
                isLoadingHistory={needsLatestPage && state.error == null}
                hasOlderMessages={selectedHistory?.nextCursor != null}
                isLoadingOlder={selectedHistory?.isLoadingOlder ?? false}
                onLoadOlder={handleLoadOlder}
                onSendMessage={handleSendMessage}
                connectionStatus={status}
                isConnected={isConnected}
                sendError={state.sendError}
                onDismissSendError={() => dispatch({ type: 'sendError/cleared' })}
            />
        </>
    );
}
