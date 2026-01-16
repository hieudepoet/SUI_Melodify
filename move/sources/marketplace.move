/// Marketplace Module - Trading and listing for Music NFTs
module marketplace::marketplace;

use music_core::music::{Self, Music};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const PLATFORM_FEE_BPS: u64 = 250; // 2.5%
const CREATOR_ROYALTY_BPS: u64 = 1000; // 10%
const TOTAL_BPS: u64 = 10000;

// ======== Errors ========
const ENotOwner: u64 = 1;
const EInsufficientPayment: u64 = 2;
const EListingNotFound: u64 = 3;
const EInvalidPrice: u64 = 4;

// ======== Structs ========

/// Listing for a Music NFT
/// Removed 'store' to apply seal pattern
struct Listing has key {
    id: UID,
    music_id: ID,
    seller: address,
    price: u64,
}

/// Marketplace shared object
struct Marketplace has key {
    id: UID,
    total_volume: u64,
    platform_revenue: u64,
    treasury_address: address,
}

// ======== Events ========

struct MusicListed has copy, drop {
    listing_id: ID,
    music_id: ID,
    seller: address,
    price: u64,
}

struct MusicSold has copy, drop {
    music_id: ID,
    seller: address,
    buyer: address,
    price: u64,
    platform_fee: u64,
    creator_royalty: u64,
}

struct ListingCancelled has copy, drop {
    listing_id: ID,
    music_id: ID,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let marketplace = Marketplace {
        id: object::new(ctx),
        total_volume: 0,
        platform_revenue: 0,
        treasury_address: tx_context::sender(ctx),
    };
    transfer::share_object(marketplace);
}

// ======== Public Functions ========

/// List music for sale
public fun list_music(music: Music, price: u64, ctx: &mut TxContext): Listing {
    assert!(price > 0, EInvalidPrice);

    let listing_id = object::new(ctx);
    let music_id = music::get_id(&music);
    let seller = tx_context::sender(ctx);

    event::emit(MusicListed {
        listing_id: object::uid_to_inner(&listing_id),
        music_id,
        seller,
        price,
    });

    // Transfer music to listing (escrow)
    transfer::public_transfer(music, object::uid_to_address(&listing_id));

    Listing {
        id: listing_id,
        music_id,
        seller,
        price,
    }
}

/// Buy listed music
public fun buy_music(
    listing: Listing,
    music: Music,
    payment: Coin<SUI>,
    marketplace: &mut Marketplace,
    ctx: &mut TxContext,
) {
    let Listing { id, music_id, seller, price } = listing;

    // Verify payment
    assert!(coin::value(&payment) >= price, EInsufficientPayment);
    assert!(music::get_id(&music) == music_id, EListingNotFound);

    let buyer = tx_context::sender(ctx);

    // Calculate fees with proper validation
    let platform_fee = (price * PLATFORM_FEE_BPS) / TOTAL_BPS;
    let creator_royalty = (price * CREATOR_ROYALTY_BPS) / TOTAL_BPS;
    let total_fees = platform_fee + creator_royalty;

    // Ensure fees don't exceed price
    assert!(total_fees <= price, EInsufficientPayment);
    let seller_amount = price - total_fees;

    // Split payment
    let platform_coin = coin::split(&mut payment, platform_fee, ctx);
    let royalty_coin = coin::split(&mut payment, creator_royalty, ctx);
    let seller_coin = payment;

    // Update marketplace stats
    marketplace.total_volume = marketplace.total_volume + price;
    marketplace.platform_revenue = marketplace.platform_revenue + platform_fee;

    // Distribute payments
    transfer::public_transfer(seller_coin, seller);
    transfer::public_transfer(royalty_coin, music::get_creator(&music));
    transfer::public_transfer(platform_coin, marketplace.treasury_address);

    // Transfer music to buyer
    transfer::public_transfer(music, buyer);

    event::emit(MusicSold {
        music_id,
        seller,
        buyer,
        price,
        platform_fee,
        creator_royalty,
    });

    object::delete(id);
}

/// Cancel listing and return music
public fun cancel_listing(listing: Listing, music: Music, ctx: &TxContext) {
    assert!(listing.seller == tx_context::sender(ctx), ENotOwner);

    let Listing { id, music_id, seller, price: _ } = listing;

    assert!(music::get_id(&music) == music_id, EListingNotFound);

    event::emit(ListingCancelled {
        listing_id: object::uid_to_inner(&id),
        music_id,
    });

    // Return music to seller
    transfer::public_transfer(music, seller);
    object::delete(id);
}

/// Update listing price
public fun update_price(listing: &mut Listing, new_price: u64, ctx: &TxContext) {
    assert!(listing.seller == tx_context::sender(ctx), ENotOwner);
    assert!(new_price > 0, EInvalidPrice);

    listing.price = new_price;
}

// ======== Getter Functions ========

public fun get_listing_price(listing: &Listing): u64 {
    listing.price
}

public fun get_listing_seller(listing: &Listing): address {
    listing.seller
}

public fun get_music_id(listing: &Listing): ID {
    listing.music_id
}

public fun get_total_volume(marketplace: &Marketplace): u64 {
    marketplace.total_volume
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
