import { createContext } from "react";
import type { ChatMessage } from "../../../models/ChatMessage";

// Defines the finite states that a WebSocket connection can be in for UI rendering
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

// Defines the listener callback signature for incoming chat messages
export type MessageListener = (message: ChatMessage) => void;

// Defines the contract and methods exposed by this context to any consumer component
export interface WebSocketContextType {
    status: ConnectionStatus; // string representation of the current connection state
    isConnected: boolean; // boolean flag for components that only care if the socket is open
    sendMessage: (roomId: number, content: string) => void; // method to transmit a message to a specific room
    subscribeToMessages: (listener: MessageListener) => () => void; // registers a callback that fires whenever a new message is received and returns an unsubscribe function
}

// Creates the Context object that acts as the token for React dependency injection
export const WebSocketContext = createContext<WebSocketContextType | null>(null);
