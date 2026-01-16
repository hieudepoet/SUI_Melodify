/// Core Music Asset Module
/// This is the central asset of the entire protocol
module music_core::music;

use std::option::{Self, Option};
use std::string::String;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const STATUS_DRAFT: u8 = 0;
const STATUS_PUBLISHED: u8 = 1;
const STATUS_FROZEN: u8 = 2;

const MAX_ROYALTY_BPS: u16 = 10000; // 100%
const VERSION: u64 = 1; // For seal pattern versioning

// ======== Errors ========
const EInvalidRoyalty: u64 = 1;
const ENotOwner: u64 = 2;
const EAlreadyPublished: u64 = 3;
const EMusicFrozen: u64 = 4;
const ENotPublished: u64 = 5;
const EInsufficientPayment: u64 = 6;
const ENoAccess: u64 = 7;
const EWrongVersion: u64 = 8;

// ======== Structs ========

/// Core Music Asset - Ownable, Tradable, Revenue-generating
/// Removed 'store' to apply seal pattern - only this module can wrap/unwrap
struct Music has key {
    id: UID,
    creator: address,
    audio_cid: String, // Walrus CID (encrypted)
    metadata_uri: String, // JSON metadata
    cover_uri: String, // Cover image URI
    parent: Option<ID>, // Remix lineage
    total_listens: u64,
    revenue_pool: Balance<SUI>,
    royalty_bps: u16, // Basis points (e.g., 1000 = 10%)
    status: u8, // Draft | Published | Frozen
    version: u64, // For seal pattern
}

/// One-time capability to initialize the module
struct MusicRegistry has key {
    id: UID,
    total_music_count: u64,
}

// ======== Events ========

struct MusicCreated has copy, drop {
    music_id: ID,
    creator: address,
    audio_cid: String,
}

struct MusicPublished has copy, drop {
    music_id: ID,
    creator: address,
}

struct RevenueAdded has copy, drop {
    music_id: ID,
    amount: u64,
}

struct RevenueWithdrawn has copy, drop {
    music_id: ID,
    recipient: address,
    amount: u64,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let registry = MusicRegistry {
        id: object::new(ctx),
        total_music_count: 0,
    };
    transfer::share_object(registry);
}

// ======== Public Functions ========

/// Create a new Music object (Draft state)
public fun create_music(
    audio_cid: String,
    metadata_uri: String,
    cover_uri: String,
    royalty_bps: u16,
    parent: Option<ID>,
    registry: &mut MusicRegistry,
    ctx: &mut TxContext,
): Music {
    assert!(royalty_bps <= MAX_ROYALTY_BPS, EInvalidRoyalty);

    let music_id = object::new(ctx);
    let creator = tx_context::sender(ctx);

    event::emit(MusicCreated {
        music_id: object::uid_to_inner(&music_id),
        creator,
        audio_cid,
    });

    registry.total_music_count = registry.total_music_count + 1;

    Music {
        id: music_id,
        creator,
        audio_cid,
        metadata_uri,
        cover_uri,
        parent,
        total_listens: 0,
        revenue_pool: balance::zero(),
        royalty_bps,
        status: STATUS_DRAFT,
        version: VERSION,
    }
}

/// Publish music (make it available for listening)
public fun publish_music(music: &mut Music, ctx: &TxContext) {
    assert!(music.creator == tx_context::sender(ctx), ENotOwner);
    assert!(music.status == STATUS_DRAFT, EAlreadyPublished);

    music.status = STATUS_PUBLISHED;

    event::emit(MusicPublished {
        music_id: object::uid_to_inner(&music.id),
        creator: music.creator,
    });
}

/// Add revenue to music pool (called by listen module)
public fun add_revenue(music: &mut Music, payment: Coin<SUI>) {
    assert!(music.status == STATUS_PUBLISHED, ENotPublished);

    let amount = coin::value(&payment);
    let balance_to_add = coin::into_balance(payment);
    balance::join(&mut music.revenue_pool, balance_to_add);

    event::emit(RevenueAdded {
        music_id: object::uid_to_inner(&music.id),
        amount,
    });
}

/// Withdraw revenue from music pool (owner only)
public fun withdraw_revenue(music: &mut Music, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    assert!(music.creator == tx_context::sender(ctx), ENotOwner);
    assert!(music.status != STATUS_FROZEN, EMusicFrozen);
    assert!(balance::value(&music.revenue_pool) >= amount, EInsufficientPayment);

    let withdrawn = coin::from_balance(
        balance::split(&mut music.revenue_pool, amount),
        ctx,
    );

    event::emit(RevenueWithdrawn {
        music_id: object::uid_to_inner(&music.id),
        recipient: tx_context::sender(ctx),
        amount,
    });

    withdrawn
}

/// Increment listen count (called by listen module)
public fun increment_listens(music: &mut Music) {
    music.total_listens = music.total_listens + 1;
}

/// Freeze music (emergency only)
public fun freeze_music(music: &mut Music, ctx: &TxContext) {
    assert!(music.creator == tx_context::sender(ctx), ENotOwner);
    music.status = STATUS_FROZEN;
}

// ======== Getter Functions ========

public fun get_creator(music: &Music): address {
    music.creator
}

public fun get_audio_cid(music: &Music): String {
    music.audio_cid
}

public fun get_parent(music: &Music): Option<ID> {
    music.parent
}

public fun get_total_listens(music: &Music): u64 {
    music.total_listens
}

public fun get_revenue_balance(music: &Music): u64 {
    balance::value(&music.revenue_pool)
}

public fun get_royalty_bps(music: &Music): u16 {
    music.royalty_bps
}

public fun get_status(music: &Music): u8 {
    music.status
}

public fun is_published(music: &Music): bool {
    music.status == STATUS_PUBLISHED
}

public fun get_id(music: &Music): ID {
    object::uid_to_inner(&music.id)
}

// ======== Walrus Seal Pattern Integration ========

/// Check policy for Walrus decryption access (owner only)
/// Key format: [music_id][nonce]
/// Validates: Music ownership and key prefix
fun check_owner_policy(caller: address, key_id: vector<u8>, music: &Music): bool {
    // Check version
    assert!(music.version == VERSION, EWrongVersion);

    // Check if caller is the creator/owner
    if (music.creator != caller) {
        return false
    };

    // Check if key_id has correct prefix [music_id]
    let prefix = object::uid_to_inner(&music.id).to_bytes();
    let mut i = 0;

    if (prefix.length() > key_id.length()) {
        return false
    };

    while (i < prefix.length()) {
        if (prefix[i] != key_id[i]) {
            return false
        };
        i = i + 1;
    };

    true
}

/// Seal approve entry function for Music owner
/// Allows owner to access encrypted audio for editing/remixing
entry fun seal_approve_owner(key_id: vector<u8>, music: &Music, ctx: &TxContext) {
    assert!(check_owner_policy(ctx.sender(), key_id, music), ENoAccess);
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
