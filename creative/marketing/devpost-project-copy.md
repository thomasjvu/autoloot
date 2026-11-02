# Devpost project copy

## Elevator Pitch

Turn your Twitch stream into a live shop. Run chat-powered auctions, manage orders, and let Munny, your optional AI cohost, help host the show—at your pace.

## About the Project

### Inspiration

Live selling should feel like a show, but the creator is also juggling inventory, chat bids, auction timers, payments, and shipping. We built Autoloot to bring those tasks into one workspace and give streamers a cohost who can help keep things moving.

### What it does

Autoloot turns a Twitch channel into an interactive live shop. Creators build a lineup, run auctions or fixed-price sales, and publish an OBS overlay so viewers can follow the action. Chat can bid and vote for the next lot, while buyers use a storefront to access their own private orders and checkout.

Munny, the optional AI cohost, adds personality and practical help. She can assist with listing drafts and hosting, and creators can customize her name, tone, avatar, and voice. Sellers choose their pace: lead the show themselves, approve each lot, or run a bounded queue of preapproved items.

After the sale, Autoloot brings orders, payment status, shipping, and recorded costs into the same workspace.

### How we built it

We built Autoloot as an open-source, local-first application using Node.js, SQLite, and a browser-based interface, with integrations for Twitch, OBS overlays, Stripe Checkout, and configurable AI providers.

Codex helped us implement and review the creator-to-buyer journey, refine the interface, and develop automated regression tests. We kept a clear boundary between AI assistance and commerce: AI can suggest content and help host, while application code enforces bid rules, auction deadlines, permissions, and verified payment state.

### Challenges we ran into

A live sale spans several systems that do not update at the same time: Twitch chat, the broadcast, the seller workspace, buyer sessions, and payment events. The challenge was making those pieces agree without exposing private order information or treating a checkout redirect as proof of payment.

We addressed that with server-authoritative auction state, private buyer sessions, retry-safe requests, and verified payment events.

### Accomplishments that we're proud of

We brought the show and its operational work into one coherent flow: prepare a lot, involve chat, run the auction, collect payment, and manage fulfillment. We also gave that workspace a recognizable personality through Munny, while keeping creators in control of how much help they want.

### What we learned

The most useful AI cohost needs more than a personality. It needs clear permissions, useful context, and dependable application rules behind every action. We also learned that the buyer journey deserves as much attention as the on-stream experience: a winning bid is only the beginning of an order.

### What's next for Autoloot

Autoloot is currently a single-streamer pre-beta. Our next step is a creator pilot focused on setup, audience participation, and completing the buyer journey reliably. Live sales require configured provider accounts and real-account rehearsals; practice flows and automated tests support development but do not replace those checks.
