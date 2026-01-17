# 🎵 SUI Melodify - Quick Reference Card

## 🚀 Essential Function Calls

### 📝 Create Music
```typescript
tx.moveCall({
  target: `${PKG}::music::create_music`,
  arguments: [
    tx.pure.string(audioCid),
    tx.pure.string(previewCid),
    tx.pure.string(metadataUri),
    tx.pure.string(coverUri),
    tx.pure.u16(royaltyBps),
    tx.pure.option('id', parentId), // null for original
    tx.object(MUSIC_REGISTRY_ID),
  ],
});
```

### 🎤 Publish Music
```typescript
tx.moveCall({
  target: `${PKG}::music::publish`,
  arguments: [tx.object(musicId)],
});
```

### 🎧 Listen to Music
```typescript
const [coin] = tx.splitCoins(tx.gas, [LISTEN_PRICE]);
const [cap] = tx.moveCall({
  target: `${PKG}::listen::listen`,
  arguments: [
    tx.object(musicId),
    coin,
    tx.object(TREASURY_ID),
    tx.object(PARENT_POOL_ID),
    tx.object(LISTEN_CONFIG_ID),
    tx.object('0x6'), // Clock
  ],
});
```

### 💰 Withdraw Revenue
```typescript
const [coin] = tx.moveCall({
  target: `${PKG}::music::withdraw_revenue`,
  arguments: [
    tx.object(musicId),
    tx.pure.u64(amount),
  ],
});
```

### 🎨 Create Remix
```typescript
const [remix] = tx.moveCall({
  target: `${PKG}::remix::create_open_remix`,
  arguments: [
    tx.object(parentMusicId),
    tx.pure.string(remixAudioCid),
    tx.pure.string(metadataUri),
    tx.pure.string(coverUri),
    tx.pure.u16(royaltyBps),
    tx.object(MUSIC_REGISTRY_ID),
  ],
});
```

### 🔒 Stake
```typescript
const [coin] = tx.splitCoins(tx.gas, [amount]);
const [position] = tx.moveCall({
  target: `${PKG}::stake::stake`,
  arguments: [
    tx.object(musicId),
    coin,
    tx.pure.u64(lockEpochs),
    tx.object(STAKE_REGISTRY_ID),
    tx.object('0x6'), // Clock
  ],
});
```

### 🔓 Unstake
```typescript
const [coin] = tx.moveCall({
  target: `${PKG}::stake::unstake`,
  arguments: [
    tx.object(positionId),
    tx.object(STAKE_REGISTRY_ID),
  ],
});
```

### 👑 Claim Parent Royalty
```typescript
const [coin] = tx.moveCall({
  target: `${PKG}::listen::claim_parent_royalty`,
  arguments: [
    tx.object(parentMusicId),
    tx.object(PARENT_POOL_ID),
  ],
});
```

---

## 📊 Revenue Split

| Recipient | Share | Notes |
|-----------|-------|-------|
| Creator | 70% | Goes to Music.revenue_pool |
| Platform | 20% | Goes to Treasury |
| Parent | 10% | Goes to ParentRoyaltyPool (if remix) |

---

## 🔑 Required Shared Objects

```typescript
// Save these after deployment
const SHARED_OBJECTS = {
  MUSIC_REGISTRY_ID: '0x...',
  LISTEN_CONFIG_ID: '0x...',
  PARENT_POOL_ID: '0x...',
  TREASURY_ID: '0x...',
  STAKE_REGISTRY_ID: '0x...',
};

// System objects
const CLOCK = '0x6';
```

---

## ⚠️ Common Errors

| Code | Error | Solution |
|------|-------|----------|
| 2 | `E_NOT_OWNER` | Ensure caller is creator/owner |
| 5 | `E_NOT_PUBLISHED` | Music must be published first |
| 6 | `E_INVALID_PAYMENT` | Payment must be >= listen price |
| 4 | `E_EARLY_UNSTAKE` | Wait until unlock_epoch |

---

## 🎯 Music Status Values

```typescript
enum MusicStatus {
  DRAFT = 0,      // Just created, not public
  PUBLISHED = 1,  // Live, can be listened to
  FROZEN = 2,     // Emergency stop
}
```

---

## 📦 Object Types

| Type | Key | Store | Description |
|------|-----|-------|-------------|
| `Music` | ✅ | ✅ | Main music NFT |
| `ListenCap` | ✅ | ❌ | Time-limited listening token |
| `StakePosition` | ✅ | ❌ | Locked stake |
| `RemixCap` | ✅ | ✅ | Permission to remix |
| `Badge` | ✅ | ✅ | Gamification NFT |

---

## 🕐 Time Constants

```typescript
const LISTEN_CAP_DURATION = 86400000; // 24 hours in ms
const MIN_LOCK_EPOCHS = 1;
const MAX_LOCK_EPOCHS = 100;
```

---

## 📝 Default Values

```typescript
const DEFAULT_LISTEN_PRICE = 1_000_000; // 0.001 SUI
const MAX_ROYALTY_BPS = 10000; // 100%
const CREATOR_SHARE_BPS = 7000; // 70%
const PLATFORM_SHARE_BPS = 2000; // 20%
const PARENT_SHARE_BPS = 1000; // 10%
```

---

## 🔍 Query Examples

### Get Music Data
```typescript
const music = await client.getObject({
  id: musicId,
  options: { showContent: true },
});

const {
  creator,
  audio_cid,
  preview_cid,
  total_listens,
  revenue_pool,
  status,
  royalty_bps,
  parent,
} = music.data.content.fields;
```

### Get Listen Price
```typescript
const config = await client.getObject({
  id: LISTEN_CONFIG_ID,
  options: { showContent: true },
});

const price = config.data.content.fields.listen_price;
```

### Get Treasury Balance
```typescript
const treasury = await client.getObject({
  id: TREASURY_ID,
  options: { showContent: true },
});

const balance = treasury.data.content.fields.balance;
```

---

## 🚀 Deployment Command

```bash
sui client publish --gas-budget 100000000
```

Then save all created object IDs!

---

## 📚 Documentation Files

- `COMPLETION_REPORT.md` - Full status & completion summary
- `FRONTEND_INTEGRATION.md` - Complete integration guide
- `CONTRACT_STATUS.md` - Requirements checklist
- `SMART_CONTRACT_FLOW.md` - Original flow docs

---

**Version:** 1.0.0  
**Status:** ✅ PRODUCTION READY
