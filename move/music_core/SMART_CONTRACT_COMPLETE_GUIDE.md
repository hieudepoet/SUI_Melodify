# 🎵 SUI Melodify - Complete Smart Contract Guide
## Hướng dẫn toàn diện cho Frontend Integration

> **Mục đích**: Document này mô tả chi tiết, đầy đủ luồng hoạt động của toàn bộ smart contract SUI Melodify, giúp Frontend Developer hoặc AI Agent có thể integrate chính xác 100%.

---

## 📚 MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Shared Objects (Bắt buộc)](#2-shared-objects-bắt-buộc)
3. [Module Music - Quản lý nhạc](#3-module-music---quản-lý-nhạc)
4. [Module Listen - Nghe nhạc trả phí](#4-module-listen---nghe-nhạc-trả-phí)
5. [Module Stake - Staking kinh tế](#5-module-stake---staking-kinh-tế)
6. [Module Treasury - Quản lý quỹ](#6-module-treasury---quản-lý-quỹ)
7. [Module Remix - Tạo remix](#7-module-remix---tạo-remix)
8. [Luồng hoạt động đầy đủ](#8-luồng-hoạt-động-đầy-đủ)
9. [Event System](#9-event-system)
10. [Error Codes](#10-error-codes)
11. [TypeScript Integration Examples](#11-typescript-integration-examples)

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1 Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUI MELODIFY PROTOCOL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌────────┐   ┌─────────┐   ┌─────────────┐    │
│  │  Music   │   │ Listen │   │  Stake  │   │   Treasury  │    │
│  │  (Core)  │──▶│ (P2P)  │   │  (Econ) │   │  (Platform) │    │
│  └──────────┘   └────────┘   └─────────┘   └─────────────┘    │
│       │             │                              │            │
│       │             ▼                              │            │
│       │      ┌─────────────┐                       │            │
│       └─────▶│ ParentPool  │◀──────────────────────┘            │
│              │  (Royalty)  │                                    │
│              └─────────────┘                                    │
│                                                                  │
│  ┌──────────┐   ┌────────┐                                     │
│  │  Remix   │   │ Badge  │   (Optional)                        │
│  └──────────┘   └────────┘                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Các modules chính

| Module | File | Chức năng | Độ ưu tiên |
|--------|------|-----------|------------|
| `music` | music.move | Quản lý Music NFT (tạo, publish, withdraw) | ⭐⭐⭐ CRITICAL |
| `listen` | listen.move | Pay-to-listen, phân phối revenue | ⭐⭐⭐ CRITICAL |
| `treasury` | treasury.move | Quỹ platform | ⭐⭐⭐ CRITICAL |
| `stake` | stake.move | Staking hỗ trợ nhạc | ⭐⭐ IMPORTANT |
| `remix` | remix.move | Tạo remix với parent tracking | ⭐⭐ IMPORTANT |
| `badge` | badge.move | Gamification layer | ⭐ OPTIONAL |

### 1.3 Package Address

```typescript
// Sau khi deploy, lưu lại Package ID
export const PACKAGE_ID = "0x..."; // Thay bằng package ID thật
```

---

## 2. SHARED OBJECTS (BẮT BUỘC)

**QUAN TRỌNG**: Tất cả shared objects này PHẢI được query và lưu lại sau khi deploy. Frontend cần chúng để gọi transactions.

### 2.1 Danh sách Shared Objects

| Object Type | Module | Cách lấy | Sử dụng trong |
|-------------|--------|----------|---------------|
| `MusicRegistry` | music | Query sau deploy | `create_music()` |
| `ListenConfig` | listen | Query sau deploy | `listen()` |
| `ParentRoyaltyPool` | listen | Query sau deploy | `listen()`, `claim_parent_royalty()` |
| `Treasury` | treasury | Query sau deploy | `listen()` |
| `StakeRegistry` | stake | Query sau deploy | `stake()`, `unstake()` |

### 2.2 Cách query Shared Objects sau deploy

```typescript
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

// Sau khi deploy, query tất cả objects được tạo
const txResult = await client.getTransactionBlock({
  digest: DEPLOY_TX_DIGEST,
  options: {
    showEffects: true,
    showObjectChanges: true,
  },
});

// Tìm shared objects
const sharedObjects = txResult.objectChanges?.filter(
  (obj) => obj.objectType.includes('MusicRegistry') 
         || obj.objectType.includes('ListenConfig')
         || obj.objectType.includes('ParentRoyaltyPool')
         || obj.objectType.includes('Treasury')
         || obj.objectType.includes('StakeRegistry')
);

// Lưu vào .env
VITE_MUSIC_REGISTRY_ID=0x...
VITE_LISTEN_CONFIG_ID=0x...
VITE_PARENT_POOL_ID=0x...
VITE_TREASURY_ID=0x...
VITE_STAKE_REGISTRY_ID=0x...
```

### 2.3 System Objects

```typescript
// Sui Clock (built-in, không đổi)
export const CLOCK_ID = "0x6";
```

---

## 3. MODULE MUSIC - QUẢN LÝ NHẠC

### 3.1 Struct Music

```move
public struct Music has key, store {
    id: UID,
    creator: address,           // Người tạo
    audio_cid: String,          // Walrus CID (encrypted)
    preview_cid: String,        // Walrus CID (public preview)
    metadata_uri: String,       // JSON metadata URI
    cover_uri: String,          // Cover image URI
    parent: Option<ID>,         // ID của music gốc (nếu là remix)
    total_listens: u64,         // Số lượt nghe
    revenue_pool: Balance<SUI>, // Số tiền creator có thể rút
    royalty_bps: u16,           // % royalty (basis points)
    status: u8,                 // 0=Draft, 1=Published, 2=Frozen
    version: u64,               // Seal pattern version
}
```

### 3.2 Music Status

```typescript
enum MusicStatus {
  DRAFT = 0,      // Vừa tạo, chưa công khai
  PUBLISHED = 1,  // Đã publish, có thể nghe
  FROZEN = 2,     // Bị đóng băng (emergency)
}
```

### 3.3 Function: create_music()

**Mô tả**: Người dùng tạo Music mới (trạng thái DRAFT)

**Signature**:
```move
public fun create_music(
    audio_cid: String,        // Walrus blob ID (audio đã mã hóa)
    preview_cid: String,      // Walrus blob ID (preview công khai)
    metadata_uri: String,     // URI đến JSON metadata
    cover_uri: String,        // URI ảnh bìa
    royalty_bps: u16,         // Royalty (0-10000, vd: 1000 = 10%)
    parent: Option<ID>,       // None nếu là original, Some(ID) nếu remix
    registry: &mut MusicRegistry,
    ctx: &mut TxContext,
): Music
```

**TypeScript Example**:
```typescript
import { Transaction } from '@mysten/sui/transactions';

async function createMusic(
  audioCid: string,
  previewCid: string,
  metadataUri: string,
  coverUri: string,
  royaltyBps: number,
  parentId: string | null
) {
  const tx = new Transaction();
  
  const [music] = tx.moveCall({
    target: `${PACKAGE_ID}::music::create_music`,
    arguments: [
      tx.pure.string(audioCid),
      tx.pure.string(previewCid),
      tx.pure.string(metadataUri),
      tx.pure.string(coverUri),
      tx.pure.u16(royaltyBps),
      tx.pure.option('id', parentId),
      tx.object(MUSIC_REGISTRY_ID),
    ],
  });
  
  // Transfer Music NFT về user
  tx.transferObjects([music], tx.pure.address(userAddress));
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  
  // Lấy Music ID từ created objects
  const musicId = result.effects.created?.find(
    obj => obj.owner === userAddress
  )?.reference.objectId;
  
  return musicId;
}
```

**Kết quả**:
- Tạo Music object mới với status = DRAFT
- Music thuộc sở hữu của creator
- Event `MusicCreated` được emit

---

### 3.4 Function: publish()

**Mô tả**: Creator publish Music (DRAFT → PUBLISHED)

**Signature**:
```move
public fun publish(self: &mut Music, ctx: &TxContext)
```

**Yêu cầu**:
- Caller PHẢI là creator
- Status PHẢI là DRAFT

**TypeScript Example**:
```typescript
async function publishMusic(musicId: string) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::music::publish`,
    arguments: [
      tx.object(musicId),
    ],
  });
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  return result.digest;
}
```

**Kết quả**:
- Music status = PUBLISHED
- Music trở thành IMMUTABLE (không thể edit metadata)
- Event `MusicPublished` được emit
- Music có thể được nghe/stake

---

### 3.5 Function: withdraw_revenue()

**Mô tả**: Creator rút tiền từ revenue pool

**Signature**:
```move
public fun withdraw_revenue(
    self: &mut Music,
    amount: u64,         // Số tiền rút (MIST)
    ctx: &mut TxContext
): Coin<SUI>
```

**Yêu cầu**:
- Caller PHẢI là creator
- Music KHÔNG được frozen
- `amount` <= revenue_pool balance

**TypeScript Example**:
```typescript
async function withdrawRevenue(musicId: string, amount: number) {
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::music::withdraw_revenue`,
    arguments: [
      tx.object(musicId),
      tx.pure.u64(amount),
    ],
  });
  
  // Transfer coin về user
  tx.transferObjects([coin], tx.pure.address(userAddress));
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  return result.digest;
}
```

**Kết quả**:
- Coin<SUI> được tạo và transfer về creator
- `revenue_pool` giảm đi `amount`
- Event `RevenueWithdrawn` được emit

---

### 3.6 Getter Functions

```typescript
// Query Music data
const music = await client.getObject({
  id: musicId,
  options: { showContent: true },
});

const musicData = music.data.content.fields;

// Các trường có sẵn:
const creator = musicData.creator;           // address
const audioCid = musicData.audio_cid;        // string
const previewCid = musicData.preview_cid;    // string
const metadataUri = musicData.metadata_uri;  // string
const coverUri = musicData.cover_uri;        // string
const totalListens = musicData.total_listens; // u64
const revenueBalance = musicData.revenue_pool; // u64 (MIST)
const status = musicData.status;             // 0/1/2
const royaltyBps = musicData.royalty_bps;    // u16
const parent = musicData.parent;             // Option<ID>
```

---

## 4. MODULE LISTEN - NGHE NHẠC TRẢ PHÍ

### 4.1 Luồng hoạt động Listen

```
User Pay SUI (0.001 SUI default)
         │
         ▼
    ┌─────────────────────────┐
    │   listen() function     │
    └─────────────────────────┘
         │
         ├──▶ 70% → Music.revenue_pool (Creator)
         ├──▶ 20% → Treasury (Platform)
         └──▶ 10% → ParentRoyaltyPool (nếu là remix)
                    hoặc về Creator (nếu original)
         │
         ▼
    ListenCap minted (24h expiry)
         │
         ▼
    Frontend dùng ListenCap decrypt audio qua Walrus SEAL
```

### 4.2 Struct ListenCap

```move
public struct ListenCap has key {
    id: UID,
    music_id: ID,           // Music đang nghe
    listener: address,      // Người nghe
    created_at: u64,        // Timestamp (ms)
    expires_at: u64,        // Hết hạn sau 24h
    version: u64,           // Seal pattern version
}
```

### 4.3 Function: listen()

**Mô tả**: User trả tiền để nghe nhạc, nhận ListenCap

**Signature**:
```move
public fun listen(
    music: &mut Music,
    payment: Coin<SUI>,                // Payment coin
    treasury: &mut Treasury,
    parent_pool: &mut ParentRoyaltyPool,
    config: &ListenConfig,
    clock: &Clock,
    ctx: &mut TxContext,
): ListenCap
```

**Yêu cầu**:
- Music PHẢI published
- Payment >= listen_price (default: 1,000,000 MIST = 0.001 SUI)

**Revenue Split**:
- **70%** → Music.revenue_pool (creator rút sau)
- **20%** → Treasury (platform fee)
- **10%** → ParentRoyaltyPool (nếu remix) HOẶC về creator (nếu original)

**TypeScript Example**:
```typescript
async function listenToMusic(musicId: string) {
  const tx = new Transaction();
  
  // 1. Lấy listen price từ config
  const config = await client.getObject({
    id: LISTEN_CONFIG_ID,
    options: { showContent: true },
  });
  const listenPrice = Number(config.data.content.fields.listen_price);
  
  // 2. Split coin để payment
  const [paymentCoin] = tx.splitCoins(tx.gas, [listenPrice]);
  
  // 3. Gọi listen()
  const [listenCap] = tx.moveCall({
    target: `${PACKAGE_ID}::listen::listen`,
    arguments: [
      tx.object(musicId),           // &mut Music
      paymentCoin,                  // Coin<SUI>
      tx.object(TREASURY_ID),       // &mut Treasury
      tx.object(PARENT_POOL_ID),    // &mut ParentRoyaltyPool
      tx.object(LISTEN_CONFIG_ID),  // &ListenConfig
      tx.object(CLOCK_ID),          // &Clock (0x6)
    ],
  });
  
  // 4. Transfer ListenCap về user
  tx.transferObjects([listenCap], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  
  // 5. Lấy ListenCap ID
  const listenCapId = result.effects.created?.find(
    obj => obj.owner?.AddressOwner === userAddress
  )?.reference.objectId;
  
  return { digest: result.digest, listenCapId };
}
```

**Kết quả**:
- ListenCap được tạo và transfer về listener
- Music.total_listens tăng 1
- Revenue được split tự động
- Events: `ListenCapMinted`, `RevenueDistributed`

---

### 4.4 Walrus SEAL Decryption

**Sau khi có ListenCap**, frontend dùng nó để decrypt audio:

```typescript
async function decryptAudio(musicId: string, listenCapId: string) {
  // 1. Lấy audio_cid từ Music
  const music = await client.getObject({
    id: musicId,
    options: { showContent: true },
  });
  const audioCid = music.data.content.fields.audio_cid;
  
  // 2. Gọi Walrus SEAL API để decrypt
  const response = await fetch(`https://walrus-seal-api.com/decrypt`, {
    method: 'POST',
    body: JSON.stringify({
      blobId: audioCid,
      listenCapId: listenCapId,
      network: 'testnet',
    }),
  });
  
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
```

**SEAL Entry Point** (tự động được Walrus gọi):
```move
entry fun seal_approve(
    key_id: vector<u8>,
    cap: &ListenCap,
    clock: &Clock,
    ctx: &TxContext
)
```

---

### 4.5 Function: claim_parent_royalty()

**Mô tả**: Parent music creator claim royalty từ remixes

**Signature**:
```move
public fun claim_parent_royalty(
    parent_music: &Music,
    pool: &mut ParentRoyaltyPool,
    ctx: &mut TxContext,
): Coin<SUI>
```

**Yêu cầu**:
- Caller PHẢI là parent music creator
- Parent music phải có royalty tích lũy

**TypeScript Example**:
```typescript
async function claimParentRoyalty(parentMusicId: string) {
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::listen::claim_parent_royalty`,
    arguments: [
      tx.object(parentMusicId),
      tx.object(PARENT_POOL_ID),
    ],
  });
  
  tx.transferObjects([coin], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  return result.digest;
}
```

---

### 4.6 Check Parent Balance

**Không có direct getter, cần dùng devInspectTransactionBlock**:

```typescript
async function getParentBalance(parentMusicId: string): Promise<number> {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::listen::get_parent_balance`,
    arguments: [
      tx.object(PARENT_POOL_ID),
      tx.pure.id(parentMusicId),
    ],
  });
  
  const result = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: userAddress,
  });
  
  // Parse return value
  const balance = result.results?.[0]?.returnValues?.[0];
  return Number(balance?.data);
}
```

---

## 5. MODULE STAKE - STAKING KINH TẾ

### 5.1 Mục đích Staking

**LƯU Ý QUAN TRỌNG**: Staking là **pure economic signal** - không ảnh hưởng đến:
- ❌ Listen count
- ❌ Revenue distribution
- ❌ ListenCap minting

**Mục đích**: User stake SUI để signal họ support một music.

### 5.2 Struct StakePosition

```move
public struct StakePosition has key, store {
    id: UID,
    music_id: ID,           // Music đang stake
    staker: address,        // Người stake
    amount: Balance<SUI>,   // Số SUI đã lock
    staked_at_epoch: u64,   // Epoch khi stake
    unlock_epoch: u64,      // Epoch unlock
    staked_at_ms: u64,      // Timestamp (ms)
}
```

### 5.3 Function: stake()

**Signature**:
```move
public fun stake(
    music: &Music,
    payment: Coin<SUI>,         // SUI để stake
    lock_epochs: u64,           // Số epoch khóa (1-100)
    registry: &mut StakeRegistry,
    clock: &Clock,
    ctx: &mut TxContext,
): StakePosition
```

**Yêu cầu**:
- Music PHẢI published
- 1 <= lock_epochs <= 100
- payment > 0

**TypeScript Example**:
```typescript
async function stakeOnMusic(
  musicId: string,
  amount: number,         // MIST
  lockEpochs: number      // 1-100
) {
  const tx = new Transaction();
  
  // Split coin to stake
  const [stakeCoin] = tx.splitCoins(tx.gas, [amount]);
  
  const [position] = tx.moveCall({
    target: `${PACKAGE_ID}::stake::stake`,
    arguments: [
      tx.object(musicId),
      stakeCoin,
      tx.pure.u64(lockEpochs),
      tx.object(STAKE_REGISTRY_ID),
      tx.object(CLOCK_ID),
    ],
  });
  
  tx.transferObjects([position], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  
  const positionId = result.effects.created?.find(
    obj => obj.owner?.AddressOwner === userAddress
  )?.reference.objectId;
  
  return positionId;
}
```

**Kết quả**:
- StakePosition được tạo và transfer về staker
- SUI bị lock trong contract
- Event `Staked` được emit
- Registry cập nhật total_staked

---

### 5.4 Function: unstake()

**Mô tả**: Rút stake sau khi unlock

**Signature**:
```move
public fun unstake(
    position: StakePosition,
    registry: &mut StakeRegistry,
    ctx: &mut TxContext,
): Coin<SUI>
```

**Yêu cầu**:
- Caller PHẢI là staker
- Current epoch >= unlock_epoch

**TypeScript Example**:
```typescript
async function unstakePosition(positionId: string) {
  // 1. Check if unlocked
  const position = await client.getObject({
    id: positionId,
    options: { showContent: true },
  });
  
  const currentEpoch = await client.getLatestSuiSystemState().then(
    state => Number(state.epoch)
  );
  const unlockEpoch = Number(position.data.content.fields.unlock_epoch);
  
  if (currentEpoch < unlockEpoch) {
    throw new Error(`Position locked until epoch ${unlockEpoch}`);
  }
  
  // 2. Unstake
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::stake::unstake`,
    arguments: [
      tx.object(positionId),
      tx.object(STAKE_REGISTRY_ID),
    ],
  });
  
  tx.transferObjects([coin], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  return result.digest;
}
```

**Kết quả**:
- StakePosition bị delete
- SUI được trả về staker
- Event `Unstaked` được emit
- Registry giảm total_staked

---

### 5.5 Function: emergency_unstake()

**Mô tả**: Unstake ngay lập tức (không cần đợi unlock)

**Signature giống `unstake()` nhưng không check epoch**

```typescript
async function emergencyUnstake(positionId: string) {
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::stake::emergency_unstake`,
    arguments: [
      tx.object(positionId),
      tx.object(STAKE_REGISTRY_ID),
    ],
  });
  
  tx.transferObjects([coin], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  return result.digest;
}
```

---

## 6. MODULE TREASURY - QUẢN LÝ QUỸ

### 6.1 Struct Treasury

```move
public struct Treasury has key {
    id: UID,
    balance: Balance<SUI>,  // Số tiền platform đã thu
    admin: address,         // Admin address
    total_collected: u64,   // Tổng đã thu
    total_withdrawn: u64,   // Tổng đã rút
}
```

### 6.2 Function: withdraw() (Admin only)

**Signature**:
```move
public fun withdraw(
    self: &mut Treasury,
    admin_cap: &AdminCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
)
```

**TypeScript Example** (Admin only):
```typescript
async function withdrawFromTreasury(
  amount: number,
  recipient: string
) {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PACKAGE_ID}::treasury::withdraw`,
    arguments: [
      tx.object(TREASURY_ID),
      tx.object(ADMIN_CAP_ID),
      tx.pure.u64(amount),
      tx.pure.address(recipient),
    ],
  });
  
  const result = await signAndExecuteTransaction({
    transaction: tx,
    signer: adminKeypair,
  });
  
  return result.digest;
}
```

---

## 7. MODULE REMIX - TẠO REMIX

### 7.1 Function: create_open_remix()

**Mô tả**: Tạo remix không cần permission (open license)

**Signature**:
```move
public fun create_open_remix(
    parent_music: &Music,
    audio_cid: String,
    metadata_uri: String,
    cover_uri: String,
    royalty_bps: u16,
    registry: &mut MusicRegistry,
    ctx: &mut TxContext,
): Music
```

**TypeScript Example**:
```typescript
async function createRemix(
  parentMusicId: string,
  remixAudioCid: string,
  metadataUri: string,
  coverUri: string,
  royaltyBps: number
) {
  const tx = new Transaction();
  
  const [remix] = tx.moveCall({
    target: `${PACKAGE_ID}::remix::create_open_remix`,
    arguments: [
      tx.object(parentMusicId),
      tx.pure.string(remixAudioCid),
      tx.pure.string(metadataUri),
      tx.pure.string(coverUri),
      tx.pure.u16(royaltyBps),
      tx.object(MUSIC_REGISTRY_ID),
    ],
  });
  
  tx.transferObjects([remix], userAddress);
  
  const result = await signAndExecuteTransaction({ transaction: tx });
  
  const remixId = result.effects.created?.find(
    obj => obj.owner?.AddressOwner === userAddress
  )?.reference.objectId;
  
  return remixId;
}
```

**Kết quả**:
- Music mới với `parent = Some(parent_music_id)`
- Khi có người nghe remix → 10% royalty về parent
- Event `RemixCreated` được emit

---

## 8. LUỒNG HOẠT ĐỘNG ĐẦY ĐỦ

### 8.1 User Journey: Creator Upload & Monetize

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Upload audio to Walrus                              │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Upload audio file → Walrus                        │
│ Returns: encrypted_audio_cid, preview_cid                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: create_music() → Draft Music NFT                    │
├─────────────────────────────────────────────────────────────┤
│ TX: music::create_music(audio_cid, preview_cid, ...)        │
│ Returns: Music object (status=DRAFT)                        │
│ Owner: Creator                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: publish() → Published Music                         │
├─────────────────────────────────────────────────────────────┤
│ TX: music::publish(music)                                    │
│ Status: DRAFT → PUBLISHED                                   │
│ Now: Music có thể được nghe & stake                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Listeners call listen() → Pay & get ListenCap       │
├─────────────────────────────────────────────────────────────┤
│ TX: listen::listen(music, payment, ...)                     │
│ Payment Split:                                               │
│   - 70% → Music.revenue_pool                                │
│   - 20% → Treasury                                           │
│   - 10% → ParentRoyaltyPool (if remix)                      │
│ Returns: ListenCap (expires in 24h)                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Decrypt audio using ListenCap                       │
├─────────────────────────────────────────────────────────────┤
│ Frontend → Walrus SEAL API                                  │
│ Walrus calls: seal_approve(listenCap)                       │
│ Returns: Decrypted audio stream                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Creator withdraw_revenue()                          │
├─────────────────────────────────────────────────────────────┤
│ TX: music::withdraw_revenue(music, amount)                  │
│ Returns: Coin<SUI> transferred to creator                   │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 User Journey: Listener Experience

```
1. Browse published music (query Music objects with status=1)
2. Click "Listen" button
3. Frontend calls listen()
   - Split 0.001 SUI from gas
   - Call listen::listen(...)
   - Receive ListenCap
4. Use ListenCap to decrypt and play audio
5. ListenCap expires after 24h
6. To listen again → pay again
```

### 8.3 User Journey: Staker Support Music

```
1. Find music to support
2. Click "Stake" button, choose amount & lock period
3. Frontend calls stake()
   - Lock SUI for X epochs
   - Receive StakePosition
4. Wait for unlock epoch
5. Call unstake() to get SUI back
   (or emergency_unstake() anytime)
```

---

## 9. EVENT SYSTEM

### 9.1 Danh sách Events

| Event | Module | Trigger | Dữ liệu |
|-------|--------|---------|---------|
| `MusicCreated` | music | create_music() | music_id, creator, audio_cid |
| `MusicPublished` | music | publish() | music_id, creator |
| `RevenueAdded` | music | Internal | music_id, amount |
| `RevenueWithdrawn` | music | withdraw_revenue() | music_id, recipient, amount |
| `ListenCapMinted` | listen | listen() | cap_id, music_id, listener, expires_at, price_paid |
| `RevenueDistributed` | listen | listen() | music_id, creator_amount, platform_amount, parent_amount |
| `ParentRoyaltyAdded` | listen | listen() (nếu remix) | parent_music_id, amount, total_balance |
| `ParentRoyaltyClaimed` | listen | claim_parent_royalty() | parent_music_id, claimer, amount |
| `Staked` | stake | stake() | position_id, music_id, staker, amount, unlock_epoch |
| `Unstaked` | stake | unstake() | position_id, music_id, staker, amount |
| `FundsDeposited` | treasury | Internal | amount, total_balance |
| `FundsWithdrawn` | treasury | withdraw() | amount, recipient, remaining_balance |

### 9.2 Listen to Events

```typescript
// Subscribe to events
client.subscribeEvent({
  filter: {
    Package: PACKAGE_ID,
  },
  onMessage: (event) => {
    console.log('Event received:', event);
    
    if (event.type.endsWith('::MusicCreated')) {
      // Handle music created
      const { music_id, creator, audio_cid } = event.parsedJson;
    }
    
    if (event.type.endsWith('::ListenCapMinted')) {
      // Handle new listen
      const { music_id, listener, price_paid } = event.parsedJson;
    }
  },
});
```

---

## 10. ERROR CODES

### 10.1 Music Module Errors

| Code | Constant | Meaning | Solution |
|------|----------|---------|----------|
| 1 | `EInvalidRoyalty` | royalty_bps > 10000 | Use 0-10000 (0-100%) |
| 2 | `ENotOwner` | Caller không phải owner | Check creator address |
| 3 | `EAlreadyPublished` | Music đã published | Không thể publish lại |
| 4 | `EMusicFrozen` | Music bị frozen | Contact admin |
| 5 | `ENotPublished` | Music chưa published | Call publish() trước |
| 6 | `EInsufficientPayment` | Payment không đủ | Check balance |

### 10.2 Listen Module Errors

| Code | Constant | Meaning | Solution |
|------|----------|---------|----------|
| 1 | `EInsufficientPayment` | Payment < listen_price | Increase payment |
| 2 | `EMusicNotPublished` | Music chưa published | Wait for publish |
| 5 | `EInsufficientBalance` | Pool balance = 0 | No royalty to claim |
| 6 | `ENotParentOwner` | Not parent creator | Check music owner |

### 10.3 Stake Module Errors

| Code | Constant | Meaning | Solution |
|------|----------|---------|----------|
| 1 | `E_NOT_OWNER` | Not position owner | Check staker |
| 2 | `E_NOT_PUBLISHED` | Music not published | Wait for publish |
| 3 | `E_INVALID_PAYMENT` | Payment = 0 | Send SUI |
| 4 | `E_EARLY_UNSTAKE` | Unlock epoch not reached | Wait or use emergency_unstake |
| 5 | `E_INVALID_LOCK_PERIOD` | lock_epochs not in 1-100 | Use 1-100 |

---

## 11. TYPESCRIPT INTEGRATION EXAMPLES

### 11.1 Complete Helper Class

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

export class MelodifySDK {
  private client: SuiClient;
  private packageId: string;
  private musicRegistryId: string;
  private listenConfigId: string;
  private parentPoolId: string;
  private treasuryId: string;
  private stakeRegistryId: string;
  
  constructor(network: 'testnet' | 'mainnet') {
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    
    // Load from env
    this.packageId = process.env.VITE_PACKAGE_ID!;
    this.musicRegistryId = process.env.VITE_MUSIC_REGISTRY_ID!;
    this.listenConfigId = process.env.VITE_LISTEN_CONFIG_ID!;
    this.parentPoolId = process.env.VITE_PARENT_POOL_ID!;
    this.treasuryId = process.env.VITE_TREASURY_ID!;
    this.stakeRegistryId = process.env.VITE_STAKE_REGISTRY_ID!;
  }
  
  // ========== MUSIC ==========
  
  async createMusic(params: {
    audioCid: string;
    previewCid: string;
    metadataUri: string;
    coverUri: string;
    royaltyBps: number;
    parentId?: string;
  }): Promise<Transaction> {
    const tx = new Transaction();
    
    const [music] = tx.moveCall({
      target: `${this.packageId}::music::create_music`,
      arguments: [
        tx.pure.string(params.audioCid),
        tx.pure.string(params.previewCid),
        tx.pure.string(params.metadataUri),
        tx.pure.string(params.coverUri),
        tx.pure.u16(params.royaltyBps),
        tx.pure.option('id', params.parentId || null),
        tx.object(this.musicRegistryId),
      ],
    });
    
    return tx;
  }
  
  async publishMusic(musicId: string): Promise<Transaction> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::music::publish`,
      arguments: [tx.object(musicId)],
    });
    
    return tx;
  }
  
  async withdrawRevenue(
    musicId: string,
    amount: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    
    const [coin] = tx.moveCall({
      target: `${this.packageId}::music::withdraw_revenue`,
      arguments: [
        tx.object(musicId),
        tx.pure.u64(amount),
      ],
    });
    
    return tx;
  }
  
  // ========== LISTEN ==========
  
  async listen(musicId: string): Promise<Transaction> {
    const tx = new Transaction();
    
    // Get listen price
    const config = await this.client.getObject({
      id: this.listenConfigId,
      options: { showContent: true },
    });
    const price = Number(config.data.content.fields.listen_price);
    
    const [coin] = tx.splitCoins(tx.gas, [price]);
    
    const [cap] = tx.moveCall({
      target: `${this.packageId}::listen::listen`,
      arguments: [
        tx.object(musicId),
        coin,
        tx.object(this.treasuryId),
        tx.object(this.parentPoolId),
        tx.object(this.listenConfigId),
        tx.object('0x6'), // Clock
      ],
    });
    
    return tx;
  }
  
  async claimParentRoyalty(parentMusicId: string): Promise<Transaction> {
    const tx = new Transaction();
    
    const [coin] = tx.moveCall({
      target: `${this.packageId}::listen::claim_parent_royalty`,
      arguments: [
        tx.object(parentMusicId),
        tx.object(this.parentPoolId),
      ],
    });
    
    return tx;
  }
  
  // ========== STAKE ==========
  
  async stake(
    musicId: string,
    amount: number,
    lockEpochs: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    
    const [coin] = tx.splitCoins(tx.gas, [amount]);
    
    const [position] = tx.moveCall({
      target: `${this.packageId}::stake::stake`,
      arguments: [
        tx.object(musicId),
        coin,
        tx.pure.u64(lockEpochs),
        tx.object(this.stakeRegistryId),
        tx.object('0x6'),
      ],
    });
    
    return tx;
  }
  
  async unstake(positionId: string): Promise<Transaction> {
    const tx = new Transaction();
    
    const [coin] = tx.moveCall({
      target: `${this.packageId}::stake::unstake`,
      arguments: [
        tx.object(positionId),
        tx.object(this.stakeRegistryId),
      ],
    });
    
    return tx;
  }
  
  // ========== QUERIES ==========
  
  async getMusic(musicId: string) {
    const obj = await this.client.getObject({
      id: musicId,
      options: { showContent: true },
    });
    
    return obj.data.content.fields;
  }
  
  async getListenPrice(): Promise<number> {
    const config = await this.client.getObject({
      id: this.listenConfigId,
      options: { showContent: true },
    });
    
    return Number(config.data.content.fields.listen_price);
  }
  
  async getCurrentEpoch(): Promise<number> {
    const state = await this.client.getLatestSuiSystemState();
    return Number(state.epoch);
  }
}
```

### 11.2 Usage Example

```typescript
// 1. Initialize SDK
const sdk = new MelodifySDK('testnet');

// 2. Create music
const createTx = await sdk.createMusic({
  audioCid: 'walrus_cid_xxx',
  previewCid: 'walrus_preview_xxx',
  metadataUri: 'ipfs://metadata',
  coverUri: 'https://cover.jpg',
  royaltyBps: 1000, // 10%
});

createTx.transferObjects([music], userAddress);
const result = await signAndExecuteTransaction({ transaction: createTx });
const musicId = extractMusicId(result);

// 3. Publish
const publishTx = await sdk.publishMusic(musicId);
await signAndExecuteTransaction({ transaction: publishTx });

// 4. Listen
const listenTx = await sdk.listen(musicId);
listenTx.transferObjects([listenCap], userAddress);
await signAndExecuteTransaction({ transaction: listenTx });

// 5. Stake
const stakeTx = await sdk.stake(musicId, 10_000_000, 10); // 0.01 SUI, 10 epochs
stakeTx.transferObjects([position], userAddress);
await signAndExecuteTransaction({ transaction: stakeTx });
```

---

## 12. DEPLOYMENT CHECKLIST

### Pre-Deploy

- [ ] Review all module code
- [ ] Run `sui move build`
- [ ] Run `sui move test`
- [ ] Verify constants (listen_price, revenue splits, etc.)

### Deploy

- [ ] `sui client publish --gas-budget 100000000`
- [ ] Save Package ID
- [ ] Query all shared objects
- [ ] Save shared object IDs to `.env`:
  - `VITE_PACKAGE_ID`
  - `VITE_MUSIC_REGISTRY_ID`
  - `VITE_LISTEN_CONFIG_ID`
  - `VITE_PARENT_POOL_ID`
  - `VITE_TREASURY_ID`
  - `VITE_STAKE_REGISTRY_ID`
  - `VITE_ADMIN_CAP_ID` (if needed)
  - `VITE_LISTEN_ADMIN_CAP_ID` (if needed)

### Post-Deploy

- [ ] Test create_music()
- [ ] Test publish()
- [ ] Test listen()
- [ ] Test withdraw_revenue()
- [ ] Test stake()
- [ ] Test unstake()
- [ ] Test remix
- [ ] Verify events are emitted
- [ ] Test Walrus SEAL decryption

---

## 13. CONSTANTS & DEFAULTS

```typescript
// Listen
const DEFAULT_LISTEN_PRICE = 1_000_000; // 0.001 SUI
const LISTEN_DURATION_MS = 86_400_000;  // 24 hours

// Revenue Split
const CREATOR_SHARE_BPS = 7000;  // 70%
const PLATFORM_SHARE_BPS = 2000; // 20%
const PARENT_SHARE_BPS = 1000;   // 10%
const TOTAL_BPS = 10000;         // 100%

// Stake
const MIN_LOCK_EPOCHS = 1;
const MAX_LOCK_EPOCHS = 100;

// Music
const STATUS_DRAFT = 0;
const STATUS_PUBLISHED = 1;
const STATUS_FROZEN = 2;
const MAX_ROYALTY_BPS = 10000;

// System
const CLOCK_ID = "0x6";
```

---

## 14. FAQ

### Q: Tại sao ListenCap không có `store` ability?
**A**: Để prevent transfer tự do. ListenCap chỉ có thể được mint qua listen() và sẽ expire sau 24h.

### Q: StakePosition có thể transfer được không?
**A**: Có, StakePosition có `store` ability nên có thể transfer. Tuy nhiên AI agent không nên làm điều này trừ khi user yêu cầu.

### Q: Revenue split có thể thay đổi không?
**A**: Không. Revenue split (70/20/10) là hardcoded trong contract.

### Q: Tôi có thể listen mà không trả tiền không?
**A**: Không. Phải trả đủ listen_price mới mint được ListenCap.

### Q: Parent royalty được tính như thế nào?
**A**: Khi ai đó nghe remix, 10% payment tự động vào ParentRoyaltyPool. Parent creator claim bất cứ lúc nào.

### Q: Staking có yield không?
**A**: Không. Staking chỉ là economic signal, không có reward tự động.

---

## 15. SUPPORT & RESOURCES

- **Smart Contract Source**: `d:\Web3\SUI_Melodify\move\music_core\`
- **Tests**: `d:\Web3\SUI_Melodify\move\music_core\tests\`
- **Documentation**: 
  - `COMPLETION_REPORT.md`
  - `FRONTEND_INTEGRATION.md`
  - `QUICK_REFERENCE.md`

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-17  
**Contract Status**: ✅ Production Ready  
**Test Status**: ✅ All tests passing

---

**END OF DOCUMENT**
