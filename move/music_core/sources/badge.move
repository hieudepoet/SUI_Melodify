/// Badge Module - Gamification layer
/// Badges can be bound to Music or Users for boosting
module music_core::badge;

use std::option::{Self, Option};
use std::string::String;
use sui::event;
use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants =======
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
/** Badge - Can be attached to Music or User
 */
public struct Badge has key, store {
    // Keep store for tradability
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

/** Badge Registry for tracking issued badges
 */
public struct BadgeRegistry has key {
    id: UID,
    total_badges_issued: u64,
    admin: address,
}

/** Admin capability for badge issuance
 */
public struct BadgeAdminCap has key, store {
    id: UID,
}

// ======== Events ========
public struct BadgeIssued has copy, drop {
    badge_id: ID,
    badge_type: u8,
    recipient: address,
    name: String,
}

public struct BadgeBound has copy, drop {
    badge_id: ID,
    bound_to: ID,
}

public struct BadgeUnbound has copy, drop {
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
/** Issue a new badge (admin only)
 */
public fun issue_badge(
    admin_cap: &BadgeAdminCap,
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

    let badge = Badge {
        id: badge_id,
        badge_type,
        name,
        description,
        image_uri,
        bound_to: option::none(),
        boost_multiplier,
        metadata,
        issuer: tx_context::sender(ctx),
    };

    event::emit(BadgeIssued {
        badge_id: object::id(&badge),
        badge_type,
        recipient,
        name,
    });

    registry.total_badges_issued = registry.total_badges_issued + 1;

    transfer::public_transfer(badge, recipient);
}

/** Transfer admin capability
 */
public fun transfer_admin_cap(admin_cap: BadgeAdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

/** Bind badge to a Music or User object
 */
public fun bind_badge(self: &mut Badge, target_id: ID, ctx: &TxContext) {
    assert!(option::is_none(&self.bound_to), EAlreadyBound);
    // Verify ownership (assume target ownership checked off-chain or via sender)
    assert!(self.issuer == tx_context::sender(ctx), ENotOwner); // Custom check

    self.bound_to = option::some(target_id);

    event::emit(BadgeBound {
        badge_id: object::id(self),
        bound_to: target_id,
    });
}

/** Unbind badge from target
 */
public fun unbind_badge(self: &mut Badge, ctx: &TxContext) {
    self.bound_to = option::none();

    event::emit(BadgeUnbound {
        badge_id: object::id(self),
    });
}

/** Transfer badge to another user
 */
public fun transfer_badge(badge: Badge, recipient: address) {
    transfer::public_transfer(badge, recipient);
}

/** Burn badge
 */
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
        issuer: _,
    } = badge;
    object::delete(id);
}

// ======== Getter Functions (method syntax) ========
public fun badge_type(self: &Badge): u8 {
    self.badge_type
}

public fun name(self: &Badge): String {
    self.name
}

public fun bound_to(self: &Badge): Option<ID> {
    self.bound_to
}

public fun boost_multiplier(self: &Badge): u16 {
    self.boost_multiplier
}

public fun is_bound(self: &Badge): bool {
    option::is_some(&self.bound_to)
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
