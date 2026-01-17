# 📘 Music Core Protocol - Frontend Integration Guide

> **Version**: 1.0 (Post-Kiosk Integration)
> **Status**: Ready for Implementation

## 🎯 Overview

The **Music Core Protocol** leverages **Sui Kiosk** for the marketplace and a custom **Pay-to-Listen** module. This ensures strictly enforced royalties and a seamless user experience.

### 📦 Key Objects & Modules

| Module | Object | Description |
|:---|:---|:---|
| `music` | `Music` | The core NFT asset. **Has NO `store` ability by default** (Seal Pattern), but gains it via wrapper or if modified for Kiosk compatibility. |
| `listen` | `ListenCap` | A temporary "access pass" NFT minted when a user pays to listen. Valid for 24 hours. |
| `kiosk_marketplace` | `Kiosk` | Standard Sui Kiosk object. Users (sellers) must own a Kiosk to list items. |
| `kiosk_marketplace` | `TransferPolicy` | Defines rules (Royalty, Platform Fee) that *must* be satisfied to transfer a Music NFT. |
| `treasury` | `Treasury` | Collects platform fees. |
| `listen` | `ParentRoyaltyPool` | Holds royalties for parent tracks (remixes). |

---

## 🔄 1. Setup & Initalization (Admin/Platform)

Before users can interact, the platform must initialize the `TransferPolicy`.

### 1️⃣ Create Transfer Policy (One-Time)
Run this once to set up the rules for trading Music NFTs.

- **Function**: `kiosk_marketplace::create_transfer_policy`
- **Args**:
  - `publisher`: The Publisher object ID.
- **Result**:
  - Creates a shared `TransferPolicy<Music>`.
  - Sets **Royalty Rule** (e.g., 10%).
  - Sets **Platform Fee Rule** (e.g., 2.5%).

---

## 🎨 2. Artist Flow: Create & Publish

### 1️⃣ Create Music (Draft)
- **Function**: `music::create_music`
- **Args**:
  - `audio_cid` (String): Encrypted Walrus Blob ID.
  - `preview_cid` (String): Public Walrus Blob ID (30s sample).
  - `metadata_uri` (String): IPFS/Walrus URL for JSON metadata.
  - `cover_uri` (String): Image URL.
  - `royalty_bps` (u16): Creator royalty (e.g., `1000` = 10%).
  - `parent` (Option<ID>): Pass `none()` for original, or `some(parent_id)` for remix.
  - `registry`: Shared `MusicRegistry` object.
- **Outcome**: User gets a `Music` object (Status: **DRAFT**).

### 2️⃣ Publish Music
- **Function**: `music::publish`
- **Args**:
  - `music`: The `Music` object.
- **Outcome**: Status changes to **PUBLISHED**. Now ready for listening and listing.

---

## 🎧 3. Listener Flow: Pay-to-Listen

### 1️⃣ Listen (Purchase Access)
- **Function**: `listen::listen`
- **Args**:
  - `music`: `&mut Music` object.
  - `payment`: `Coin<SUI>` (Must be >= `listen_price`, default 0.001 SUI).
  - `treasury`: Shared `Treasury` object.
  - `parent_pool`: Shared `ParentRoyaltyPool` object.
  - `config`: Shared `ListenConfig` object.
  - `clock`: `0x6` (System Clock).
- **Logic**:
  - Splits payment: **70% Creator**, **20% Platform**, **10% Parent** (if remix).
  - Parent fees go to `ParentRoyaltyPool`.
  - Mints a `ListenCap` for the user.
- **Frontend Action**:
  - Call this function.
  - Wait for `ListenCapMinted` event.
  - Use `ListenCap` ID for audio decryption.

### 2️⃣ Decrypt Audio (Off-Chain / Walrus)
- **Frontend**:
  1. Retrieve `audio_cid` from Music object.
  2. Retrieve user's `ListenCap`.
  3. Call `listen::seal_approve(key_id, cap, clock)` (simulated or real transaction to prove ownership).
  4. Walrus/Backend verifies valid `ListenCap` and returns decryption key.

---

## 🛒 4. Marketplace Flow (Sui Kiosk)

### 🛍️ Seller: List Item

#### Step 1: Create Kiosk (If user has none)
- **Function**: `kiosk_marketplace::create_kiosk_entry`
- **Outcome**: Creates a shared `Kiosk` and sends `KioskOwnerCap` to user.

#### Step 2: Place Music in Kiosk
- **Function**: `kiosk_marketplace::place_music`
- **Args**:
  - `kiosk`: User's shared `Kiosk`.
  - `cap`: User's `KioskOwnerCap`.
  - `music`: The `Music` object to sell.

#### Step 3: List for Sale
- **Function**: `kiosk_marketplace::list_music`
- **Args**:
  - `kiosk`: User's shared `Kiosk`.
  - `cap`: User's `KioskOwnerCap`.
  - `music_id`: ID of the music.
  - `price`: Price in MIST (e.g., `1000000000` = 1 SUI).

### 🏷️ Buyer: Buy Item

#### Step 1: Buy Music (All-in-One)
Use the custom wrapper to handle purchase + fees in one transaction.

- **Function**: `kiosk_marketplace::buy_music`
- **Args**:
  - `kiosk`: Seller's shared `Kiosk`.
  - `music_id`: ID of the music.
  - `price`: The listing price (must match listing).
  - `payment`: `Coin<SUI>` (Must cover Price + Royalty + Fee).
    - *Frontend Note*: Calculate expected total: `Price + (Price * 10%) + (Price * 2.5%)`.
  - `policy`: Shared `TransferPolicy<Music>`.
  - `treasury`: Shared `Treasury` object.

---

## 🎛️ 5. Remix Flow

### Option A: Open Remix (Permissionless)
- **Function**: `remix::create_open_remix`
- **Args**:
  - `parent_music`: `&Music` (The track being remixed).
  - `audio_cid`, `metadata_uri`, etc.
- **Outcome**: Creates a new `Music` object linked to `parent_music`. Parent automatically gets 10% of listen revenue.

### Option B: Gated Remix (Requires Cap)
1. **Parent Owner**: Calls `remix::issue_remix_cap` → Sends `RemixCap` to remixer.
2. **Remixer**: Calls `remix::create_remix` with the `RemixCap`.

---

## 💰 6. Claiming Revenue

### Creator: Claim Listen Revenue
- **Function**: `music::withdraw_revenue`
- **Args**: `music`, `amount`.

### Parent Creator: Claim Remix Royalties
- **Function**: `listen::claim_parent_royalty`
- **Args**:
  - `parent_music`: The parent `Music` object (must answer `creator == sender`).
  - `pool`: Shared `ParentRoyaltyPool`.
- **Outcome**: Withers accumulated 10% royalties from all child remix listens.

---

## ⚠️ Key Integration Notes for Frontend

1.  **Sui Kiosk Client**:
    - The `buy_music` function is a custom wrapper. You do **not** need to manually construct the `kiosk::purchase` + `policy::confirm` flow. Just call `buy_music`.
2.  **Payment Calculation**:
    - Always estimate gas + fees generously.
    - `buy_music` will refund any excess SUI to the buyer.
3.  **Object IDs**:
    - You need to hardcode (or fetch via config) the IDs for:
        - `MusicRegistry`
        - `Treasury`
        - `ListenConfig`
        - `ParentRoyaltyPool`
        - `TransferPolicy`
    - These are created once during deployment.

---

## 🧪 Deployment Addresses (Devnet/Testnet)

*(Fill this in after deployment)*

- **Package ID**: `...`
- **MusicRegistry**: `...`
- **Treasury**: `...`
- **ListenConfig**: `...`
- **ParentRoyaltyPool**: `...`
- **TransferPolicy**: `...`
