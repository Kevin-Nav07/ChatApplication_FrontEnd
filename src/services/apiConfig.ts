// Where the frontend finds the backend. Both the HTTP API and the websocket address are worked out here, once,
// so the two can never disagree.
//
// In production the backend serves this app itself, so the API is on the SAME origin under /api and a relative path
// is enough: "/api" means "on whatever site this page came from". Nothing about the domain is baked into the build.
// In development Vite serves the app on https://localhost:5173 and the backend runs on :5043, a different origin,
// so .env.development sets the full address instead.
//
// || (not ??) is used on purpose: an empty value like "VITE_API_BASE_URL=" should also fall back to /api,
// and ?? would only fall back for undefined or null, keeping the empty string
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || '/api';

// Builds the websocket address from the API address: same host and port, ws/wss instead of http/https, path /ws.
// new URL(relative, base) resolves a relative address against the page's own address, so "/api" on
// https://ember.onrender.com becomes https://ember.onrender.com/api before the parts are swapped
function buildWebSocketUrl(): string {
    const url = new URL(API_BASE_URL, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; // wss is a websocket inside TLS, the socket version of https
    url.pathname = '/ws';
    url.search = ''; // drop any ?query or #fragment that came with the API address
    url.hash = '';
    return url.toString();
}

export const WS_URL: string = buildWebSocketUrl();
