/// Kiosk Marketplace Module - Sui Kiosk integration for Music NFT trading
/// Implements strong royalty enforcement and decentralized marketplace
module music_core::kiosk_marketplace;

use music_core::music::Music;
use music_core::treasury::Treasury;
use sui::coin::{Self, Coin};
use sui::event;
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::object::{Self, ID};
use sui::package::{Self, Publisher};
use sui::sui::SUI;
use sui::transfer;
use sui::transfer_policy::{Self as policy, TransferPolicy, TransferPolicyCap, TransferRequest};
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const MAX_BPS: u16 = 10_000; // 100%
const DEFAULT_ROYALTY_BPS: u16 = 1000; // 10%
const DEFAULT_PLATFORM_FEE_BPS: u16 = 250; // 2.5%

// ======== Errors ========
const EIncorrectAmount: u64 = 1;
const EInsufficientPayment: u64 = 2;
const ERuleNotSet: u64 = 3;
const EInvalidBPS: u64 = 4;
const ENotListed: u64 = 5;

// ======== Structs ========

/// One-time witness for Publisher
public struct KIOSK_MARKETPLACE has drop {}

/// Royalty Rule - Ensures creator gets paid on every sale
public struct RoyaltyRule has drop {}

/// Platform Fee Rule - Ensures platform gets commission
public struct PlatformFeeRule has drop {}

/// Royalty configuration
public struct RoyaltyConfig has drop, store {
    amount_bps: u16, // Percentage in basis points
    min_amount: u64, // Minimum royalty amount
}

/// Platform fee configuration
public struct PlatformFeeConfig has drop, store {
    amount_bps: u16, // Percentage in basis points
    treasury_address: address, // Where to send platform fees
}

// ======== Events ========

public struct MusicPlacedInKiosk has copy, drop {
    kiosk_id: ID,
    music_id: ID,
    owner: address,
}

public struct MusicListedInKiosk has copy, drop {
    kiosk_id: ID,
    music_id: ID,
    price: u64,
}

public struct MusicPurchasedFromKiosk has copy, drop {
    kiosk_id: ID,
    music_id: ID,
    buyer: address,
    price: u64,
    royalty_paid: u64,
    platform_fee_paid: u64,
}

public struct TransferPolicyCreated has copy, drop {
    policy_id: ID,
    royalty_bps: u16,
    platform_fee_bps: u16,
}

// ======== Init Function ========

fun init(otw: KIOSK_MARKETPLACE, ctx: &mut TxContext) {
    // Claim publisher for the package
    let publisher = package::claim(otw, ctx);
    transfer::public_transfer(publisher, tx_context::sender(ctx));
}

// ======== Kiosk Management Functions ========

/// Create a new Kiosk for selling Music NFTs
public fun create_kiosk(ctx: &mut TxContext): (Kiosk, KioskOwnerCap) {
    kiosk::new(ctx)
}

/// Create and share a new Kiosk (entry function)
public entry fun create_kiosk_entry(ctx: &mut TxContext) {
    let (kiosk, cap) = kiosk::new(ctx);
    transfer::public_share_object(kiosk);
    transfer::public_transfer(cap, tx_context::sender(ctx));
}

/// Place Music NFT into Kiosk
public entry fun place_music(
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    music: Music,
    ctx: &TxContext,
) {
    let music_id = object::id(&music);
    let kiosk_id = object::id(kiosk);
    let owner = tx_context::sender(ctx);

    kiosk::place(kiosk, cap, music);

    event::emit(MusicPlacedInKiosk {
        kiosk_id,
        music_id,
        owner,
    });
}

/// List Music for sale in Kiosk
public entry fun list_music(kiosk: &mut Kiosk, cap: &KioskOwnerCap, music_id: ID, price: u64) {
    kiosk::list<Music>(kiosk, cap, music_id, price);

    event::emit(MusicListedInKiosk {
        kiosk_id: object::id(kiosk),
        music_id,
        price,
    });
}

/// Delist Music from Kiosk
public entry fun delist_music(kiosk: &mut Kiosk, cap: &KioskOwnerCap, music_id: ID) {
    kiosk::delist<Music>(kiosk, cap, music_id);
}

/// Take Music from Kiosk (if not listed)
public fun take_music(kiosk: &mut Kiosk, cap: &KioskOwnerCap, music_id: ID): Music {
    kiosk::take<Music>(kiosk, cap, music_id)
}

// ======== Transfer Policy Functions ========

/// Create TransferPolicy for Music with default rules
public entry fun create_transfer_policy(publisher: &Publisher, ctx: &mut TxContext) {
    let (mut policy, policy_cap) = policy::new<Music>(publisher, ctx);
    let policy_id = object::id(&policy);

    // Add default royalty rule (10%)
    add_royalty_rule(
        &mut policy,
        &policy_cap,
        DEFAULT_ROYALTY_BPS,
        0, // No minimum
    );

    // Add default platform fee rule (2.5%)
    add_platform_fee_rule(
        &mut policy,
        &policy_cap,
        DEFAULT_PLATFORM_FEE_BPS,
        tx_context::sender(ctx), // Treasury address
    );

    event::emit(TransferPolicyCreated {
        policy_id,
        royalty_bps: DEFAULT_ROYALTY_BPS,
        platform_fee_bps: DEFAULT_PLATFORM_FEE_BPS,
    });

    transfer::public_share_object(policy);
    transfer::public_transfer(policy_cap, tx_context::sender(ctx));
}

/// Add royalty rule to TransferPolicy
public fun add_royalty_rule(
    policy: &mut TransferPolicy<Music>,
    cap: &TransferPolicyCap<Music>,
    amount_bps: u16,
    min_amount: u64,
) {
    assert!(amount_bps <= MAX_BPS, EInvalidBPS);

    policy::add_rule(
        RoyaltyRule {},
        policy,
        cap,
        RoyaltyConfig { amount_bps, min_amount },
    );
}

/// Add platform fee rule to TransferPolicy
public fun add_platform_fee_rule(
    policy: &mut TransferPolicy<Music>,
    cap: &TransferPolicyCap<Music>,
    amount_bps: u16,
    treasury_address: address,
) {
    assert!(amount_bps <= MAX_BPS, EInvalidBPS);

    policy::add_rule(
        PlatformFeeRule {},
        policy,
        cap,
        PlatformFeeConfig { amount_bps, treasury_address },
    );
}

/// Remove royalty rule from TransferPolicy
public entry fun remove_royalty_rule(
    policy: &mut TransferPolicy<Music>,
    cap: &TransferPolicyCap<Music>,
) {
    policy::remove_rule<Music, RoyaltyRule, RoyaltyConfig>(
        policy,
        cap,
    );
}

/// Remove platform fee rule from TransferPolicy
public entry fun remove_platform_fee_rule(
    policy: &mut TransferPolicy<Music>,
    cap: &TransferPolicyCap<Music>,
) {
    policy::remove_rule<Music, PlatformFeeRule, PlatformFeeConfig>(
        policy,
        cap,
    );
}

// ======== Purchase Functions ========

/// Purchase Music from Kiosk (2-step process)
/// Step 1: Purchase from kiosk (creates TransferRequest)
/// Step 2: Pay fees and confirm request
public fun purchase_music(
    kiosk: &mut Kiosk,
    music_id: ID,
    payment: Coin<SUI>,
): (Music, TransferRequest<Music>) {
    kiosk::purchase<Music>(kiosk, music_id, payment)
}

/// Pay royalty fee for TransferRequest
public fun pay_royalty(
    policy: &mut TransferPolicy<Music>,
    request: &mut TransferRequest<Music>,
    mut payment: Coin<SUI>,
    ctx: &mut TxContext,
) {
    let paid = policy::paid(request);
    let amount = calculate_royalty_amount(policy, paid);

    assert!(coin::value(&payment) >= amount, EInsufficientPayment);

    let fee = coin::split(&mut payment, amount, ctx);
    policy::add_to_balance(RoyaltyRule {}, policy, fee);
    policy::add_receipt(RoyaltyRule {}, request);

    // Return remaining payment
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, tx_context::sender(ctx));
    } else {
        coin::destroy_zero(payment);
    };
}

/// Pay platform fee for TransferRequest
public fun pay_platform_fee(
    policy: &mut TransferPolicy<Music>,
    request: &mut TransferRequest<Music>,
    mut payment: Coin<SUI>,
    treasury: &mut Treasury,
    ctx: &mut TxContext,
) {
    let paid = policy::paid(request);
    let amount = calculate_platform_fee_amount(policy, paid);

    assert!(coin::value(&payment) >= amount, EInsufficientPayment);

    let fee = coin::split(&mut payment, amount, ctx);

    // Deposit to treasury
    treasury.deposit(fee);

    policy::add_receipt(PlatformFeeRule {}, request);

    // Return remaining payment
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, tx_context::sender(ctx));
    } else {
        coin::destroy_zero(payment);
    };
}

/// Complete purchase by confirming TransferRequest
public fun confirm_purchase(policy: &TransferPolicy<Music>, request: TransferRequest<Music>) {
    policy::confirm_request(policy, request);
}

/// All-in-one purchase function (entry)
/// Buyer provides payment for: price + royalty + platform fee
public entry fun buy_music(
    kiosk: &mut Kiosk,
    music_id: ID,
    price: u64,
    mut payment: Coin<SUI>,
    policy: &mut TransferPolicy<Music>,
    treasury: &mut Treasury,
    ctx: &mut TxContext,
) {
    let buyer = tx_context::sender(ctx);
    let kiosk_id = object::id(kiosk);

    // Check if music is listed and get price
    assert!(kiosk::is_listed(kiosk, music_id), ENotListed);

    // Step 1: Purchase from kiosk
    let purchase_payment = coin::split(&mut payment, price, ctx);
    let (music, mut request) = kiosk::purchase<Music>(kiosk, music_id, purchase_payment);

    // Step 2: Calculate fees
    let royalty_amount = calculate_royalty_amount(policy, price);
    let platform_fee_amount = calculate_platform_fee_amount(policy, price);

    // Step 3: Pay royalty
    if (policy::has_rule<Music, RoyaltyRule>(policy)) {
        let royalty_payment = coin::split(&mut payment, royalty_amount, ctx);
        policy::add_to_balance(RoyaltyRule {}, policy, royalty_payment);
        policy::add_receipt(RoyaltyRule {}, &mut request);
    };

    // Step 4: Pay platform fee
    if (policy::has_rule<Music, PlatformFeeRule>(policy)) {
        let platform_payment = coin::split(&mut payment, platform_fee_amount, ctx);
        treasury.deposit(platform_payment);
        policy::add_receipt(PlatformFeeRule {}, &mut request);
    };

    // Step 5: Confirm request
    policy::confirm_request(policy, request);

    // Step 6: Transfer music to buyer
    transfer::public_transfer(music, buyer);

    // Return remaining payment
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, buyer);
    } else {
        coin::destroy_zero(payment);
    };

    event::emit(MusicPurchasedFromKiosk {
        kiosk_id,
        music_id,
        buyer,
        price,
        royalty_paid: royalty_amount,
        platform_fee_paid: platform_fee_amount,
    });
}

// ======== Helper Functions ========

/// Calculate royalty amount based on policy
public fun calculate_royalty_amount(policy: &TransferPolicy<Music>, paid: u64): u64 {
    if (!policy::has_rule<Music, RoyaltyRule>(policy)) {
        return 0
    };

    let config: &RoyaltyConfig = policy::get_rule(RoyaltyRule {}, policy);
    let mut amount = (((paid as u128) * (config.amount_bps as u128) / (MAX_BPS as u128)) as u64);

    // Apply minimum amount
    if (amount < config.min_amount) {
        amount = config.min_amount;
    };

    amount
}

/// Calculate platform fee amount based on policy
public fun calculate_platform_fee_amount(policy: &TransferPolicy<Music>, paid: u64): u64 {
    if (!policy::has_rule<Music, PlatformFeeRule>(policy)) {
        return 0
    };

    let config: &PlatformFeeConfig = policy::get_rule(PlatformFeeRule {}, policy);
    (((paid as u128) * (config.amount_bps as u128) / (MAX_BPS as u128)) as u64)
}

/// Withdraw accumulated royalties from TransferPolicy
public entry fun withdraw_royalties(
    policy: &mut TransferPolicy<Music>,
    cap: &TransferPolicyCap<Music>,
    amount: Option<u64>,
    recipient: address,
    ctx: &mut TxContext,
) {
    let coin = policy::withdraw(policy, cap, amount, ctx);
    transfer::public_transfer(coin, recipient);
}

// ======== Getter Functions ========

public fun get_royalty_bps(policy: &TransferPolicy<Music>): u16 {
    if (!policy::has_rule<Music, RoyaltyRule>(policy)) {
        return 0
    };
    let config: &RoyaltyConfig = policy::get_rule(RoyaltyRule {}, policy);
    config.amount_bps
}

public fun get_platform_fee_bps(policy: &TransferPolicy<Music>): u16 {
    if (!policy::has_rule<Music, PlatformFeeRule>(policy)) {
        return 0
    };
    let config: &PlatformFeeConfig = policy::get_rule(PlatformFeeRule {}, policy);
    config.amount_bps
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(KIOSK_MARKETPLACE {}, ctx);
}
