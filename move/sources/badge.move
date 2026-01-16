/// Badge Module - Gamification layer
/// Badges can be bound to Music or Users for boosting
module music_core::badge;

use std::option::{Self, Option};
use std::string::String;
use sui::event;
use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========

// Badge Types
const BADGE_TYPE_CREATOR: u8 = 1;
const BADGE_TYPE_LISTENER: u8 = 2;
const BADGE_TYPE_REMIXER: u8 = 3;
const BADGE_TYPE_COLLECTOR: u8 = 4;
const BADGE_TYPE_SPECIAL: u8 = 5;

// ======== Errors ========
const EInvalidBadgeType: u64 = 1;
const ENotOwner: u64 = 2;
const EAlreadyBound: u64 = 3;

// ======== Structs ========

/// Badge - Can be attached to Music or User
/// Kept 'store' for transferability, but binding prevents misuse
struct Badge has key, store {
    id: UID,
    badge_type: u8,
    name: String,
    description: String,
    image_uri: String,
    bound_to: Option<ID>, // Music ID or User object ID
    boost_multiplier: u16, // e.g., 110 = 1.1x boost
    metadata: String, // JSON for extensibility
    issuer: address, // Track who issued this badge
}

/// Badge Registry for tracking issued badges
struct BadgeRegistry has key {
    id: UID,
    total_badges_issued: u64,
    admin: address,
}

/// Admin capability for badge issuance
struct BadgeAdminCap has key, store {
    id: UID,
}

// ======== Events ========

struct BadgeIssued has copy, drop {
    badge_id: ID,
    badge_type: u8,
    recipient: address,
    name: String,
}

struct BadgeBound has copy, drop {
    badge_id: ID,
    bound_to: ID,
}

struct BadgeUnbound has copy, drop {
    badge_id: ID,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);

    let registry = BadgeRegistry {
        id: object::new(ctx),
        total_badges_issued: 0,
        admin,
    };
    transfer::share_object(registry);

    let admin_cap = BadgeAdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, admin);
}

// ======== Public Functions ========

/// Issue a new badge (admin only)
public fun issue_badge(
    _admin_cap: &BadgeAdminCap,
    badge_type: u8,
    name: String,
    description: String,
    image_uri: String,
    boost_multiplier: u16,
    metadata: String,
    recipient: address,
    registry: &mut BadgeRegistry,
    ctx: &mut TxContext,
) {
    assert!(is_valid_badge_type(badge_type), EInvalidBadgeType);

    let badge_id = object::new(ctx);
    let issuer = tx_context::sender(ctx);

    event::emit(BadgeIssued {
        badge_id: object::uid_to_inner(&badge_id),
        badge_type,
        recipient,
        name,
    });

    registry.total_badges_issued = registry.total_badges_issued + 1;

    let badge = Badge {
        id: badge_id,
        badge_type,
        name,
        description,
        image_uri,
        bound_to: option::none(),
        boost_multiplier,
        metadata,
        issuer,
    };

    transfer::public_transfer(badge, recipient);
}

/// Transfer admin capability
public fun transfer_admin_cap(admin_cap: BadgeAdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

/// Bind badge to a Music or User object
public fun bind_badge(badge: &mut Badge, target_id: ID, ctx: &TxContext) {
    // In real implementation, would verify ownership
    assert!(option::is_none(&badge.bound_to), EAlreadyBound);

    badge.bound_to = option::some(target_id);

    event::emit(BadgeBound {
        badge_id: object::uid_to_inner(&badge.id),
        bound_to: target_id,
    });
}

/// Unbind badge from target
public fun unbind_badge(badge: &mut Badge, ctx: &TxContext) {
    badge.bound_to = option::none();

    event::emit(BadgeUnbound {
        badge_id: object::uid_to_inner(&badge.id),
    });
}

/// Transfer badge to another user
public fun transfer_badge(badge: Badge, recipient: address) {
    transfer::public_transfer(badge, recipient);
}

/// Burn badge
public fun burn_badge(badge: Badge) {
    let Badge {
        id,
        badge_type: _,
        name: _,
        description: _,
        image_uri: _,
        bound_to: _,
        boost_multiplier: _,
        metadata: _,
    } = badge;
    object::delete(id);
}

// ======== Getter Functions ========

public fun get_badge_type(badge: &Badge): u8 {
    badge.badge_type
}

public fun get_name(badge: &Badge): String {
    badge.name
}

public fun get_bound_to(badge: &Badge): Option<ID> {
    badge.bound_to
}

public fun get_boost_multiplier(badge: &Badge): u16 {
    badge.boost_multiplier
}

public fun is_bound(badge: &Badge): bool {
    option::is_some(&badge.bound_to)
}

// ======== Helper Functions ========

fun is_valid_badge_type(badge_type: u8): bool {
    badge_type >= BADGE_TYPE_CREATOR && badge_type <= BADGE_TYPE_SPECIAL
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
