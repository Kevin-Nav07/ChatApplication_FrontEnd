import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WebSocketContext, type ConnectionStatus, type MessageListener, type WebSocketContextType } from './WebSocketContext';
import type { ChatMessage } from '../../../models/ChatMessage';



// Props accepted by the provider component
interface WebSocketProviderProps {
    children: React.ReactNode; // child components that will have access to the websocket API
}

// Extracts the backend API URL and transforms http/https into ws/wss protocols
const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'https://localhost:5043';
const WS_URL = rawApiUrl.replace(/^http/, 'ws'); // replaces http with ws and https with wss

// The provider component that manages the socket lifecycle and exposes the API to children
export function WebSocketProvider({ children }: WebSocketProviderProps): React.JSX.Element {
    // Tracks the human-readable connection status
    const [status, setStatus] = useState<ConnectionStatus>('DISCONNECTED');

    // Stores subscriber callback functions that want to receive real-time messages
    // Using a ref with a Set ensures subscriptions do not cause the provider to re-render
    const messageListenersRef = useRef<Set<MessageListener>>(new Set());

    // Holds the mutable WebSocket instance across renders without triggering component re-renders
    const socketRef = useRef<WebSocket | null>(null);

    // Tracks how many consecutive failed reconnection attempts have occurred
    const reconnectAttemptsRef = useRef<number>(0);

    // Stores the id of the active reconnection timer so it can be cancelled on unmount
    const reconnectTimerRef = useRef<number | null>(null);

    // Prevents reconnection logic from firing after the user navigates away or logs out
    const isUnmountedRef = useRef<boolean>(false);

    // Caps consecutive reconnection retries to avoid infinite spamming of the server
    const MAX_RECONNECT_ATTEMPTS = 10;

    // Calculates delay using exponential backoff and schedules a reconnection attempt
    const scheduleReconnect = () => {
        // Stops retrying if maximum attempts are exceeded
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('[WebSocket] Maximum reconnection attempts reached. Giving up.');
            return;
        }

        // Exponential backoff formula: 1s, 2s, 4s, 8s, capped at a maximum of 30 seconds
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // doubles wait time on each failure
        reconnectAttemptsRef.current += 1; // increments failure count for the next attempt

        setStatus('RECONNECTING'); // updates UI to inform the user that a reconnect is pending
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);

        // Sets a timer to attempt connection after the calculated backoff delay
        reconnectTimerRef.current = window.setTimeout(() => {
            connect(); // attempts to reconnect after waiting
        }, delay);
    };

    // Establishes a new WebSocket connection to the backend and configures event listeners
    const connect = () => {
        // Prevents opening a connection if the component is already unmounted
        if (isUnmountedRef.current) {
            return; // exits early to prevent orphan connections
        }

        // Prevents opening a duplicate socket if one is already open or currently connecting
        if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
            return; // exits early to avoid duplicate connections
        }

        setStatus('CONNECTING'); // notifies UI that the connection handshake is in progress

        // Creates the native browser WebSocket connection
        // The browser automatically attaches HTTP-only cookies during the handshake upgrade request
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws; // stores the socket instance in the ref

        // Event handler executed when the handshake succeeds and the TCP stream is ready
        ws.onopen = () => {
            // Guard against callbacks from abandoned or obsolete sockets
            if (socketRef.current !== ws || isUnmountedRef.current) {
                ws.close(1000, 'Superseded socket'); // cleanly terminates obsolete socket
                return; // ignores obsolete socket events
            }
            console.log('[WebSocket] Connection established successfully to', WS_URL);
            reconnectAttemptsRef.current = 0; // resets backoff counter because connection succeeded
            setStatus('CONNECTED'); // updates UI state to connected
        };

        // Event handler executed whenever the server pushes a message down the stream
        ws.onmessage = (event: MessageEvent) => {
            // Guard against messages from old or discarded connections
            if (socketRef.current !== ws || isUnmountedRef.current) {
                return; // ignores messages from abandoned socket
            }
            try {
                // Parses the JSON text frame received from the Node ws server
                const parsed = JSON.parse(event.data);

                // Checks if the incoming frame is a new chat message broadcast
                if (parsed?.type === 'message:new' && parsed.message) {
                    const incomingMessage: ChatMessage = parsed.message; // extracts confirmed message payload

                    // Dispatches the message synchronously to every registered subscriber
                    messageListenersRef.current.forEach((listener) => {
                        try {
                            listener(incomingMessage); // executes consumer callback
                        } catch (listenerError) {
                            console.error('[WebSocket] Error running message listener callback:', listenerError);
                        }
                    });
                }
            } catch (err) {
                console.error('[WebSocket] Failed to parse incoming JSON frame:', err);
            }
        };

        // Event handler executed when a network level error occurs on the socket
        ws.onerror = (err) => {
            // If this socket is no longer the active one or the component unmounted, ignore its errors
            if (socketRef.current !== ws || isUnmountedRef.current) {
                return; // silences errors from discarded or intentionally aborted sockets
            }
            console.error('[WebSocket] Socket encountered an error:', err);
        };

        // Event handler executed when the connection drops or is closed by either side
        ws.onclose = (event: CloseEvent) => {
            // Guard against close events triggered by discarded sockets from previous renders
            if (socketRef.current !== ws) {
                return; // ignores close event from superseded socket so it does not overwrite state
            }
            console.log(`[WebSocket] Closed (Code: ${event.code}, Reason: "${event.reason}")`);
            setStatus('DISCONNECTED'); // updates UI state to disconnected

            // Only attempt reconnection if the component is still actively mounted on the page
            if (!isUnmountedRef.current) {
                scheduleReconnect(); // triggers backoff retry mechanism
            }
        };
    };

    // Serializes and transmits a chat message payload to a specific conversation room
    const sendMessage = (roomId: number, content: string) => {
        // Verifies the socket exists and is in the OPEN readyState before trying to write to the stream
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Cannot send message: connection is not open.');
            return;
        }

        // Formats payload to match the backend contract with both content and message keys
        const payload = JSON.stringify({
            room_id: roomId, // target conversation room
            content: content, // standard content attribute
            message: content, // backwards-compatible fallback attribute
        });

        socketRef.current.send(payload); // writes the payload string into the WebSocket stream
    };

    // Registers a listener callback and returns an unsubscription function for effect cleanup
    const subscribeToMessages = useCallback((listener: MessageListener) => {
        messageListenersRef.current.add(listener); // adds subscriber to the active set

        // Unsubscribe function to be called during effect cleanup in the consumer component
        return () => {
            messageListenersRef.current.delete(listener); // removes subscriber from the active set
        };
    }, []); // empty dependencies array guarantees stable function reference across renders

    // Lifecycle hook that runs on initial mount to start connection and cleans up on unmount
    useEffect(() => {
        isUnmountedRef.current = false; // marks component as mounted
        connect(); // initiates socket connection when the provider enters the DOM

        // Cleanup function executed when the provider unmounts (e.g. user logs out or leaves dashboard)
        return () => {
            isUnmountedRef.current = true; // marks component as unmounted so reconnect loops stop

            // Cancels any pending reconnection timeout so it does not fire in the background
            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null; // resets timer ref
            }

            // Closes the active socket connection cleanly
            if (socketRef.current) {
                const socket = socketRef.current; // holds reference to the socket being torn down
                socketRef.current = null; // clears active socket ref so no further events are processed

                // Silences event handlers on the discarded socket to prevent noisy console errors during teardown
                socket.onerror = () => { }; // suppresses browser abort error during teardown
                socket.onclose = () => { }; // suppresses close event so it does not trigger reconnect logic

                // If still in the middle of connecting, close gracefully after opening or immediately
                if (socket.readyState === WebSocket.CONNECTING) {
                    socket.onopen = () => {
                        socket.close(1000, 'Provider unmounted'); // closes once handshake finishes
                    };
                    socket.close(1000, 'Provider unmounted'); // requests closure immediately
                } else if (socket.readyState === WebSocket.OPEN) {
                    socket.close(1000, 'Provider unmounted'); // terminates the open TCP connection cleanly
                }
            }
        };
    }, []);

    // The API object bundle that will be passed down to consumer components
    const contextValue: WebSocketContextType = {
        status, // the current connection state
        isConnected: status === 'CONNECTED', // convenience boolean
        sendMessage, // method to transmit a message
        subscribeToMessages, // method to subscribe to incoming messages
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}



