/// Subscription Module - Recurring access to music
module music_core::subscription;

use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const SUBSCRIPTION_DURATION_MS: u64 = 2592000000; // 30 days

// Subscription tiers
const TIER_BASIC: u8 = 1;
const TIER_PREMIUM: u8 = 2;
const TIER_UNLIMITED: u8 = 3;

// ======== Errors ========
const EInsufficientPayment: u64 = 1;
const ESubscriptionExpired: u64 = 2;
const EInvalidTier: u64 = 3;

// ======== Structs ========

/// Subscription NFT - grants access to music
/// Removed 'store' to prevent unauthorized transfers
struct Subscription has key {
    id: UID,
    subscriber: address,
    tier: u8,
    started_at: u64,
    expires_at: u64,
    auto_renew: bool,
}

/// Subscription configuration
struct SubscriptionConfig has key {
    id: UID,
    basic_price: u64,
    premium_price: u64,
    unlimited_price: u64,
    admin: address,
}

/// Admin capability for subscription module
struct SubscriptionAdminCap has key, store {
    id: UID,
}

// ======== Events ========

struct SubscriptionCreated has copy, drop {
    subscription_id: ID,
    subscriber: address,
    tier: u8,
    expires_at: u64,
}

struct SubscriptionRenewed has copy, drop {
    subscription_id: ID,
    new_expires_at: u64,
}

struct SubscriptionCancelled has copy, drop {
    subscription_id: ID,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);

    let config = SubscriptionConfig {
        id: object::new(ctx),
        basic_price: 5_000_000, // 0.005 SUI
        premium_price: 10_000_000, // 0.01 SUI
        unlimited_price: 20_000_000, // 0.02 SUI
        admin,
    };
    transfer::share_object(config);

    let admin_cap = SubscriptionAdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, admin);
}

// ======== Public Functions ========

/// Subscribe to a tier
public fun subscribe(
    tier: u8,
    payment: Coin<SUI>,
    config: &SubscriptionConfig,
    clock: &Clock,
    ctx: &mut TxContext,
): Subscription {
    // Verify tier and payment
    let required_price = get_tier_price(config, tier);
    assert!(coin::value(&payment) >= required_price, EInsufficientPayment);

    // Send payment to config admin (treasury)
    transfer::public_transfer(payment, config.admin);

    // Create subscription
    let sub_id = object::new(ctx);
    let subscriber = tx_context::sender(ctx);
    let started_at = clock::timestamp_ms(clock);
    let expires_at = started_at + SUBSCRIPTION_DURATION_MS;

    event::emit(SubscriptionCreated {
        subscription_id: object::uid_to_inner(&sub_id),
        subscriber,
        tier,
        expires_at,
    });

    Subscription {
        id: sub_id,
        subscriber,
        tier,
        started_at,
        expires_at,
        auto_renew: false,
    }
}

/// Renew subscription
public fun renew_subscription(
    subscription: &mut Subscription,
    payment: Coin<SUI>,
    config: &SubscriptionConfig,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(subscription.subscriber == tx_context::sender(ctx), EInsufficientPayment);

    let required_price = get_tier_price(config, subscription.tier);
    assert!(coin::value(&payment) >= required_price, EInsufficientPayment);

    // Send payment to config admin (treasury)
    transfer::public_transfer(payment, config.admin);

    // Extend expiration
    let current_time = clock::timestamp_ms(clock);
    if (subscription.expires_at > current_time) {
        // Add to existing time
        subscription.expires_at = subscription.expires_at + SUBSCRIPTION_DURATION_MS;
    } else {
        // Expired, start fresh
        subscription.expires_at = current_time + SUBSCRIPTION_DURATION_MS;
    };

    event::emit(SubscriptionRenewed {
        subscription_id: object::uid_to_inner(&subscription.id),
        new_expires_at: subscription.expires_at,
    });
}

/// Cancel subscription (disable auto-renew)
public fun cancel_subscription(subscription: &mut Subscription, ctx: &TxContext) {
    assert!(subscription.subscriber == tx_context::sender(ctx), EInsufficientPayment);
    subscription.auto_renew = false;

    event::emit(SubscriptionCancelled {
        subscription_id: object::uid_to_inner(&subscription.id),
    });
}

/// Check if subscription is active
public fun is_active(subscription: &Subscription, clock: &Clock): bool {
    clock::timestamp_ms(clock) < subscription.expires_at
}

/// Upgrade subscription tier
public fun upgrade_tier(
    subscription: &mut Subscription,
    new_tier: u8,
    payment: Coin<SUI>,
    config: &SubscriptionConfig,
    ctx: &TxContext,
) {
    assert!(subscription.subscriber == tx_context::sender(ctx), EInsufficientPayment);
    assert!(new_tier > subscription.tier, EInvalidTier);

    let price_diff = get_tier_price(config, new_tier) - get_tier_price(config, subscription.tier);
    assert!(coin::value(&payment) >= price_diff, EInsufficientPayment);

    transfer::public_transfer(payment, config.admin);
    subscription.tier = new_tier;
}

/// Update subscription prices (admin only)
public fun update_prices(
    config: &mut SubscriptionConfig,
    _admin_cap: &SubscriptionAdminCap,
    basic_price: u64,
    premium_price: u64,
    unlimited_price: u64,
) {
    config.basic_price = basic_price;
    config.premium_price = premium_price;
    config.unlimited_price = unlimited_price;
}

/// Transfer admin capability
public fun transfer_admin_cap(admin_cap: SubscriptionAdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

// ======== Helper Functions ========

fun get_tier_price(config: &SubscriptionConfig, tier: u8): u64 {
    if (tier == TIER_BASIC) {
        config.basic_price
    } else if (tier == TIER_PREMIUM) {
        config.premium_price
    } else if (tier == TIER_UNLIMITED) {
        config.unlimited_price
    } else {
        abort EInvalidTier
    }
}

// ======== Getter Functions ========

public fun get_tier(subscription: &Subscription): u8 {
    subscription.tier
}

public fun get_expires_at(subscription: &Subscription): u64 {
    subscription.expires_at
}

public fun get_subscriber(subscription: &Subscription): address {
    subscription.subscriber
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
