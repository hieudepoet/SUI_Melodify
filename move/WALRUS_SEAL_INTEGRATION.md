# Walrus Seal Pattern Integration

## Tổng quan

Smart contract đã được tích hợp **Seal Pattern** theo chuẩn Mysten Labs để hỗ trợ Walrus encryption/decryption. Pattern này cho phép kiểm soát quyền truy cập vào dữ liệu được mã hóa trên Walrus.

## Seal Pattern là gì?

Seal Pattern là một access control pattern cho phép:
- Mã hóa dữ liệu với một `key_id` cụ thể
- Chỉ những địa chỉ thỏa mãn policy mới có thể giải mã
- Walrus gọi `seal_approve` entry function để verify quyền truy cập

## Key Format

Theo chuẩn Mysten Labs, key format là:
```
[object_id][nonce]
```

Trong project này:
- **Music owner access**: `[music_id][nonce]`
- **Listener access**: `[music_id][nonce]`

## Implementation

### 1. Music Module - Owner Access

**Use case:** Owner cần truy cập audio gốc để edit/remix

**Struct:**
```move
struct Music has key {
    id: UID,
    creator: address,
    audio_cid: String, // Walrus CID (encrypted)
    // ... other fields
    version: u64, // For seal pattern
}
```

**Seal Approve Function:**
```move
entry fun seal_approve_owner(
    key_id: vector<u8>,
    music: &Music,
    ctx: &TxContext,
)
```

**Policy Check:**
- ✅ Caller phải là `music.creator`
- ✅ `key_id` phải có prefix là `music_id`
- ✅ Version phải khớp

**Flow:**
1. Owner upload audio lên Walrus với encryption
2. Walrus trả về `blob_id` và `key_id = [music_id][nonce]`
3. Owner lưu `blob_id` vào `audio_cid` field
4. Khi cần decrypt, Walrus gọi `seal_approve_owner` để verify
5. Nếu pass, Walrus cho phép decrypt

---

### 2. Listen Module - Temporary Access

**Use case:** Listener trả phí để nghe nhạc trong 24h

**Struct:**
```move
struct ListenCap has key {
    id: UID,
    music_id: ID,
    listener: address,
    expires_at: u64,
    version: u64, // For seal pattern
}
```

**Seal Approve Function:**
```move
entry fun seal_approve(
    key_id: vector<u8>,
    cap: &ListenCap,
    clock: &Clock,
    ctx: &TxContext,
)
```

**Policy Check:**
- ✅ Caller phải là `cap.listener`
- ✅ `key_id` phải có prefix là `music_id`
- ✅ `ListenCap` chưa hết hạn (check `expires_at`)
- ✅ Version phải khớp

**Flow:**
1. User gọi `listen()` và trả phí
2. Nhận được `ListenCap` với `expires_at = now + 24h`
3. User request decrypt từ Walrus
4. Walrus gọi `seal_approve` với `ListenCap` reference
5. Nếu pass (chưa hết hạn), Walrus cho phép decrypt
6. Sau 24h, `seal_approve` sẽ fail → không decrypt được

---

## Code Pattern (theo Mysten Labs)

### Version Control
```move
const VERSION: u64 = 1;

// In struct
struct Music has key {
    version: u64,
    // ...
}

// In check_policy
assert!(music.version == VERSION, EWrongVersion);
```

### Prefix Matching
```move
fun check_policy(
    caller: address,
    key_id: vector<u8>,
    object: &Object,
): bool {
    // Get prefix from object ID
    let prefix = object::uid_to_inner(&object.id).to_bytes();
    let mut i = 0;
    
    // Check length
    if (prefix.length() > key_id.length()) {
        return false
    };
    
    // Check each byte
    while (i < prefix.length()) {
        if (prefix[i] != key_id[i]) {
            return false
        };
        i = i + 1;
    };
    
    // Additional checks (ownership, expiration, etc.)
    // ...
    
    true
}
```

### Entry Function
```move
entry fun seal_approve(
    key_id: vector<u8>,
    // ... policy objects
    ctx: &TxContext,
) {
    assert!(check_policy(ctx.sender(), key_id, ...), ENoAccess);
}
```

---

## Integration với Frontend

### 1. Upload Audio (Owner)

```typescript
// 1. Encrypt và upload lên Walrus
const { blobId, keyId } = await walrus.uploadEncrypted(audioFile, {
  keyFormat: `${musicId}${nonce}` // [music_id][nonce]
});

// 2. Create Music NFT với audio_cid
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::music::create_music`,
  arguments: [
    tx.pure.string(blobId), // audio_cid
    // ... other args
  ],
});
```

### 2. Listen to Music (Listener)

```typescript
// 1. Mua ListenCap
const tx = new Transaction();
const listenCap = tx.moveCall({
  target: `${PACKAGE_ID}::listen::listen`,
  arguments: [
    tx.object(musicId),
    tx.object(payment),
    // ... other args
  ],
});

// 2. Request decrypt từ Walrus
const audioBlob = await walrus.decrypt(blobId, {
  sealApprove: {
    packageId: PACKAGE_ID,
    module: 'listen',
    function: 'seal_approve',
    args: [keyId, listenCapId, clockId],
  },
});

// 3. Play audio
audioPlayer.play(audioBlob);
```

### 3. Owner Access (Edit/Remix)

```typescript
// Owner có thể decrypt bất cứ lúc nào
const audioBlob = await walrus.decrypt(blobId, {
  sealApprove: {
    packageId: PACKAGE_ID,
    module: 'music',
    function: 'seal_approve_owner',
    args: [keyId, musicId],
  },
});
```

---

## Security Considerations

### ✅ Đã implement

1. **Seal Pattern** - Loại bỏ `store` ability để ngăn wrap/unwrap
2. **Version Control** - Hỗ trợ upgrade trong tương lai
3. **Prefix Matching** - Đảm bảo key_id đúng format
4. **Time-based Access** - ListenCap có expiration
5. **Owner-only Access** - Chỉ creator mới decrypt được

### ⚠️ Lưu ý

1. **Nonce Management**: Frontend phải generate nonce unique cho mỗi upload
2. **Key Storage**: `key_id` phải được lưu để decrypt sau này
3. **Expiration Handling**: Frontend phải check `expires_at` trước khi request decrypt
4. **Error Handling**: Handle `ENoAccess` error khi seal_approve fail

---

## Testing

### Test Owner Access
```move
#[test]
fun test_seal_approve_owner() {
    let ctx = &mut tx_context::dummy();
    let (mut registry) = music::init_for_testing(ctx);
    
    // Create music
    let music = music::create_music(
        b"walrus_blob_id".to_string(),
        // ... other args
        &mut registry,
        ctx,
    );
    
    // Test valid key_id
    let mut key_id = object::id(&music).to_bytes();
    key_id.push_back(123); // nonce
    
    assert!(check_owner_policy(ctx.sender(), key_id, &music));
    
    // Test invalid caller
    assert!(!check_owner_policy(@0x999, key_id, &music));
}
```

### Test Listener Access
```move
#[test]
fun test_seal_approve_listener() {
    let ctx = &mut tx_context::dummy();
    let clock = clock::create_for_testing(ctx);
    
    // Create ListenCap
    let cap = listen::listen(/* ... */);
    
    // Test valid access
    let mut key_id = cap.music_id.to_bytes();
    key_id.push_back(123);
    
    assert!(check_listen_policy(cap.listener, key_id, &cap, &clock));
    
    // Test expired access
    clock.increment_for_testing(86400001); // > 24h
    assert!(!check_listen_policy(cap.listener, key_id, &cap, &clock));
}
```

---

## References

- [Mysten Labs Seal Patterns](https://github.com/MystenLabs/sui/tree/main/examples/move/patterns)
- [Walrus Documentation](https://docs.walrus.site/)
- [Sui Move Book - Capabilities](https://move-book.com/programmability/capability.html)

---

## Changelog

### v1.0.0 (2026-01-15)
- ✅ Implement seal pattern cho Music owner access
- ✅ Implement seal pattern cho ListenCap temporary access
- ✅ Version control support
- ✅ Prefix matching theo chuẩn Mysten Labs
- ✅ Time-based expiration cho listeners
