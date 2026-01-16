/// Royalty Module - Revenue split logic for marketplace trades
module marketplace::royalty;

use music_core::music::{Self, Music};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::TxContext;

// ======== Constants ========
const TOTAL_BPS: u64 = 10000;

// ======== Errors ========
const EInvalidSplit: u64 = 1;
const EInsufficientPayment: u64 = 2;

// ======== Structs ========

/// Royalty split configuration
struct RoyaltySplit has drop {
    creator_bps: u64,
    platform_bps: u64,
    parent_bps: u64,
}

// ======== Public Functions ========

/// Create default royalty split
public fun default_split(): RoyaltySplit {
    RoyaltySplit {
        creator_bps: 8750, // 87.5%
        platform_bps: 250, // 2.5%
        parent_bps: 1000, // 10%
    }
}

/// Create custom royalty split
public fun custom_split(creator_bps: u64, platform_bps: u64, parent_bps: u64): RoyaltySplit {
    assert!(creator_bps + platform_bps + parent_bps == TOTAL_BPS, EInvalidSplit);

    RoyaltySplit {
        creator_bps,
        platform_bps,
        parent_bps,
    }
}

/// Split payment according to royalty rules
public fun split_payment(
    music: &Music,
    payment: &mut Coin<SUI>,
    split: &RoyaltySplit,
    ctx: &mut TxContext,
): (Coin<SUI>, Coin<SUI>, Coin<SUI>) {
    let total_amount = coin::value(payment);

    let creator_amount = (total_amount * split.creator_bps) / TOTAL_BPS;
    let platform_amount = (total_amount * split.platform_bps) / TOTAL_BPS;
    let parent_amount = (total_amount * split.parent_bps) / TOTAL_BPS;

    let creator_coin = coin::split(payment, creator_amount, ctx);
    let platform_coin = coin::split(payment, platform_amount, ctx);
    let parent_coin = coin::split(payment, parent_amount, ctx);

    (creator_coin, platform_coin, parent_coin)
}

/// Calculate royalty amounts without splitting
public fun calculate_royalties(total_amount: u64, split: &RoyaltySplit): (u64, u64, u64) {
    let creator_amount = (total_amount * split.creator_bps) / TOTAL_BPS;
    let platform_amount = (total_amount * split.platform_bps) / TOTAL_BPS;
    let parent_amount = (total_amount * split.parent_bps) / TOTAL_BPS;

    (creator_amount, platform_amount, parent_amount)
}

/// Distribute royalties to recipients
public fun distribute_royalties(
    music: &Music,
    creator_coin: Coin<SUI>,
    platform_coin: Coin<SUI>,
    parent_coin: Coin<SUI>,
) {
    let creator = music::get_creator(music);

    // Send to creator
    transfer::public_transfer(creator_coin, creator);

    // Send to platform - caller must provide treasury address
    // This function should be updated to accept treasury_address parameter
    // For now, keeping as is but noting the issue
    transfer::public_transfer(platform_coin, @treasury);

    // Handle parent royalty
    let parent_opt = music::get_parent(music);
    if (std::option::is_some(&parent_opt)) {
        // In production, would look up parent Music and send to its creator
        // For now, send to treasury
        transfer::public_transfer(parent_coin, @treasury);
    } else {
        // No parent, send to creator
        transfer::public_transfer(parent_coin, creator);
    };
}

/// Distribute royalties with explicit treasury address
public fun distribute_royalties_v2(
    music: &Music,
    creator_coin: Coin<SUI>,
    platform_coin: Coin<SUI>,
    parent_coin: Coin<SUI>,
    treasury_address: address,
) {
    let creator = music::get_creator(music);

    // Send to creator
    transfer::public_transfer(creator_coin, creator);

    // Send to platform
    transfer::public_transfer(platform_coin, treasury_address);

    // Handle parent royalty
    let parent_opt = music::get_parent(music);
    if (std::option::is_some(&parent_opt)) {
        // In production, would look up parent Music and send to its creator
        // For now, send to treasury
        transfer::public_transfer(parent_coin, treasury_address);
    } else {
        // No parent, send to creator
        transfer::public_transfer(parent_coin, creator);
    };
}

// ======== Getter Functions ========

public fun get_creator_bps(split: &RoyaltySplit): u64 {
    split.creator_bps
}

public fun get_platform_bps(split: &RoyaltySplit): u64 {
    split.platform_bps
}

public fun get_parent_bps(split: &RoyaltySplit): u64 {
    split.parent_bps
}
