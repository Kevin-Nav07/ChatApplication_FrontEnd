import { createContext } from "react";
import type { ChatMessage } from "../../../models/ChatMessage";
import type { Room } from "../../../models/Room";

// The states a WebSocket connection can be in, used by the UI to show connection status and disable sending
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

// Every event the provider hands to subscribers. The first three come from the server in the format agreed in PLAN.md.
// 'connection:reopened' is created by the provider itself after a dropped connection comes back, so consumers know
// that anything sent while it was down was missed and should be fetched again
export type SocketEvent =
    | { type: 'message:new'; client_message_id: string | null; message: ChatMessage }
    | { type: 'message:error'; room_id: number | null; client_message_id: string | null; code: string; error: string }
    | { type: 'room:new'; room: Room }
    | { type: 'connection:reopened' };

// The callback signature for anything that wants to hear socket events
export type SocketEventListener = (event: SocketEvent) => void;

// What the context exposes to consumer components
export interface WebSocketContextType {
    status: ConnectionStatus; // current connection state
    isConnected: boolean; // shortcut for status === 'CONNECTED'
    // Sends a message to a room. Returns the client_message_id it was sent with, or null when the socket is not open and nothing was sent
    sendMessage: (roomId: number, content: string) => string | null;
    // Registers a listener for every socket event and returns a function that removes it again
    subscribe: (listener: SocketEventListener) => () => void;
}

// The Context object that acts as the token for React dependency injection
export const WebSocketContext = createContext<WebSocketContextType | null>(null);
