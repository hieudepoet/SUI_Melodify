/// Remix Module - Handles music remixing with lineage tracking
module music_core::remix;

use music_core::music::{Self, Music, MusicRegistry};
use std::option;
use std::string::String;
use sui::event;
use sui::object::{Self, UID, ID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Errors ========
const ENotOwner: u64 = 1;
const EMusicNotPublished: u64 = 2;
const EInvalidRemixCap: u64 = 3;

// ======== Structs ========

/// RemixCap - Required capability to create a remix
/// Ensures lineage cannot be forged
/// Removed 'store' to prevent unauthorized wrapping
struct RemixCap has key {
    id: UID,
    parent_music: ID,
    remixer: address,
}

// ======== Events ========

struct RemixCapIssued has copy, drop {
    cap_id: ID,
    parent_music: ID,
    remixer: address,
}

struct RemixCreated has copy, drop {
    remix_id: ID,
    parent_id: ID,
    remixer: address,
}

// ======== Public Functions ========

/// Request permission to remix a music
/// Parent owner can issue RemixCap to allow remixing
public fun issue_remix_cap(parent_music: &Music, remixer: address, ctx: &mut TxContext): RemixCap {
    // Only parent owner can issue remix capability
    assert!(music::get_creator(parent_music) == tx_context::sender(ctx), ENotOwner);
    assert!(music::is_published(parent_music), EMusicNotPublished);

    let cap_id = object::new(ctx);
    let parent_id = music::get_id(parent_music);

    event::emit(RemixCapIssued {
        cap_id: object::uid_to_inner(&cap_id),
        parent_music: parent_id,
        remixer,
    });

    RemixCap {
        id: cap_id,
        parent_music: parent_id,
        remixer,
    }
}

/// Create a remix using RemixCap
/// This ensures lineage is properly tracked
public fun create_remix(
    remix_cap: RemixCap,
    audio_cid: String,
    metadata_uri: String,
    cover_uri: String,
    royalty_bps: u16,
    registry: &mut MusicRegistry,
    ctx: &mut TxContext,
): Music {
    // Verify remixer
    assert!(remix_cap.remixer == tx_context::sender(ctx), EInvalidRemixCap);

    let parent_id = remix_cap.parent_music;

    // Burn the remix cap
    let RemixCap { id, parent_music: _, remixer: _ } = remix_cap;
    object::delete(id);

    // Create new music with parent lineage
    let remix = music::create_music(
        audio_cid,
        metadata_uri,
        cover_uri,
        royalty_bps,
        option::some(parent_id),
        registry,
        ctx,
    );

    event::emit(RemixCreated {
        remix_id: music::get_id(&remix),
        parent_id,
        remixer: tx_context::sender(ctx),
    });

    remix
}

/// Open remix - anyone can remix without permission
/// Still tracks lineage properly
public fun create_open_remix(
    parent_music: &Music,
    audio_cid: String,
    metadata_uri: String,
    cover_uri: String,
    royalty_bps: u16,
    registry: &mut MusicRegistry,
    ctx: &mut TxContext,
): Music {
    assert!(music::is_published(parent_music), EMusicNotPublished);

    let parent_id = music::get_id(parent_music);

    let remix = music::create_music(
        audio_cid,
        metadata_uri,
        cover_uri,
        royalty_bps,
        option::some(parent_id),
        registry,
        ctx,
    );

    event::emit(RemixCreated {
        remix_id: music::get_id(&remix),
        parent_id,
        remixer: tx_context::sender(ctx),
    });

    remix
}

/// Transfer RemixCap to another user
public fun transfer_remix_cap(cap: RemixCap, recipient: address) {
    transfer::public_transfer(cap, recipient);
}

// ======== Getter Functions ========

public fun get_parent_music(cap: &RemixCap): ID {
    cap.parent_music
}

public fun get_remixer(cap: &RemixCap): address {
    cap.remixer
}

// ======== Helper Functions ========

/// Check if a music is a remix
public fun is_remix(music: &Music): bool {
    option::is_some(&music::get_parent(music))
}

/// Get remix lineage depth (how many generations)
/// Note: This would require recursive lookup in real implementation
public fun get_lineage_depth(_music: &Music): u64 {
    // Simplified - would need to traverse parent chain
    if (is_remix(_music)) {
        1
    } else {
        0
    }
}
