# SUI Melodify – Frontend Build Plan (Hackathon MVP, 2 Days)

---

## 1️⃣ Frontend Architecture Overview

### App Structure

```
src/
├── pages/
│   ├── HomePage.tsx          → Entry point, wallet connect, nav
│   ├── UploadPage.tsx         → Music file upload form
│   ├── MyMusicPage.tsx        → User's published tracks
│   ├── DiscoverPage.tsx       → Browse all music
│   ├── ListenPage.tsx         → Individual track player
│   └── ProfilePage.tsx        → User stats (revenue, listens)
├── components/
│   ├── Web3/
│   │   ├── WalletConnectButton.tsx
│   │   ├── TransactionLoader.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── BalanceDisplay.tsx
│   ├── Player/
│   │   ├── AudioPlayer.tsx    → Main player (wavesurfer)
│   │   ├── PlayButton.tsx
│   │   ├── ProgressBar.tsx
│   │   └── VolumeControl.tsx
│   ├── Music/
│   │   ├── MusicCard.tsx      → Track preview card
│   │   ├── MusicForm.tsx      → Generate form
│   │   └── MusicList.tsx      → Grid/list of tracks
│   └── Common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       ├── Modal.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useWallet.ts           → @mysten/dapp-kit wrapper
│   ├── useSuiClient.ts
│   ├── useTransactionBuilder.ts
│   ├── useListenCap.ts        → SEAL-gated auth logic
│   ├── useAudioPlayer.ts      → wavesurfer wrapper
│   └── useMusic.ts            → Fetch music data
├── services/
│   ├── suiClient.ts           → RPC client instance
│   ├── backendAPI.ts          → HTTP calls to backend
│   ├── cryptoService.ts       → Decryption (SEAL)
│   └── transactionService.ts  → Tx building logic
├── store/
│   ├── auth.ts                → Wallet state (Zustand)
│   ├── music.ts               → Music list cache
│   ├── player.ts              → Audio player state
│   └── ui.ts                  → UI state (modals, etc)
├── types/
│   ├── music.ts
│   ├── transaction.ts
│   ├── seal.ts
│   └── api.ts
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   ├── constants.ts
│   └── errors.ts
├── App.tsx
└── main.tsx
```

### State Management Strategy

**Tool:** Zustand (lightweight, no boilerplate)

**Stores:**

- **auth.ts** – Wallet address, connected flag, public key
- **music.ts** – Music list, current track metadata (from blockchain)
- **player.ts** – Play state, current time, volume, current track
- **ui.ts** – Modal states, loading flags, toast messages

**Data Fetching:** React Query

- Cache music list (5-min stale time)
- Refetch after publish/payment
- Handle errors globally

**Why Zustand?** Fast, minimal setup, perfect for hackathon. No Redux boilerplate.

### On-Chain vs Off-Chain Data Flow

| Data                                      | Source                          | Cache              | Refresh                |
| ----------------------------------------- | ------------------------------- | ------------------ | ---------------------- |
| **Wallet balance, address**               | On-chain (RPC)                  | Zustand            | 10s interval           |
| **Music metadata (title, author, price)** | Move objects (RPC query)        | React Query        | 5 min or after publish |
| **Encrypted audio URL**                   | Backend (after ListenCap check) | Memory (1 session) | Per play session       |
| **User's listen count, revenue**          | Move objects (RPC query)        | React Query        | 5 min                  |
| **Generation status**                     | Backend (websocket or polling)  | Memory             | Real-time or 2s poll   |

**Frontend as orchestrator:**

1. User initiates action (generate, publish, pay)
2. Frontend builds tx, user signs
3. Backend listens to events (optional) OR frontend polls RPC
4. UI updates based on on-chain state

---

## 2️⃣ Page / Screen Breakdown

### **HomePage** (Route: `/`)

**Purpose:** Entry point, wallet connection, app navigation

**Components:**

- Header with WalletConnectButton
- Hero section with app description
- Quick action buttons: "Upload Music" → `/upload`, "Explore" → `/discover`
- If connected: Show user's balance, link to `/my-music`

**On-Chain Interactions:**

- Check wallet connection status (zkLogin or Sui Wallet)
- Fetch user's SUI balance
- Query user's published tracks count (opt: show preview)

**UX:** If wallet not connected, emphasize "Connect Wallet" CTA. Once connected, show quick stats.

---

### **UploadPage** (Route: `/upload`)

**Purpose:** Music file upload form

**Components:**

- MusicForm (file upload input, title input, description input, price slider, genre select)
- File preview + waveform visualization
- "Publish to Chain" button (after file selected)

**Flow:**

1. User selects audio file (MP3, WAV, etc.)
2. Frontend displays waveform preview of uploaded file
3. User fills metadata: title, description, price, genre
4. Frontend computes SHA256 hash of audio file
5. Click "Publish" → calls `publishMusic()` tx
6. Backend stores audio file + receives audioHash
7. On success: redirect to `/my-music/{objectId}`

**On-Chain Interactions:**

- `publishMusic(title, description, price, audioHash)` – Creates Music object, emits event
- Frontend polls RPC to confirm object created
- On success: redirect to `/listen/{objectId}`

**Error Handling:**

- File too large (>50MB) → show error message
- Unsupported format → show error message
- Tx failure → show error toast + keep audio in cache
- Network error → show offline message

---

### **MyMusicPage** (Route: `/my-music`)

**Purpose:** User's published tracks dashboard

**Components:**

- MusicList (grid view of user's tracks)
- For each track: MusicCard showing:
  - Cover image (hash-derived placeholder)
  - Title, description
  - Listen count (on-chain)
  - Revenue (on-chain)
  - Play button
  - "Edit price" button (optional, not MVP)

**On-Chain Interactions:**

- Query Move objects: `Music` where `creator == userAddress`
- Fetch field: `listen_count`, `revenue`, `price`
- Subscribe to `MusicPublished` event (or poll every 5s after publish)

**UX:** Empty state if no tracks. Show "Generate your first track" CTA.

---

### **DiscoverPage** (Route: `/discover`)

**Purpose:** Browse all published music

**Components:**

- Filter bar (genre, sort by listens/new)
- MusicList (grid of all tracks)
- Each card: Title, creator, price, listen count, play button

**On-Chain Interactions:**

- Query Move: All `Music` objects (paginated, ~20 per page)
- Fetch: Title, price, creator, listen_count

**Optimization:**

- Cache results for 5 min
- Pagination (cursor-based or offset)
- Lazy load images

**UX:** Show "Most Listened" as default sort.

---

### **ListenPage** (Route: `/listen/:musicId`)

**Purpose:** Individual track player, pay-to-listen

**Components:**

- AudioPlayer (primary)
- Track metadata (title, creator, stats)
- PaymentPanel (if user hasn't paid OR no ListenCap)
- Player controls (play, pause, progress, volume)

**UX Flow:**

1. **User arrives (not paid):**
   - Show track info + price
   - AudioPlayer shows locked state
   - "Pay to Listen" button

2. **User clicks "Pay to Listen":**
   - Call `payToListen(musicId, price)` tx
   - User signs tx
   - Backend confirms payment received
   - Backend returns `ListenCap` (proof of payment)
   - Frontend stores ListenCap in memory

3. **User can now play:**
   - AudioPlayer unlocked
   - Frontend sends ListenCap to backend: `GET /api/audio/{musicId}?cap=<listenCap>`
   - Backend decrypts audio, streams MP3
   - Frontend plays via wavesurfer

4. **User leaves, comes back:**
   - ListenCap lost (in-memory)
   - User must pay again

**On-Chain Interactions:**

- `payToListen(musicId)` – Calls `pay_listen()`, backend creates `ListenCap` Move object
- Frontend confirms tx settled, calls backend for decryption

**Error Handling:**

- Payment fails → show error, allow retry
- Audio stream fails → show "Stream unavailable"
- User closes tab → ListenCap expires (design choice: acceptable for MVP)

---

### **ProfilePage** (Route: `/profile`)

**Purpose:** User stats and account

**Components:**

- User balance (SUI)
- Total revenue earned
- Total listens across tracks
- Number of tracks published
- Logout button

**On-Chain Interactions:**

- Fetch wallet balance
- Sum all `Music.revenue` for this creator
- Sum all `Music.listen_count`
- Count `Music` objects owned by user

**UX:** Simple dashboard, minimal interaction.

---

## 3️⃣ User Journey (Happy Path)

### **Day 1 Demo – Full Flow (3 min)**

```
1. Visitor arrives at HomePage
   → Sees: Hero, "Connect Wallet" button

2. Clicks "Connect Wallet"
   → Opens zkLogin or Sui Wallet modal
   → Selects OAuth provider (Google, etc)
   → Wallet connects
   → HomePage shows balance + "Upload Music" CTA

3. Clicks "Upload Music"
   → Navigate to UploadPage
   → Selects audio file from device
   → Waveform preview displays
   → Fills form: title="My Track", description="Cool song", price=0.5 SUI, genre="Pop"
   → Clicks "Publish to Chain"

4. Waits for file hash computation + tx signing
   → Signs tx: publishMusic(title, description, price=0.5 SUI, audioHash)
   → Tx succeeds, Music object created
   → Shows toast: "Music published!"
   → Redirects to ListenPage for published track

5. On ListenPage (own track, free to play):
   → Shows track info
   → Clicks Play
   → Audio streams and plays
   → Show waveform + progress bar

6. Clicks "Explore"
   → DiscoverPage shows all tracks
   → Filters by genre
   → Sees own published track + others (mocked: hardcoded tracks)

7. Clicks on another user's track
   → ListenPage for that track (price=0.5 SUI)
   → Shows "Pay to Listen" button
   → Clicks it
   → Signs tx: payToListen(musicId)
   → Tx succeeds
   → AudioPlayer unlocked
   → Clicks Play
   → Audio streams and plays

8. Clicks "Profile"
   → Shows stats: 1 track published, 1 listen earned, 0 SUI revenue (not yet settled)

9. Clicks "My Music"
   → Shows own published track
   → Stats show listen_count=1, revenue=0.5 SUI

**Total time:** 3 min (if AI generation is fast-tracked)
```

---

## 4️⃣ Component Breakdown

### **Web3 Components**

| Component               | Purpose              | Inputs              | Outputs                |
| ----------------------- | -------------------- | ------------------- | ---------------------- |
| **WalletConnectButton** | Connect/disconnect   | Callback: onConnect | Connected address      |
| **TransactionLoader**   | Tx progress modal    | Show flag, tx hash  | Spinner + hash display |
| **ErrorBoundary**       | Catches React errors | Children            | Error UI + retry       |
| **BalanceDisplay**      | Shows SUI balance    | Refresh interval    | Balance, formatted     |

### **Player Components**

| Component         | Purpose            | Props                          | Events                          |
| ----------------- | ------------------ | ------------------------------ | ------------------------------- |
| **AudioPlayer**   | Main player widget | url, isLocked, onPlay, onPause | Play, pause, seek, volumeChange |
| **PlayButton**    | Play/pause toggle  | isPlaying, onClick             | Click                           |
| **ProgressBar**   | Timeline + seek    | duration, currentTime, onSeek  | Seek to position                |
| **VolumeControl** | Volume slider      | volume, onChange               | Volume change                   |

**Tech:** wavesurfer.js – Declarative wrapper in `useAudioPlayer` hook

### **Music Components**

| Component     | Purpose             | Props                | Events                |
| ------------- | ------------------- | -------------------- | --------------------- |
| **MusicCard** | Track preview       | music, onPlay, onPay | Click play, click pay |
| **MusicForm** | Upload form         | onSubmit             | Submit with formData  |
| **MusicList** | Grid/list of tracks | tracks, onCardClick  | Card click            |

### **Common UI Components**

| Component   | Purpose                                            |
| ----------- | -------------------------------------------------- |
| **Header**  | Nav, wallet button, balance                        |
| **Sidebar** | Route links (Generate, Explore, My Music, Profile) |
| **Modal**   | Generic modal wrapper (payment, errors, etc)       |
| **Toast**   | Notification (success, error, pending)             |

### **Reusable Hooks**

| Hook                      | Purpose                             | Returns                                               |
| ------------------------- | ----------------------------------- | ----------------------------------------------------- |
| **useWallet**             | Wrapper: connected, address, signTx | { address, isConnected, signTransaction }             |
| **useSuiClient**          | RPC client instance                 | SuiClient                                             |
| **useTransactionBuilder** | Tx building utils                   | { buildPublishMusic, buildPayToListen, buildPayment } |
| **useListenCap**          | ListenCap state + validation        | { listenCap, isValid, setListenCap }                  |
| **useAudioPlayer**        | Wavesurfer wrapper                  | { play, pause, seek, volume, duration, currentTime }  |
| **useMusic**              | Fetch music data (React Query)      | { music, isLoading, error, refetch }                  |
| **useFileUpload**         | Handle file upload + validation     | { file, isLoading, error, uploadFile, clearFile }     |

---

## 5️⃣ Transaction Flow

### **Tx #1: Publish Music**

**User Action:** Click "Publish" on GeneratePage after AI generation

**Data Required:**

- `title` (string, user input)
- `description` (string, user input)
- `price` (u64, in MIST, default 0.5 SUI = 500_000_000 MIST)
- `audioHash` (hash of audio file, computed by frontend)
- `creator` (wallet address, auto-filled)

**Tx Building Logic:**

```
1. Get creator wallet address from dapp-kit
2. Compute SHA256 hash of audio buffer
3. Call Move: publishMusic(
     title: string,
     description: string,
     price: u64,
     audioHash: vector<u8>
   )
4. Build TransactionBlock with Move call
5. User signs (enoki session key or manual)
6. Backend listens for MusicPublished event OR frontend polls `getObject(objectId)`
```

**What User Sees:**

- "Publishing..." spinner
- Tx hash (optional)
- On success: Toast + redirect to ListenPage

**Error Handling:**

- Gas insufficient → "Insufficient gas. Please top up."
- Tx rejected → "Transaction rejected. Try again."
- RPC down → "Network error. Try again."
- Timeout (30s) → "Tx pending. Check explorer."

---

### **Tx #2: Pay to Listen**

**User Action:** Click "Pay to Listen" on ListenPage (for tracks user hasn't paid for)

**Data Required:**

- `musicId` (object ID of Music object)
- `price` (u64, read from Music object)
- `payment` (Coin<SUI>, user's wallet)

**Tx Building Logic:**

```
1. Fetch Music object to read price
2. Get user's SUI coins (split if needed for exact amount)
3. Call Move: pay_listen(
     music: Music,
     payment: Coin<SUI>
   )
4. Move returns: ListenCap (proof of payment)
5. User signs tx
6. On success: Backend confirms ListenCap created
7. Frontend stores ListenCap in-memory
8. Frontend calls backend: GET /api/audio/{musicId}?cap={listenCapBytes}
9. Backend decrypts audio, returns MP3 stream URL
10. wavesurfer plays from URL
```

**What User Sees:**

- "Processing payment..." + amount
- Tx hash
- On success: AudioPlayer unlocked, auto-play starts
- On failure: "Payment failed. Try again."

**Error Handling:**

- Insufficient balance → "Not enough SUI. Need 0.5 SUI."
- Tx rejected → Standard reject message
- ListenCap creation fails → "Payment failed, contact support"
- Audio stream fails → "Audio unavailable"

---

### **Tx #3: Setup Payment (Optional, Advanced)**

**Only if using `@mysten/payment-kit`:**

**Purpose:** Abstract payment complexity (splitting coins, gas, etc)

**Logic:**

```
1. PaymentKit handles coin selection
2. Builds tx to pay exact amount
3. User signs
4. On chain: payment settled, ListenCap created
```

**If using:** Keep logic in `transactionService.ts`, wrap in `useTransactionBuilder` hook.

---

## 6️⃣ SEAL-Gated Audio Playback Strategy

### **Constraint:** Audio is encrypted on-chain, only decryptable with ListenCap proof

### **Flow:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER PAYS & RECEIVES ListenCap (Move object)         │
│    - Stored on-chain, owned by user                     │
│    - Proves user paid for listen                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. FRONTEND RETRIEVES ListenCap (RPC)                   │
│    - Query user's owned objects by type                 │
│    - Extract ListenCap object ID + capabilities        │
│    - Store in memory (not localStorage)                 │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. FRONTEND SENDS ListenCap TO BACKEND                  │
│    - Request: GET /api/audio/{musicId}                  │
│    - Header: X-Listen-Cap: {objectId}                   │
│    - Backend validates ListenCap exists & is valid      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. BACKEND DECRYPTS AUDIO                               │
│    - Use ListenCap capabilities to decrypt              │
│    - Stream MP3 to frontend                             │
│    - Log access for analytics                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. FRONTEND PLAYS AUDIO (wavesurfer)                    │
│    - Load from stream URL                               │
│    - Play controls (play, pause, seek)                  │
│    - Do NOT cache to IndexedDB or localStorage          │
└─────────────────────────────────────────────────────────┘
```

### **ListenCap Lifecycle (MVP)**

| Event                             | Action                             | Storage                           |
| --------------------------------- | ---------------------------------- | --------------------------------- |
| User pays                         | Create ListenCap on-chain          | On-chain (Move)                   |
| Frontend receives tx confirmation | Query RPC for ListenCap            | Memory (Zustand)                  |
| User plays audio                  | Send ListenCap to backend          | HTTP header                       |
| User closes tab                   | ListenCap lost from memory         | ❌ (By design: re-buy on revisit) |
| User refreshes page               | Query RPC again, restore ListenCap | Memory                            |

**Why in-memory only?**

- Prevents persistent cached audio on user's device
- Limits ListenCap replay attacks
- Simplifies UX (no persistent state management)
- Trade-off: Users must re-buy if they close tab (acceptable for MVP)

### **Prevent Download (Frontend-Level)**

**Techniques:**

1. **No right-click context menu:**

   ```html
   <audio onContextMenu="{(e)" ="">e.preventDefault()} /></audio>
   ```

2. **Disable download attribute:**

   ```html
   <audio controls downloadButton="{false}" />
   ```

3. **Stream-only (no full download):**
   - Backend streams in chunks (not full file)
   - Frontend plays chunks as they arrive
   - Chunks not cached to disk

4. **CORS + CSP:**
   - Backend sets `Access-Control-Allow-Origin` to frontend domain only
   - Headers prevent credential theft

5. **Clear buffer after play:**
   - wavesurfer.js keeps audio in memory only during playback
   - Does not persist between sessions

**What NOT to do:**

- ❌ Store ListenCap in localStorage (too persistent)
- ❌ Download full audio file to user's device
- ❌ Disable right-click entirely (bad UX)

**Reality:** Motivated users can always capture audio from browser. Goal is **friction**, not security.

---

## 7️⃣ 2-Day Build Timeline (Hour-Level)

### **Day 1: Core Architecture & Flows (8 Hours)**

| Hour | Task                                                                      | Owner   | Deliverable                              |
| ---- | ------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| 1    | Setup: TypeScript config, Tailwind, Zustand, React Query                  | FE      | `src/store`, `src/hooks` scaffolding     |
| 2    | Auth: Wallet connect + `useWallet` hook                                   | FE      | WalletConnectButton component, sign flow |
| 3    | Pages: HomePage, UploadPage, ListenPage (UI only)                         | FE      | 3 pages, routing works                   |
| 4    | Player: wavesurfer integration, `useAudioPlayer` hook                     | FE      | AudioPlayer component, play/pause/seek   |
| 5    | Upload: File upload handler + waveform preview, `useFileUpload` hook      | FE      | File upload, hash computation works      |
| 6    | Tx building: `publishMusic` tx builder with audioHash                     | FE + BE | Tx signs, confirmed on-chain             |
| 7    | Music list: Query Move objects, cache in React Query                      | FE + BE | DiscoverPage shows tracks (mock data OK) |
| 8    | Audio streaming: Backend endpoint `/api/audio/{id}?cap=X`, frontend plays | FE + BE | Play gated audio end-to-end              |

**End of Day 1:** User can generate (mocked), publish, discover, and pay-to-listen. Audio streams.

### **Day 2: Polish & Demo (8 Hours)**

| Hour | Task                                                             | Owner | Deliverable                         |
| ---- | ---------------------------------------------------------------- | ----- | ----------------------------------- |
| 1    | Error states: Handle tx failures, network errors gracefully      | FE    | Error messages, retry flows         |
| 2    | Loading states: Spinners, progress bars, "pending" UI            | FE    | Professional loading experience     |
| 3    | MyMusicPage & ProfilePage: User stats + list                     | FE    | User can see revenue, listen counts |
| 4    | Mobile responsiveness: Tailwind breakpoints                      | FE    | Works on phone + tablet             |
| 5    | UX polish: Toast notifications, modals, transitions              | FE    | Smooth animations, no jank          |
| 6    | File upload validation: Format/size checks, user-friendly errors | FE    | Robust file handling                |
| 7    | Demo script: Practice flow, prepare talking points               | PM    | Slides, demo video (1 min)          |
| 8    | Bug fixes, edge cases, final polish                              | FE    | Deploy to testnet, go live          |

**End of Day 2:** Fully functional MVP, demo-ready, all flows tested.

---

## 8️⃣ Demo-Ready Checklist

### **Must Work Live**

- [ ] Wallet connect (zkLogin or Sui Wallet)
- [ ] Wallet balance displays
- [ ] Navigate between all pages (no crashes)
- [ ] Upload music file → shows waveform preview
- [ ] Publish music → tx signs, object created, appears in MyMusic
- [ ] Browse discover page (see all tracks)
- [ ] Click track → play audio (your own track, no payment needed)
- [ ] Pay to listen to another track → tx signs, ListenCap created
- [ ] Play paid track (audio streams, progress bar works)
- [ ] Profile page shows stats (total revenue, listens, tracks)
- [ ] Error handling: Show message if tx fails, not crash

### **Can Be Mocked/Hardcoded**

- [ ] File size validation (accept files up to 50MB)
- [ ] Audio encryption (placeholder: no real crypto, just serve MP3)
- [ ] ListenCap validation (backend trusts frontend for MVP)
- [ ] Full on-chain state sync (one-time query per page load OK)
- [ ] Mobile responsiveness (nice-to-have, focus on desktop)

### **Do NOT Demo**

- [ ] Remix
- [ ] Marketplace
- [ ] Badge system
- [ ] Download (explicitly do not show)
- [ ] Real-world scale (OK to slow refresh, pagination not needed)

---

## 9️⃣ UX Principles for Judges

### **What to Highlight Visually**

1. **Wallet Integration:**
   - "See, you never leave the app to pay. Click, sign, play."
   - Emphasize one-tap payment UX

2. **On-Chain Music Objects:**
   - "Each track is a real object on-chain. Check here." (point to tx hash)
   - Show listen count incrementing live (if possible)

3. **SEAL-Gated Audio:**
   - "This audio is encrypted. You can only decrypt with proof of payment."
   - Play locked → pay → play unlocked (dramatic flow)

4. **Real Ownership:**
   - "You own your tracks on-chain. Move them, sell them, remix them (later)."
   - Show object ID, creator field

### **What to Hide**

- [ ] Raw Sui addresses (show short form: `0x1234...5678`)
- [ ] ListenCap object details (users don't care)
- [ ] Gas calculations (show total, not breakdowns)
- [ ] RPC errors (show user-friendly messages only)
- [ ] Loading spinners for <500ms (instant = feels native)

### **How to Explain Flows in <3 Minutes**

**Pitch (60 seconds):**

> "Melodify is AI music + blockchain. You generate a track in seconds, publish it on-chain for real ownership, then other users pay to listen. The audio is encrypted, so without proof of payment, you can't play it. It's like Spotify + blockchain."

**Demo Flow (2 minutes):**

1. Connect wallet (15s) – "I'm authenticating with zkLogin"
2. Upload music (20s) – "I select an audio file from my device and fill in the metadata"
3. Publish (30s) – "I sign one transaction and the track is on-chain, immutable"
4. Pay to listen (30s) – "I pay 0.5 SUI, backend returns encrypted audio, I can now play it"
5. Show stats (15s) – "Here's my revenue and listen count, updating from the blockchain"

**Key talking points:**

- "Every action is a blockchain transaction. You own your music."
- "Audio is streamed, not downloadable. SEAL encryption ensures only paid listeners can hear it."
- "Backend handles AI. Frontend builds transactions and plays audio."
- "This is an MVP. Future: remixes, marketplace, badges."

**Visual cues during demo:**

- Keep wallet button visible ("See, still connected")
- Show tx hashes in explorer ("Proof on-chain")
- Highlight waveform when playing ("Real audio, real time")
- Point to object IDs ("That's your music, forever on-chain")

---

## 📋 Summary: Implementation Checklist

### **Architecture**

- [ ] Zustand stores created (auth, music, player, ui)
- [ ] React Query setup (5-min stale time for music)
- [ ] Routing configured (React Router v6)
- [ ] Hooks folder structure established

### **Pages**

- [ ] HomePage (wallet connect, hero, nav)
- [ ] UploadPage (file upload, metadata form, publish button)
- [ ] DiscoverPage (music grid, filters)
- [ ] ListenPage (player, payment, stats)
- [ ] MyMusicPage (user's tracks)
- [ ] ProfilePage (user stats)

### **Components**

- [ ] WalletConnectButton
- [ ] AudioPlayer (wavesurfer wrapper)
- [ ] MusicCard, MusicForm, MusicList
- [ ] TransactionLoader, ErrorBoundary
- [ ] Header, Sidebar, Modal, Toast

### **Hooks**

- [ ] useWallet (dapp-kit wrapper)
- [ ] useAudioPlayer (wavesurfer)
- [ ] useTransactionBuilder (tx logic)
- [ ] useListenCap (cap state)
- [ ] useMusic (React Query)
- [ ] useFileUpload (file handling + hash computation)

### **Services**

- [ ] suiClient (RPC instance)
- [ ] backendAPI (HTTP client)
- [ ] transactionService (tx builders)

### **Transactions**

- [ ] publishMusic tx builder + signing
- [ ] payToListen tx builder + signing
- [ ] Balance queries

### **Player**

- [ ] Load audio from streaming URL
- [ ] Play, pause, seek controls
- [ ] Progress bar + time display
- [ ] Volume control

### **Testing**

- [ ] Manual test: All pages load
- [ ] Manual test: Wallet connect works
- [ ] Manual test: Tx signing works (testnet)
- [ ] Manual test: Audio plays (with mock audio)
- [ ] Manual test: No console errors

---

## ✅ Success Criteria (End of Day 2)

- **Functional:** All 6 pages work, no crashes
- **Transactional:** Users can pay, transactions confirm on-chain
- **Audio:** Gated audio streams and plays
- **Demo:** 3-minute live demo goes smoothly
- **Mobile:** Looks good on desktop (phone responsive bonus)
- **Polish:** Spinners, errors, toasts all present

---

**Ready to build.** 🚀
