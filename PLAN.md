# Chat App Finish Plan

**Goal:** finish a working chat app by December 1, and prove to myself that I can take an unfamiliar problem, get unstuck, and judge code whether or not I wrote it.

**Time:** two 3-hour sessions a week, about 24 hours in total.

**The idea:** the chat UI already exists with fake data. I replace the fake data with real logic, one piece at a time, while AI handles the backend and the UI.

## Instructions for AI coding agents

Read this section first. It applies to any AI tool working on this project.

**Where things are**

- **Frontend (this repo):** React 19, TypeScript and Vite.
- **Backend:** `../../Chat-Application` from this repo's root. It uses Node.js with `pg`, `redis` and `ws`, on a custom router with no Express.

**Do not write code for my hand-coded pieces**

These are mine, because the point of this project is to learn by building them:

- Loading and selecting rooms
- Logged-in user Context and logout logic
- The socket hook
- Message state, including history
- Room previews, room order and unread dot logic
- Connecting the "Message" button and group creation
- Reconnect logic
- Reducer tests

Give no code for these unless I explicitly hand that piece over. I propose the design first. If I'm stuck, answer conceptually and without code. You can review my code once it runs.

**Your jobs**

- The backend checklist and the UI work below.
- Build UI as display components that receive data and callbacks as props. They can hold small things like an input's text, but never messages or connection state.

**How to work with me**

I'm a junior developer, and I'm learning from this work.

- Before running commands, editing files or installing anything, explain what you'll do and wait for my approval.
- Never commit or push unless I ask. Never print or copy the contents of `.env` files.
- Ask me about the open decisions below before starting any work that depends on them.
- After each change, explain how it works and why, and say exactly what you tested and what you didn't.
- Comment each function above its definition, and explain non-obvious lines beside them in plain language. Don't use emojis or em dashes in comments.
- Match the style of the surrounding code.

## Before I start

- [x] Commit my Dashboard work
- [ ] Answer the open decisions (see "Backend work for AI")
- [ ] Review the draft message format
- [ ] Tell AI to start the backend work and split the Dashboard into display components

## The order

| # | I code this logic | What I should see working | AI handles | Finish by |
|---|---|---|---|---|
| 1 | Load rooms and select one | Real rooms replace "Ember Hearth", and clicking one opens it | Room list and header UI | Nov 8 |
| 2 | Logged-in user and logout | The app knows who I am, and I can log out | Logout button and profile UI | Nov 8 |
| 3 | Socket hook | Two browsers exchange live messages | Message bubbles and input UI | Nov 15 |
| 4 | Message state and history | Each room keeps its own messages, and older ones load with no duplicates | Loading display and scroll position | Nov 22 |
| 5 | Previews, room order and unread dot | New messages update the rooms list | Preview and dot styling | Nov 22 |
| 6 | Connect the "Message" button and group creation | I can start a DM from a friend and create a group | New-chat screens | Nov 29 |
| 7 | Reconnect (stretch goal) | The chat recovers after a dropped connection | Connection status UI | Nov 30 |

Only start row 7 if the socket hook worked by Nov 15 and message state worked by Nov 22.

## How each piece works

1. Tell AI what data the screen needs, so it can build or adjust the UI around it.
2. Write the logic myself.
3. Connect it to the UI and test it in the browser.
4. Move to the next row.

## Rules

- **My pieces:** I propose the design first. AI gives no code unless I explicitly hand that piece over, and I note any handover in my devlog.
- **When I'm stuck:** after about 45 minutes, I can ask a conceptual question. AI can review my code once it runs.
- **Reading:** read for about 30 minutes, then write something small and return to the docs with a specific question.
- **Sessions:** spend 5 minutes on the devlog, covering what stuck me and what got me unstuck.
- **AI's components:** they can keep small things like an input's text, but never messages or connection state.
- **Visuals:** no work on the fire effect or redesigns until the chat works.
- **Deadline:** feature work stops on December 1. AI finishes whatever is left.

## Features

- **Must-haves:** live direct messages, group chats, scroll-back history, reconnecting, logged-in user and logout, room previews, room reordering, and an unread dot.
- **Only if there's time:** sending -> sent status, full unread counts, typing indicators, online status, read receipts, and a settings page.
- **Cut:** attachments, conversation search, full multi-tab support, and encryption.

**Assumptions:**

- Clicking "Message" on a friend opens the existing DM instead of creating a duplicate.
- Groups can be created, but there's no adding or removing members, leaving, or renaming.
- Messages are text only and can't be edited or deleted.
- `/dashboard` has no dedicated route guard, since a failed request already redirects to login.
- There's no solution for users in more than the 50 rooms the socket loads at connect time.

## Backend work for AI

I review all of this. I must be able to explain every change to `WebsocketManager` and `WebsocketServer` before accepting it.

### Open decisions

I haven't decided these yet. Ask me before starting work that depends on them.

1. **How messages get sent.** The draft below assumes option A.
   - **A (recommended):** over the socket, and the server saves, then delivers to everyone. It builds on the existing code, but needs its own error messages, and login isn't rechecked while a socket stays open.
   - **B:** over HTTP POST, with the socket only delivering. Errors and expired logins are easier, but there are two paths to understand and the send code gets rewritten.
   - **C:** over the socket, delivering first and saving afterward. It's the fastest, but a message can be seen and then lost in a crash.
2. **Binary messages.** Remove msgpack support and use JSON only? Recommended: yes, because the frontend only uses JSON. The downside is slightly larger messages.
3. **Schema check.** Does a `messages` table already exist? Neither repo has any `CREATE TABLE` statements, so this needs a read-only query against the database in `.env`. Get my approval before running it.

### Draft message format

This is a draft until I've reviewed it. Fields use snake_case to match the backend.

**Client sends to server:**

```json
{
  "type": "message:send",
  "room_id": 12,
  "client_message_id": "a1b2c3",
  "content": "hey"
}
```

**Server sends to everyone in the room, including the sender:**

```json
{
  "type": "message:new",
  "client_message_id": "a1b2c3",
  "message": {
    "id": 481,
    "room_id": 12,
    "sender_id": 7,
    "sender_username": "kevin",
    "content": "hey",
    "created_at": "2026-11-01T18:22:04.123Z"
  }
}
```

**If sending fails, server sends to the sender only:**

```json
{
  "type": "message:error",
  "room_id": 12,
  "client_message_id": "a1b2c3",
  "code": "NOT_A_MEMBER",
  "error": "You are not a member of this room"
}
```

The codes are `INVALID_MESSAGE`, `NOT_A_MEMBER` and `SERVER_ERROR`.

**When a user is added to a new room, server sends to that user:**

```json
{
  "type": "room:new",
  "room": { "id": 15, "name": "Example", "room_type": "direct", "created_at": "2026-11-01T18:22:04.123Z" }
}
```

**REST endpoints use the same message shape:**

- `GET /rooms/:id/messages?limit=30&cursor=...` returns `{ "messages": [...], "newCursor": "..." }`, newest first. `newCursor` is `null` on the last page, like the existing rooms endpoint. Non-members get a 403.
- `GET /rooms` adds `last_message` to each room, which is `null` for an empty room.

**Rules:**

- Content is trimmed and must be 1-4000 characters.
- `client_message_id` is generated by the browser and never saved. It leaves room to add sending -> sent later without changing the format.

### Checklist

- [ ] Finalize the message format after my review
- [ ] Add a schema file to the backend that can create all the tables on a fresh database
- [ ] Set up a separate test database (`tests/api.test.js` currently uses the same `.env` connection as the app)
- [ ] Save messages to the database before delivering them
- [ ] History endpoint with cursor pagination, reusing `helpers/Cursor.js`
- [ ] Add message ID, sender and timestamp to delivered messages
- [ ] Deliver messages to the sender too (`fromRedisTransmitMessage` in `WebsocketManager.js` currently skips them)
- [ ] Fix `deleteUser` in `WebsocketManager.js` removing the user's room list when one socket closes (React `StrictMode` can trigger this)
- [ ] Attach socket listeners before the database calls in `WebsocketServer.js`, so early messages aren't dropped
- [ ] Remove the check in `WebsocketServer.js` that closes the socket when a message is just the word "close"
- [ ] Add newly created rooms to live connections and send `room:new`. This has to work across servers, and `socketManager` is currently private to `createWebSocketServer`, so propose an approach to me first
- [ ] Include each room's last message in the rooms response
- [ ] Return display names for DMs
- [ ] Prevent duplicate DMs
- [ ] Add WebSocket tests, starting with tests that reproduce the bugs above
- [ ] Set up Vitest on the frontend (I write the reducer tests myself)

None of the backend bugs above have been confirmed by running the code. They come from reading it, so the tests need to confirm them.

**My review of the message format only passes once I can answer these myself:**

1. How is a message matched to its confirmation?
2. What happens to a duplicate?
3. How do senders see their own message?
4. What does a failure look like?

## UI work for AI

- [ ] Split `src/pages/DashboardPage.tsx` into display components, such as a room list, chat header, message list and message input. Keep the current look.
- [ ] Keep my existing state and fetch code in `DashboardPage.tsx`, and don't move logic into the new components.
- [ ] Build each later screen when its row in "The order" comes up: message bubbles, loading display, scroll position, preview and dot styling, new-chat screens, and connection status.
- [ ] Don't change the fire effect or redesign anything until the chat works.

## Design notes for the hard parts

These are starting points. I still propose my own design first. AI agents shouldn't use these notes to write my pieces.

### Socket lifecycle

The socket must survive `StrictMode` opening, closing and reopening it. It must also survive tab changes and close on logout.

| Option | Upside | Downside |
|---|---|---|
| **Effect in a provider above the tabs (starting pick)** | Standard React approach, and teaches the most | I have to handle `StrictMode` and cleanup correctly |
| Plain client object outside React | Immune to re-renders, and resembles Angular services | I manage its lifetime by hand, and it teaches less React |
| WebSocket library | Fastest, often with reconnect included | Hides what I want to learn |

### Old values inside socket handlers

A handler created once can keep seeing the old selected room.

| Option | Upside | Downside |
|---|---|---|
| **Handler only dispatches events to the reducer (starting pick)** | The reducer always sees current state, and it's easy to test | All related logic must live in the reducer |
| Keep the latest value in a `useRef` | Small and flexible | Easy to forget, and the data flow is harder to follow |
| Re-create the handler when the value changes | Easy to understand | Constant re-subscribing, with a risk of missed events |

### Merging history and live messages

Older pages and live messages can arrive in any order and overlap. A history response can also arrive after I've switched rooms.

| Option | Upside | Downside |
|---|---|---|
| **One list per room, deduplicated by ID and sorted (starting pick)** | Simple, and order of arrival stops mattering | Relies on server IDs for order, and re-sorts on each insert |
| Separate history and live lists, joined when displayed | Easy to start | Overlaps and reconnects become messy |
| Messages stored by ID, plus an ordered ID list per room | Fast lookups, and makes later status updates easy | More code to keep in sync |

If every response is saved under its own room ID, a late response can't end up in the wrong room.

### Reconnecting

**Session 1: get the connection back**

1. Keep one status in the reducer: `connecting`, `open`, `reconnecting` or `closed`.
2. Tell intended closes apart from unexpected ones. Only unexpected closes retry.
3. Retry with growing delays, up to about 30 seconds, plus a little randomness. Reset after a successful connection.
4. Keep only one retry timer, and cancel it on logout and cleanup.
5. Disable sending while disconnected.

**Session 2: recover login and missed messages**

1. Call `/users/me` before each retry, so the interceptor can refresh an expired token.
2. On success, open the socket. On `SESSION_EXPIRED`, stop retrying. On a network error, keep retrying.
3. After reconnecting, refetch the newest page for the open room and the rooms list. Other rooms refetch when opened.

**Question to work out myself:** should the catch-up fetch run before or after the socket opens? One order can lose messages.

**Reconnect tests** (add a development-only "drop connection" button with a long retry delay):

| Test | Expected result |
|---|---|
| Drop connection, then send from a second browser | Message appears after reconnecting, exactly once |
| Delete the access cookie in DevTools, then drop connection | Login refreshes and the socket reconnects |
| Delete both cookies, then drop connection | Redirects to login and retries stop |
| Log out during a retry | No further attempts |
| Stop the backend for a few minutes | Delays grow, then it recovers on restart |

**Known limit:** browser code can't see the server's pings, so a silently dead connection might not be noticed for a while. Fixing that needs a client-side heartbeat, which is out of scope.

## How I'll know it worked

- [ ] I wrote a scenario list before coding, and it all passes (two browsers, a dropped connection, history)
- [ ] I wrote 5-8 reducer tests, such as "a duplicate message is ignored" and "a history page merges in the right order"
- [ ] I rebuilt the socket hook and reducer from a blank file, using docs only (only counts for pieces I wrote myself)
- [ ] I found at least one real problem in AI's backend code during review

## December

1. **December 1:** feature work stops, and AI finishes whatever is left.
2. **First December session:** the blank-file rebuild.
3. **After that:** deploy, with AI guiding me or on my own.
4. **In my own time:** study the AI-written code, including the refresh interceptor and friendship code.

**Deployment problem to fix:** `server.js` and `RedisConnector.js` read local certificate files at startup, and those files are gitignored, so the server would crash on a fresh host without changes.

**Still to decide in December:**

- How many servers to run
- The date this project officially ends, so the ML project can start
