# Messages View Redesign: Design Brief

Decided on 2026-11-11 through a grilling session, then revised the same day after the first mockups read as too plain. The revised design below is implemented.

## Revision 2 (implemented): things near the fire are warm, and rise and cool as they age

These replace the matching rows in the table further down.

- **No glowing dots anywhere.** No unread dot, status dot or toast dot. The hearth's drifting embers and entrance sparks are switched off on this screen with `data-hearth-calm`; the Friends screen keeps them.
- **Room list = the cooling scale.** A hand drawn charcoal axis with "now" at the bottom by the fire and "10 min", "1 hour", "1 day", "1 week" above it on a log scale. Each room is an irregular coal lump (`lumpShape`) sitting on the axis at the height of its last activity, so the gaps show how much time passed. Unread is said in words: the name runs hot and the time becomes "new".
- **Conversation = the spine.** A rough charcoal line runs from the masthead's rule down into the fire, ash above and ember at the bottom. Other people's messages hang left of it, yours right, each joined by a short tick that cools. Times sit against the spine on the opposite side like marks on a ruler. Day breaks cut across it in large italic serif.
- **Your messages lose the charcoal block** (changes Q3). The side of the spine already says who wrote it.
- **Moments.** Send and arrive: a streak of heat runs up the spine from the fire, the tick draws out, the words kindle in; an arrival also calls `hearth.flare()`. Room switch: the spine regrows from the fire. New group: its coal catches on the scale.
- **Fire.** `HearthProvider` gained a `bed` shape (`data-hearth-shape="bed"`): a wide pool of floor light, a row of coals and low flames along the bottom of the stage.
- **Masthead.** Room name at 56px Fraunces with two small capital facts (type, last word or connection state) and a rough rule.
- **Composer.** "To <room>" in small capitals, an italic serif placeholder, and a Send plate that heats to ember when there is text.
- **Toast.** Room in small capitals, sender in italic serif, and a heat line along the bottom that burns down over the toast's lifetime.
- **Create Group.** Friends wait on an arc around a low glow; choosing one moves them inward and gives their coal its Friends screen warmth.

## The concept: embers that cool

Heat means recency, the same idea the Friends screen already uses for coals. A message arrives hot and cools to charcoal. The newest lines sit at the bottom of the chat, lit from below by a low bed of embers, and older lines read as cooler and darker above them. The typography is borrowed from an editorial "transcript" idea: large serif day breaks and messages grouped by speaker.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Concept | Embers that cool, with transcript typography (serif day breaks, speaker grouping) |
| 2 | Features | No new features. Visual redesign only. Day breaks and speaker grouping count as visual, because they only re-present `created_at` and `sender_id` |
| 3 | Scope | Everything in the Messages tab: room list, chat header, message stream, composer, send error, both empty states, toast, Create Group modal, page error banner |
| 4 | Phones | Desktop gets the effort. Phones keep the current stacked layout but nothing may overflow or overlap at 390px, and the bed and effects scale down |
| 5 | Effects budget | Signature moments only. Everything else is quiet hover and press feedback |
| 6 | Layout | "One room, ledger margin": no panels. The room list is a typographic margin on the left, separated by space and type, not a box. The conversation is a centred reading column (about 640px) rising out of the ember bed. At 1024px the margin narrows |
| 7 | Message shape | Left/right kept, bubbles dropped. Their messages: plain text on the left, name once per group in small caps, a thin heat line in the gutter that cools. Your messages: right side, charcoal block whose right edge carries the heat |
| 8 | Cooling time | About one hour, for messages AND for rooms in the list (same clock). Accepted consequence: outside a live chat most rooms look cold, so the time label and unread flicker carry the rest |
| 9 | Cooling technique | Pure CSS. Each message gets an animation as long as the cooling period, started part way through with a negative `animation-delay` equal to its age. No timers, no re-renders |
| 10 | Moments | All four, in two tiers. Full: send (a spark arcs from the send coal into the new message) and arrive (the message lands hot and the bed flares). Light: room switch (the stream dips and returns within about 250ms, rapid switching never queues) and new conversation (its coal catches in the list with a small burst) |
| 11 | Fire placement | A low ember bed along the bottom of the chat, behind the composer. Needs a new "bed" fire shape in `HearthProvider`, which today only draws one round fire centred on an element |
| 12 | Room list rows | Coals, like the Friends screen. Each room is a coal with its initial, coloured by how recent its last activity is. Unread rooms flicker. A group shows two overlapping coals |
| 13 | Composer | A charcoal slab floating above the bed, firelight around its edges, italic serif placeholder, the send button is a coal that warms once there is text |
| 14 | Chat header | A chapter title: room name large in Fraunces (about 40px), one meta line under it such as "Group · active 4 min ago". When the connection drops, the meta line shows the connection status instead |
| 15 | Empty states | No room selected: the full fire burns alone in the middle with one line. Room with no messages: the bed only smoulders as kindling, and the first message lights it |
| 16 | Toast | Restyled to the system: top right, sender's coal, heat edge. The same room's coal flares in the list at the same moment |
| 17 | Create Group modal | Restyled to the system. Each friend is shown as their coal from the Friends screen (coloured by `friendWarmth`), and picking one lights it |
| 18 | Accessibility | Fully cooled text still meets 4.5:1. Reduced motion turns off every spark, flare and cooling animation, and messages show a static colour. Every control keyboard reachable with a visible focus ring |
| 19 | Look | Palette and fonts unchanged: ember orange, charcoal, Fraunces and Outfit. No new colours |

## Constraints carried from PLAN.md

- Display components receive data and callbacks as props. They may hold small UI state (draft text, search text, which modal is open) but never messages or connection state.
- Grouping, day breaks and heat are worked out inside the display components from the props they already get. `chatReducer` and `MessagesView` logic do not change.
- Comment style follows the project rules: a comment above each function, plain-language comments beside non-obvious lines, no emojis or em dashes in comments.

## Implementation notes for later

- Heat curve: reuse the stop-based colour blending idea from `features/friends/utils/heat.ts`, expressed as CSS keyframe stops so the browser does the cooling.
- `HearthProvider` needs a second fire shape (a wide, low bed) and a way to flare it on demand, alongside the existing `burst` and `emberArc`.
- The send spark can use the existing `hearth.emberArc` from the send button to the new message's position.
- The stream uses a reversed flex column so it starts at the newest message without extra scroll code; the existing `MessageList` scroll logic stays the source of truth if that changes.

## Mockups

Interactive mockups of the decided design and the alternative options live in a private Design canvas: https://claude.ai/artifact/UPtYs4XWFTpt1JAPkP1xpP
