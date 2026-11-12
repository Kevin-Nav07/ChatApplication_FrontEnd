import type { Room } from '../../../models/Room';
import type { ChatMessage } from '../../../models/ChatMessage';

// All chat state for the Messages tab lives here and only changes through chatReducer.
// A reducer is a pure function: given the current state and an action describing what happened, it returns the next state.
// Socket handlers and fetch callbacks only dispatch actions, so they never read old state from a closure,
// and every rule (merging, ordering, unread) can be unit tested without React

// The loaded messages of one room
export interface RoomHistory {
    messages: ChatMessage[]; // oldest first, each id at most once
    hasLoadedLatest: boolean; // true once the newest page has come back from the server; live messages alone do not count
    nextCursor: string | null; // cursor for the next older page, null when the oldest message is already loaded
    isLoadingOlder: boolean; // true while an older page is being fetched, so the button cannot fire twice
}

// The small notification shown for a message in a room that is not open
export interface ToastData {
    roomId: number;
    senderUsername: string;
    snippet: string;
}

export interface ChatState {
    rooms: Room[]; // most recently active first
    roomsLoaded: boolean; // false until the first room list arrives, used to show a loading state
    roomsRequestId: number; // the room list is (re)fetched every time this number changes
    preferredRoomId: number | null; // room to open once rooms load, so returning to the tab reopens the same conversation
    selectedRoomId: number | null; // the open conversation
    historyByRoom: Record<number, RoomHistory>; // keyed by room id, so a late response can never land in the wrong room
    historyGeneration: number; // goes up when all history is dropped after a reconnect; a response started before that is ignored
    unreadRoomIds: Set<number>; // rooms with a message the user has not opened yet
    toast: ToastData | null;
    error: string | null; // a failed load, shown as a dismissible banner
    sendError: string | null; // a message that could not be sent, shown above the composer
}

export type ChatAction =
    | { type: 'rooms/loaded'; rooms: Room[] }
    | { type: 'rooms/refreshRequested' }
    | { type: 'room/added'; room: Room }
    | { type: 'room/selected'; roomId: number }
    | { type: 'history/loaded'; roomId: number; messages: ChatMessage[]; nextCursor: string | null; page: 'latest' | 'older'; generation: number }
    | { type: 'history/olderStarted'; roomId: number }
    | { type: 'history/olderFailed'; roomId: number }
    | { type: 'message/received'; message: ChatMessage; currentUserId: number | null }
    | { type: 'connection/reopened' }
    | { type: 'toast/dismissed' }
    | { type: 'error/set'; error: string }
    | { type: 'error/cleared' }
    | { type: 'sendError/set'; error: string }
    | { type: 'sendError/cleared' };

// Builds the starting state. preferredRoomId is the room that was open last time the tab was visible
export function createInitialChatState(preferredRoomId: number | null): ChatState {
    return {
        rooms: [],
        roomsLoaded: false,
        roomsRequestId: 0,
        preferredRoomId,
        selectedRoomId: null,
        historyByRoom: {},
        historyGeneration: 0,
        unreadRoomIds: new Set(),
        toast: null,
        error: null,
        sendError: null,
    };
}

// The order messages are shown in: by time, then by id for messages saved in the same instant. Matches the server's order
function compareMessages(a: ChatMessage, b: ChatMessage): number {
    const timeDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return timeDifference !== 0 ? timeDifference : a.id - b.id;
}

// Combines two message lists into one sorted list with each id once.
// Because of this, it no longer matters in which order history pages and live messages arrive, or whether they overlap
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byId = new Map<number, ChatMessage>();
    for (const message of existing) {
        byId.set(message.id, message);
    }
    for (const message of incoming) {
        byId.set(message.id, message);
    }
    return [...byId.values()].sort(compareMessages);
}

// The history entry for a room, or an empty one if nothing has been loaded or received for it yet
function historyFor(state: ChatState, roomId: number): RoomHistory {
    return state.historyByRoom[roomId] ?? { messages: [], hasLoadedLatest: false, nextCursor: null, isLoadingOlder: false };
}

// Returns a copy of historyByRoom with one room's entry replaced
function withHistory(state: ChatState, roomId: number, history: RoomHistory): Record<number, RoomHistory> {
    return { ...state.historyByRoom, [roomId]: history };
}

// True when `message` is newer than the room's current preview message
function isNewerThanPreview(room: Room, message: ChatMessage): boolean {
    return room.last_message == null || compareMessages(room.last_message, message) < 0;
}

// The reducer itself: one case per action, each returning a new state object instead of changing the old one,
// which is how React notices that something changed
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'rooms/loaded': {
            // keep the open room if it still exists, otherwise reopen the preferred one, otherwise the most recent one
            const ids = new Set(action.rooms.map((room) => room.id));
            let selectedRoomId = state.selectedRoomId;
            if (selectedRoomId == null || !ids.has(selectedRoomId)) {
                selectedRoomId = state.preferredRoomId != null && ids.has(state.preferredRoomId)
                    ? state.preferredRoomId
                    : action.rooms[0]?.id ?? null;
            }
            return { ...state, rooms: action.rooms, roomsLoaded: true, selectedRoomId };
        }

        case 'rooms/refreshRequested':
            return { ...state, roomsRequestId: state.roomsRequestId + 1 };

        case 'room/added': {
            // room:new arrives for the creator too, right after the create request returns, so duplicates are ignored
            if (state.rooms.some((room) => room.id === action.room.id)) {
                return state;
            }
            return { ...state, rooms: [{ ...action.room, last_message: action.room.last_message ?? null }, ...state.rooms] };
        }

        case 'room/selected': {
            const unreadRoomIds = new Set(state.unreadRoomIds);
            unreadRoomIds.delete(action.roomId); // opening a room reads it
            return {
                ...state,
                selectedRoomId: action.roomId,
                unreadRoomIds,
                toast: state.toast?.roomId === action.roomId ? null : state.toast, // the toast is about the room now open
                sendError: null, // an old send error belongs to the previous room
            };
        }

        case 'history/loaded': {
            if (action.generation !== state.historyGeneration) {
                return state; // this request started before a reconnect reset, so it may be missing messages; a fresh request replaces it
            }
            const current = historyFor(state, action.roomId);
            const next: RoomHistory = {
                // merged, not replaced, so live messages that arrived while this page was loading are kept
                messages: mergeMessages(current.messages, action.messages),
                hasLoadedLatest: current.hasLoadedLatest || action.page === 'latest',
                nextCursor: action.nextCursor,
                isLoadingOlder: action.page === 'older' ? false : current.isLoadingOlder,
            };
            return { ...state, historyByRoom: withHistory(state, action.roomId, next) };
        }

        case 'history/olderStarted': {
            const current = historyFor(state, action.roomId);
            return { ...state, historyByRoom: withHistory(state, action.roomId, { ...current, isLoadingOlder: true }) };
        }

        case 'history/olderFailed': {
            const current = historyFor(state, action.roomId);
            return { ...state, historyByRoom: withHistory(state, action.roomId, { ...current, isLoadingOlder: false }) };
        }

        case 'message/received': {
            const { message, currentUserId } = action;
            const roomId = message.room_id;

            // 1. Store the message even if this room's history has not loaded yet. When the history arrives it is merged
            //    with this, so a message sent while the first page was loading is never lost
            const current = historyFor(state, roomId);
            const historyByRoom = withHistory(state, roomId, { ...current, messages: mergeMessages(current.messages, [message]) });

            // 2. Update the room's preview and move it to the top of the list
            const room = state.rooms.find((r) => r.id === roomId);
            let rooms = state.rooms;
            let roomsRequestId = state.roomsRequestId;
            if (room == null) {
                roomsRequestId += 1; // a room we do not know about yet, so fetch the room list again to pick it up
            } else if (isNewerThanPreview(room, message)) {
                rooms = [{ ...room, last_message: message }, ...state.rooms.filter((r) => r.id !== roomId)];
            }

            // 3. Unread dot and toast, only for someone else's message in a room that is not open.
            //    Your own message sent from another tab or device is not "unread"
            const isOwnMessage = currentUserId != null && message.sender_id === currentUserId;
            const isOpenRoom = state.selectedRoomId === roomId;
            if (isOwnMessage || isOpenRoom) {
                return { ...state, historyByRoom, rooms, roomsRequestId };
            }
            const unreadRoomIds = new Set(state.unreadRoomIds);
            unreadRoomIds.add(roomId);
            return {
                ...state,
                historyByRoom,
                rooms,
                roomsRequestId,
                unreadRoomIds,
                toast: { roomId, senderUsername: message.sender_username, snippet: message.content },
            };
        }

        case 'connection/reopened':
            // Messages sent while the connection was down were never delivered. Dropping every loaded history makes the
            // open room fetch its newest page again (other rooms refetch when opened), and the room list is refetched for previews
            return {
                ...state,
                historyByRoom: {},
                historyGeneration: state.historyGeneration + 1,
                roomsRequestId: state.roomsRequestId + 1,
            };

        case 'toast/dismissed':
            return { ...state, toast: null };

        case 'error/set':
            return { ...state, error: action.error };

        case 'error/cleared':
            return { ...state, error: null };

        case 'sendError/set':
            return { ...state, sendError: action.error };

        case 'sendError/cleared':
            return { ...state, sendError: null };

        default:
            return state;
    }
}
