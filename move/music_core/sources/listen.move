/// Listen Module - Pay-to-Listen Primitive (MVP - Simplified)
/// Simple pay-per-listen with ListenCap for Walrus decryption
module music_core::listen;

use music_core::music::{Self, Music};
use music_core::treasury::{Self, Treasury};
use std::option::{Self, Option};
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const LISTEN_DURATION_MS: u64 = 86400000; // 24 hours
const VERSION: u64 = 1; // For seal pattern versioning

// Revenue split (basis points)
const CREATOR_SHARE_BPS: u64 = 7000; // 70%
const PLATFORM_SHARE_BPS: u64 = 2000; // 20%
const PARENT_SHARE_BPS: u64 = 1000; // 10%
const TOTAL_BPS: u64 = 10000;

// ======== Errors ========
const EInsufficientPayment: u64 = 1;
const EMusicNotPublished: u64 = 2;
const ENoAccess: u64 = 3;
const EWrongVersion: u64 = 4;
const EInsufficientBalance: u64 = 5;
const ENotParentOwner: u64 = 6;

// ======== Structs ========
/// ListenCap - Time-based access token for music listening
public struct ListenCap has key {
    id: UID,
    music_id: ID,
    listener: address,
    created_at: u64,
    expires_at: u64,
    version: u64,
}

/// ListenConfig shared object
public struct ListenConfig has key {
    id: UID,
    listen_price: u64, // Price in MIST
}

/// ListenAdminCap
public struct ListenAdminCap has key, store {
    id: UID,
}

/// ParentRoyaltyPool - Stores unclaimed parent royalties
/// Parent creators can claim their accumulated royalties
public struct ParentRoyaltyPool has key {
    id: UID,
    // Map: Music ID → Balance<SUI>
    balances: Table<ID, Balance<SUI>>,
    total_accumulated: u64,
    total_claimed: u64,
}

// ======== Events ========
public struct ListenCapMinted has copy, drop {
    cap_id: ID,
    music_id: ID,
    listener: address,
    expires_at: u64,
    price_paid: u64,
}

public struct RevenueDistributed has copy, drop {
    music_id: ID,
    creator_amount: u64,
    platform_amount: u64,
    parent_amount: u64,
}

public struct ParentRoyaltyAdded has copy, drop {
    parent_music_id: ID,
    amount: u64,
    total_balance: u64,
}

public struct ParentRoyaltyClaimed has copy, drop {
    parent_music_id: ID,
    claimer: address,
    amount: u64,
}

// ======== Init Function ========
fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);

    let config = ListenConfig {
        id: object::new(ctx),
        listen_price: 1_000_000, // 0.001 SUI default
    };
    transfer::share_object(config);

    let parent_pool = ParentRoyaltyPool {
        id: object::new(ctx),
        balances: table::new(ctx),
        total_accumulated: 0,
        total_claimed: 0,
    };
    transfer::share_object(parent_pool);

    let admin_cap = ListenAdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, admin);
}

// ======== Public Functions ========
/// Listen to music - mint ListenCap and distribute revenue (MVP)
public fun listen(
    music: &mut Music,
    mut payment: Coin<SUI>,
    treasury: &mut Treasury,
    parent_pool: &mut ParentRoyaltyPool,
    config: &ListenConfig,
    clock: &Clock,
    ctx: &mut TxContext,
): ListenCap {
    assert!(music::is_published(music), EMusicNotPublished);

    let paid_amount = coin::value(&payment);
    assert!(paid_amount >= config.listen_price, EInsufficientPayment);

    // Calculate revenue split with proper rounding
    let creator_amount = (paid_amount * CREATOR_SHARE_BPS) / TOTAL_BPS;
    let platform_amount = (paid_amount * PLATFORM_SHARE_BPS) / TOTAL_BPS;
    let parent_amount = (paid_amount * PARENT_SHARE_BPS) / TOTAL_BPS;

    // Handle rounding loss to creator
    let total_distributed = creator_amount + platform_amount + parent_amount;
    let mut creator_amount = creator_amount;
    if (total_distributed < paid_amount) {
        creator_amount = creator_amount + (paid_amount - total_distributed);
    };

    // Split payment
    let creator_coin = coin::split(&mut payment, creator_amount, ctx);
    let platform_coin = coin::split(&mut payment, platform_amount, ctx);
    let parent_coin = payment; // Remaining

    // Distribute to creator
    music::add_revenue(music, creator_coin);

    // Distribute to platform
    treasury.deposit(platform_coin);

    // Handle parent royalty
    let parent_opt = music::parent(music);
    if (option::is_some(&parent_opt)) {
        let parent_music_id = *option::borrow(&parent_opt);

        // Add to parent royalty pool
        add_parent_royalty(parent_pool, parent_music_id, parent_coin);

        // Emit parent royalty event
        music::emit_parent_royalty(parent_music_id, parent_amount);
    } else {
        // No parent, add remainder to creator
        music::add_revenue(music, parent_coin);
    };

    // Emit revenue distribution event
    event::emit(RevenueDistributed {
        music_id: music::id(music),
        creator_amount,
        platform_amount,
        parent_amount,
    });

    // Increment listen count
    music::increment_listens(music);

    // Create ListenCap
    let music_id = music::id(music);
    let listener = tx_context::sender(ctx);
    let created_at = clock::timestamp_ms(clock);
    let expires_at = created_at + LISTEN_DURATION_MS;

    let cap = ListenCap {
        id: object::new(ctx),
        music_id,
        listener,
        created_at,
        expires_at,
        version: VERSION,
    };

    event::emit(ListenCapMinted {
        cap_id: object::id(&cap),
        music_id,
        listener,
        expires_at,
        price_paid: paid_amount,
    });

    cap
}

// ======== Parent Royalty Functions ========

/// Add parent royalty to pool (internal)
fun add_parent_royalty(pool: &mut ParentRoyaltyPool, parent_music_id: ID, payment: Coin<SUI>) {
    let amount = coin::value(&payment);
    let balance_to_add = coin::into_balance(payment);

    // Add to existing balance or create new entry
    if (table::contains(&pool.balances, parent_music_id)) {
        let existing_balance = table::borrow_mut(&mut pool.balances, parent_music_id);
        balance::join(existing_balance, balance_to_add);
    } else {
        table::add(&mut pool.balances, parent_music_id, balance_to_add);
    };

    pool.total_accumulated = pool.total_accumulated + amount;

    let total_balance = balance::value(table::borrow(&pool.balances, parent_music_id));

    event::emit(ParentRoyaltyAdded {
        parent_music_id,
        amount,
        total_balance,
    });
}

/// Claim parent royalty (only parent owner can claim)
public fun claim_parent_royalty(
    parent_music: &Music,
    pool: &mut ParentRoyaltyPool,
    ctx: &mut TxContext,
): Coin<SUI> {
    let parent_music_id = music::id(parent_music);
    let claimer = tx_context::sender(ctx);

    // Verify caller is parent music owner
    assert!(music::creator(parent_music) == claimer, ENotParentOwner);

    // Check if parent has accumulated royalties
    assert!(table::contains(&pool.balances, parent_music_id), EInsufficientBalance);

    // Get balance
    let balance_ref = table::borrow(&pool.balances, parent_music_id);
    let amount = balance::value(balance_ref);
    assert!(amount > 0, EInsufficientBalance);

    // Remove and convert to coin
    let balance_to_withdraw = table::remove(&mut pool.balances, parent_music_id);
    let withdrawn = coin::from_balance(balance_to_withdraw, ctx);

    pool.total_claimed = pool.total_claimed + amount;

    event::emit(ParentRoyaltyClaimed {
        parent_music_id,
        claimer,
        amount,
    });

    withdrawn
}

/// Check parent royalty balance
public fun get_parent_balance(pool: &ParentRoyaltyPool, parent_music_id: ID): u64 {
    if (table::contains(&pool.balances, parent_music_id)) {
        balance::value(table::borrow(&pool.balances, parent_music_id))
    } else {
        0
    }
}

// ======== Seal Pattern Functions ========

/// Check policy for decryption (from SEAL)
fun check_listen_policy(caller: address, key_id: vector<u8>, cap: &ListenCap, clock: &Clock): bool {
    assert!(cap.version == VERSION, EWrongVersion);
    if (cap.listener != caller) return false;
    if (clock::timestamp_ms(clock) >= cap.expires_at) return false;

    let prefix = cap.music_id.to_bytes();
    let mut i = 0;
    if (prefix.length() > key_id.length()) return false;

    while (i < prefix.length()) {
        if (prefix[i] != key_id[i]) return false;
        i = i + 1;
    };

    true
}

/// Seal approve entry for Walrus integration
entry fun seal_approve(key_id: vector<u8>, cap: &ListenCap, clock: &Clock, ctx: &TxContext) {
    assert!(check_listen_policy(tx_context::sender(ctx), key_id, cap, clock), ENoAccess);
}

/// Check if ListenCap is still valid
public fun is_valid(cap: &ListenCap, clock: &Clock): bool {
    clock::timestamp_ms(clock) < cap.expires_at
}

/// Burn expired ListenCap
public fun burn_cap(cap: ListenCap) {
    let ListenCap {
        id,
        music_id: _,
        listener: _,
        created_at: _,
        expires_at: _,
        version: _,
    } = cap;
    object::delete(id);
}

// ======== Admin Functions ========

public fun update_listen_price(
    config: &mut ListenConfig,
    _admin_cap: &ListenAdminCap,
    new_price: u64,
) {
    config.listen_price = new_price;
}

public fun transfer_admin_cap(admin_cap: ListenAdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

// ======== Getter Functions ========

public fun music_id(cap: &ListenCap): ID {
    cap.music_id
}

public fun listener(cap: &ListenCap): address {
    cap.listener
}

public fun expires_at(cap: &ListenCap): u64 {
    cap.expires_at
}

public fun listen_price(config: &ListenConfig): u64 {
    config.listen_price
}

public fun total_accumulated(pool: &ParentRoyaltyPool): u64 {
    pool.total_accumulated
}

public fun total_claimed(pool: &ParentRoyaltyPool): u64 {
    pool.total_claimed
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
