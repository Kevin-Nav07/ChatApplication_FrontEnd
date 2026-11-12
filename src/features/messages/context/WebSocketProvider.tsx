import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebSocketContext, type ConnectionStatus, type SocketEvent, type SocketEventListener, type WebSocketContextType } from './WebSocketContext';
import { getUserMe } from '../../../services/authService';
import { AppError } from '../../../models/AppError';
import { WS_URL } from '../../../services/apiConfig'; // wss://<same host as the API>/ws, worked out once in apiConfig.ts

// Props accepted by the provider component
interface WebSocketProviderProps {
    children: React.ReactNode; // child components that will have access to the websocket API
}

const MAX_RECONNECT_DELAY_MS = 30000; // retries never wait longer than 30 seconds

// Turns one raw text frame from the server into a typed SocketEvent, or null if it is not something we understand.
// Checking the shape here means the rest of the app can trust the fields it reads
function parseServerEvent(raw: string): SocketEvent | null {
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return null;
    }
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const event = data as Record<string, unknown>;
    if (event.type === 'message:new' && typeof event.message === 'object' && event.message !== null) {
        return event as unknown as SocketEvent;
    }
    if (event.type === 'message:error' && typeof event.error === 'string') {
        return event as unknown as SocketEvent;
    }
    if (event.type === 'room:new' && typeof event.room === 'object' && event.room !== null) {
        return event as unknown as SocketEvent;
    }
    return null;
}

// How long to wait before reconnect attempt number `attempt` (0 based): 1s, 2s, 4s ... capped at 30s.
// The random part (jitter) spreads clients out, so after a server restart they do not all reconnect in the same instant
function reconnectDelay(attempt: number): number {
    const base = Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS);
    return base / 2 + Math.random() * (base / 2); // somewhere between half and all of the base delay
}

// Owns the single WebSocket connection for the logged in user and shares it with every component below it.
// It survives StrictMode's mount, unmount, mount cycle, reconnects after unexpected drops, and closes on unmount (for example on logout)
export function WebSocketProvider({ children }: WebSocketProviderProps): React.JSX.Element {
    // The provider is only rendered once the user is known, so the first thing it does is connect
    const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');

    // Subscribers live in a ref so adding or removing one never re-renders the provider
    const listenersRef = useRef<Set<SocketEventListener>>(new Set());

    // The socket currently in use, or null while there is none. sendMessage reads it
    const socketRef = useRef<WebSocket | null>(null);

    // The whole connection lifecycle lives inside this one effect. Every piece of state it needs (attempt count,
    // retry timer, whether it was stopped) is a local variable of this run, so a StrictMode remount gets fresh
    // values and the cleanup of the first run cannot interfere with the second
    useEffect(() => {
        let stopped = false; // set by cleanup; every callback checks it so nothing happens after unmount
        let attempt = 0; // failed attempts in a row, reset after a successful connection
        let hasConnectedBefore = false; // tells a reconnect apart from the very first connection
        let retryTimer: number | null = null; // the one pending retry, so it can be cancelled

        // Hands an event to every subscriber. One faulty subscriber must not stop the others from hearing it
        const emit = (event: SocketEvent) => {
            listenersRef.current.forEach((listener) => {
                try {
                    listener(event);
                } catch (listenerError) {
                    console.error('[WebSocket] A listener threw while handling an event:', listenerError);
                }
            });
        };

        // Opens a new socket and wires up its handlers
        const connect = () => {
            if (stopped) {
                return;
            }
            // The browser sends the HttpOnly auth cookies with this handshake automatically
            const ws = new WebSocket(WS_URL);
            socketRef.current = ws;

            ws.onopen = () => {
                attempt = 0; // a working connection resets the backoff
                setStatus('CONNECTED');
                if (hasConnectedBefore) {
                    emit({ type: 'connection:reopened' }); // anything sent while we were offline was missed
                }
                hasConnectedBefore = true;
            };

            ws.onmessage = (messageEvent: MessageEvent) => {
                const event = parseServerEvent(String(messageEvent.data));
                if (event) {
                    emit(event);
                }
            };

            // Every drop that was not caused by our own cleanup counts as unexpected and is retried
            ws.onclose = () => {
                if (socketRef.current === ws) {
                    socketRef.current = null; // nothing can be sent until a new socket opens
                }
                if (stopped) {
                    return;
                }
                setStatus('RECONNECTING');
                scheduleReconnect();
            };
        };

        // Waits, makes sure the login is still valid, then reconnects
        const scheduleReconnect = () => {
            const delay = reconnectDelay(attempt);
            attempt += 1;
            retryTimer = window.setTimeout(async () => {
                retryTimer = null;
                try {
                    // The browser cannot read why a websocket handshake was refused, so an expired access token looks
                    // exactly like a network error. Calling /users/me first lets the axios interceptor refresh the token
                    await getUserMe();
                } catch (error) {
                    if (stopped) {
                        return;
                    }
                    // 401 here means the refresh token is gone too (the interceptor is already sending the user to the login page),
                    // and 404 means the account no longer exists. Retrying could never succeed, so stop
                    if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 404)) {
                        setStatus('DISCONNECTED');
                        return;
                    }
                    scheduleReconnect(); // server down or offline, try again after a longer wait
                    return;
                }
                connect();
            }, delay);
        };

        connect();

        // Runs on unmount (logout, leaving the dashboard) and between StrictMode's two mounts in development
        return () => {
            stopped = true;
            if (retryTimer !== null) {
                window.clearTimeout(retryTimer);
            }
            const ws = socketRef.current;
            socketRef.current = null;
            if (ws) {
                ws.onclose = null; // an intentional close must not schedule a reconnect
                ws.onmessage = null;
                if (ws.readyState === WebSocket.CONNECTING) {
                    // closing mid handshake makes the browser log an error, so it is closed as soon as it opens instead
                    ws.onopen = () => ws.close(1000, 'Provider unmounted');
                } else {
                    ws.onopen = null;
                    ws.close(1000, 'Provider unmounted');
                }
            }
        };
    }, []);

    // Sends a message in the format agreed in PLAN.md. client_message_id lets a reply from the server
    // (message:new or message:error) be matched to this exact send. Returns null if nothing could be sent
    const sendMessage = useCallback((roomId: number, content: string): string | null => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return null;
        }
        const clientMessageId = crypto.randomUUID(); // built into browsers on https pages
        socket.send(JSON.stringify({
            type: 'message:send',
            room_id: roomId,
            client_message_id: clientMessageId,
            content,
        }));
        return clientMessageId;
    }, []);

    // Registers a listener and returns the matching unsubscribe function for effect cleanup
    const subscribe = useCallback((listener: SocketEventListener) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    // useMemo keeps the same object between renders unless status changes, so consumers only re-render when something real changed
    const contextValue: WebSocketContextType = useMemo(() => ({
        status,
        isConnected: status === 'CONNECTED',
        sendMessage,
        subscribe,
    }), [status, sendMessage, subscribe]);

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
}
