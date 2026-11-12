import { useContext } from "react";
import { WebSocketContext } from "../features/messages/context/WebSocketContext";

// Custom hook providing access to the WebSocket connection, status, and message transmission
export default function useWebsocketContext() {
    const context = useContext(WebSocketContext); // accesses the context token from the nearest provider
    if (!context) {
        throw new Error('useWebsocketContext must be used within a WebSocketProvider'); // fails loudly if provider is missing
    }
    return context; // returns the WebSocket API object
}
