/// Core Music Asset Module
/// This is the central asset of the entire protocol
module music_core::music;

use std::option::{Self, Option};
use std::string::String;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID, uid_to_inner};
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
public struct Music has key, store {
    // Public struct (2024 change)
    id: UID,
    creator: address,
    audio_cid: String, // Walrus CID (encrypted)
    preview_cid: String, // Added for global preview (unencrypted)
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
public struct MusicRegistry has key {
    // Public struct
    id: UID,
    total_music_count: u64,
}

// ======== Events ========
public struct MusicCreated has copy, drop {
    // Public struct
    music_id: ID,
    creator: address,
    audio_cid: String,
}

public struct MusicPublished has copy, drop {
    music_id: ID,
    creator: address,
}

public struct RevenueAdded has copy, drop {
    music_id: ID,
    amount: u64,
}

public struct RevenueWithdrawn has copy, drop {
    music_id: ID,
    recipient: address,
    amount: u64,
}

public struct ParentRoyalty has copy, drop {
    parent_id: ID,
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
    preview_cid: String, // Added
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

    let music = Music {
        id: music_id,
        creator,
        audio_cid,
        preview_cid, // New
        metadata_uri,
        cover_uri,
        parent,
        total_listens: 0,
        revenue_pool: balance::zero(),
        royalty_bps,
        status: STATUS_DRAFT,
        version: VERSION,
    };

    event::emit(MusicCreated {
        music_id: object::id(&music),
        creator,
        audio_cid,
    });

    registry.total_music_count = registry.total_music_count + 1;

    music
}

/// Publish music (method syntax)
public fun publish(self: &mut Music, ctx: &TxContext) {
    assert!(self.creator == tx_context::sender(ctx), ENotOwner);
    assert!(self.status == STATUS_DRAFT, EAlreadyPublished);

    self.status = STATUS_PUBLISHED;

    event::emit(MusicPublished {
        music_id: object::id(self),
        creator: self.creator,
    });
}

/// Add revenue to music pool (public(package))
public(package) fun add_revenue(self: &mut Music, payment: Coin<SUI>) {
    assert!(self.status == STATUS_PUBLISHED, ENotPublished);
    let amount = coin::value(&payment);
    let mut balance_to_add = coin::into_balance(payment); // let mut
    balance::join(&mut self.revenue_pool, balance_to_add);

    event::emit(RevenueAdded {
        music_id: object::id(self),
        amount,
    });
}

/// Withdraw revenue from music pool (owner only)
public fun withdraw_revenue(self: &mut Music, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    assert!(self.creator == tx_context::sender(ctx), ENotOwner);
    assert!(self.status != STATUS_FROZEN, EMusicFrozen);
    assert!(balance::value(&self.revenue_pool) >= amount, EInsufficientPayment);

    let withdrawn = coin::from_balance(
        balance::split(&mut self.revenue_pool, amount),
        ctx,
    );

    event::emit(RevenueWithdrawn {
        music_id: object::id(self),
        recipient: tx_context::sender(ctx),
        amount,
    });

    withdrawn
}

/// Increment listen count (public(package))
public(package) fun increment_listens(self: &mut Music) {
    self.total_listens = self.total_listens + 1;
}

/// Freeze music (emergency only)
// public fun freeze(self: &mut Music, ctx: &TxContext) {
//     assert!(self.creator == tx_context::sender(ctx), ENotOwner);
//     self.status = STATUS_FROZEN;
// }

/// Emit parent royalty event (public(package))
public(package) fun emit_parent_royalty(parent_id: ID, amount: u64) {
    event::emit(ParentRoyalty {
        parent_id,
        amount,
    });
}

// ======== Getter Functions (method syntax) ========
public fun creator(self: &Music): address {
    self.creator
}

public fun audio_cid(self: &Music): String {
    self.audio_cid
}

public fun preview_cid(self: &Music): String {
    self.preview_cid
}

public fun parent(self: &Music): Option<ID> {
    self.parent
}

public fun total_listens(self: &Music): u64 {
    self.total_listens
}

public fun revenue_balance(self: &Music): u64 {
    balance::value(&self.revenue_pool)
}

public fun royalty_bps(self: &Music): u16 {
    self.royalty_bps
}

public fun status(self: &Music): u8 {
    self.status
}

public fun is_published(self: &Music): bool {
    self.status == STATUS_PUBLISHED
}

public fun id(self: &Music): ID {
    object::id(self)
}

// ======== Walrus Seal Pattern Integration ========
/* Giữ nguyên check_owner_policy và seal_approve_owner, nhưng migrate syntax (e.g., self.method). */

fun check_owner_policy(caller: address, key_id: vector<u8>, self: &Music): bool {
    assert!(self.version == VERSION, EWrongVersion);
    if (self.creator != caller) return false;
    let prefix = object::id(self).to_bytes();
    let mut i = 0;
    if (prefix.length() > key_id.length()) return false;
    while (i < prefix.length()) {
        if (prefix[i] != key_id[i]) return false;
        i = i + 1;
    };
    true
}

entry fun seal_approve_owner(key_id: vector<u8>, self: &Music, ctx: &TxContext) {
    assert!(check_owner_policy(tx_context::sender(ctx), key_id, self), ENoAccess);
}

// ======== Test Functions ========
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
