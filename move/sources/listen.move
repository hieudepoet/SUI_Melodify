/// Listen Module - Pay-to-Listen Primitive
/// Handles ListenCap minting and revenue distribution
module music_core::listen;

use music_core::music::{Self, Music};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
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

// ======== Structs ========

/// ListenCap - Proof of attention, gates audio decryption
/// Removed 'store' to prevent unauthorized transfers
/// Used for Walrus seal pattern - time-based access
struct ListenCap has key {
    id: UID,
    music_id: ID,
    listener: address,
    expires_at: u64,
    version: u64, // For seal pattern
}

/// Platform treasury for collecting fees
struct PlatformTreasury has key {
    id: UID,
    balance: u64,
    admin: address,
}

/// Admin capability for listen module
struct ListenAdminCap has key, store {
    id: UID,
}

/// Listen configuration
struct ListenConfig has key {
    id: UID,
    listen_price: u64, // Price in MIST
}

// ======== Events ========

struct ListenCapMinted has copy, drop {
    cap_id: ID,
    music_id: ID,
    listener: address,
    expires_at: u64,
    price_paid: u64,
}

struct RevenueDistributed has copy, drop {
    music_id: ID,
    creator_amount: u64,
    platform_amount: u64,
    parent_amount: u64,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);

    let treasury = PlatformTreasury {
        id: object::new(ctx),
        balance: 0,
        admin,
    };
    transfer::share_object(treasury);

    let config = ListenConfig {
        id: object::new(ctx),
        listen_price: 1_000_000, // 0.001 SUI default
    };
    transfer::share_object(config);

    let admin_cap = ListenAdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, admin);
}

// ======== Public Functions ========

/// Listen to music - mint ListenCap and distribute revenue
public fun listen(
    music: &mut Music,
    payment: Coin<SUI>,
    treasury: &mut PlatformTreasury,
    config: &ListenConfig,
    clock: &Clock,
    ctx: &mut TxContext,
): ListenCap {
    // Verify music is published
    assert!(music::is_published(music), EMusicNotPublished);

    // Verify payment
    let paid_amount = coin::value(&payment);
    assert!(paid_amount >= config.listen_price, EInsufficientPayment);

    // Calculate revenue split with proper rounding
    let creator_amount = (paid_amount * CREATOR_SHARE_BPS) / TOTAL_BPS;
    let platform_amount = (paid_amount * PLATFORM_SHARE_BPS) / TOTAL_BPS;
    let parent_amount = (paid_amount * PARENT_SHARE_BPS) / TOTAL_BPS;

    // Ensure no rounding loss - add remainder to creator
    let total_distributed = creator_amount + platform_amount + parent_amount;
    if (total_distributed < paid_amount) {
        creator_amount = creator_amount + (paid_amount - total_distributed);
    };

    // Split payment
    let creator_coin = coin::split(&mut payment, creator_amount, ctx);
    let platform_coin = coin::split(&mut payment, platform_amount, ctx);
    let parent_coin = payment; // Remaining goes to parent

    // Distribute to creator (add to music revenue pool)
    music::add_revenue(music, creator_coin);

    // Add to platform treasury
    let platform_coin_value = coin::value(&platform_coin);
    treasury.balance = treasury.balance + platform_coin_value;
    transfer::public_transfer(platform_coin, treasury.admin);

    // Handle parent royalty if exists
    let parent_opt = music::get_parent(music);
    if (std::option::is_some(&parent_opt)) {
        // In real implementation, would look up parent Music and add revenue
        // For now, send to treasury admin
        let parent_coin_value = coin::value(&parent_coin);
        treasury.balance = treasury.balance + parent_coin_value;
        transfer::public_transfer(parent_coin, treasury.admin);
    } else {
        // No parent, add to creator
        music::add_revenue(music, parent_coin);
        parent_amount = 0;
    };

    // Increment listen count
    music::increment_listens(music);

    // Create ListenCap
    let cap_id = object::new(ctx);
    let music_id = music::get_id(music);
    let listener = tx_context::sender(ctx);
    let expires_at = clock::timestamp_ms(clock) + LISTEN_DURATION_MS;

    event::emit(ListenCapMinted {
        cap_id: object::uid_to_inner(&cap_id),
        music_id,
        listener,
        expires_at,
        price_paid: paid_amount,
    });

    event::emit(RevenueDistributed {
        music_id,
        creator_amount,
        platform_amount,
        parent_amount,
    });

    ListenCap {
        id: cap_id,
        music_id,
        listener,
        expires_at,
        version: VERSION,
    }
}

// ======== Walrus Seal Pattern Integration ========

/// Check policy for Walrus decryption access
/// Key format: [music_id][nonce]
/// Validates: ListenCap ownership, expiration, and key prefix
fun check_listen_policy(caller: address, key_id: vector<u8>, cap: &ListenCap, clock: &Clock): bool {
    // Check version
    assert!(cap.version == VERSION, EWrongVersion);

    // Check if caller owns the ListenCap
    if (cap.listener != caller) {
        return false
    };

    // Check if ListenCap has expired
    if (clock::timestamp_ms(clock) >= cap.expires_at) {
        return false
    };

    // Check if key_id has correct prefix [music_id]
    let prefix = cap.music_id.to_bytes();
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

/// Seal approve entry function for Walrus integration
/// Called by Walrus to verify access before decryption
entry fun seal_approve(key_id: vector<u8>, cap: &ListenCap, clock: &Clock, ctx: &TxContext) {
    assert!(check_listen_policy(ctx.sender(), key_id, cap, clock), ENoAccess);
}

/// Check if ListenCap is still valid
public fun is_valid(cap: &ListenCap, clock: &Clock): bool {
    clock::timestamp_ms(clock) < cap.expires_at
}

/// Burn expired ListenCap
public fun burn_cap(cap: ListenCap) {
    let ListenCap { id, music_id: _, listener: _, expires_at: _, version: _ } = cap;
    object::delete(id);
}

// ======== Admin Functions ========

/// Update listen price (admin only)
public fun update_listen_price(
    config: &mut ListenConfig,
    _admin_cap: &ListenAdminCap,
    new_price: u64,
) {
    config.listen_price = new_price;
}

/// Transfer admin capability
public fun transfer_admin_cap(admin_cap: ListenAdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

// ======== Getter Functions ========

public fun get_music_id(cap: &ListenCap): ID {
    cap.music_id
}

public fun get_listener(cap: &ListenCap): address {
    cap.listener
}

public fun get_expires_at(cap: &ListenCap): u64 {
    cap.expires_at
}

public fun get_listen_price(config: &ListenConfig): u64 {
    config.listen_price
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
