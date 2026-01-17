/// Stake Module - Economic signaling for music
/// Users can stake SUI to signal support for music
/// NOTE: Staking does NOT affect listen counts, revenue, or ListenCaps
module music_core::stake;

use music_core::music::{Self, Music};
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID, ID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Constants ========
const MIN_LOCK_EPOCHS: u64 = 1; // Minimum 1 epoch lock
const MAX_LOCK_EPOCHS: u64 = 100; // Maximum 100 epochs lock

// ======== Errors ========
const E_NOT_OWNER: u64 = 1;
const E_NOT_PUBLISHED: u64 = 2;
const E_INVALID_PAYMENT: u64 = 3;
const E_EARLY_UNSTAKE: u64 = 4;
const E_INVALID_LOCK_PERIOD: u64 = 5;

// ======== Structs ========

/// StakePosition - Represents a locked stake position
public struct StakePosition has key, store {
    id: UID,
    music_id: ID,
    staker: address,
    amount: Balance<SUI>,
    staked_at_epoch: u64,
    unlock_epoch: u64,
    staked_at_ms: u64, // Timestamp in milliseconds
}

/// StakeRegistry - Tracks global stake statistics
public struct StakeRegistry has key {
    id: UID,
    total_staked: u64,
    total_positions: u64,
}

// ======== Events ========

public struct Staked has copy, drop {
    position_id: ID,
    music_id: ID,
    staker: address,
    amount: u64,
    unlock_epoch: u64,
}

public struct Unstaked has copy, drop {
    position_id: ID,
    music_id: ID,
    staker: address,
    amount: u64,
}

// ======== Init Function ========
fun init(ctx: &mut TxContext) {
    let registry = StakeRegistry {
        id: object::new(ctx),
        total_staked: 0,
        total_positions: 0,
    };
    transfer::share_object(registry);
}

// ======== Public Functions ========

/// Stake SUI to signal support for a music
/// IMPORTANT: This does NOT increase listen count or mint ListenCap
/// This is purely economic signaling
public fun stake(
    music: &Music,
    payment: Coin<SUI>,
    lock_epochs: u64,
    registry: &mut StakeRegistry,
    clock: &Clock,
    ctx: &mut TxContext,
): StakePosition {
    // Verify music is published
    assert!(music::is_published(music), E_NOT_PUBLISHED);
    
    // Verify lock period is valid
    assert!(lock_epochs >= MIN_LOCK_EPOCHS && lock_epochs <= MAX_LOCK_EPOCHS, E_INVALID_LOCK_PERIOD);
    
    let amount = coin::value(&payment);
    assert!(amount > 0, E_INVALID_PAYMENT);
    
    let staker = tx_context::sender(ctx);
    let music_id = music::id(music);
    let current_epoch = tx_context::epoch(ctx);
    let unlock_epoch = current_epoch + lock_epochs;
    let staked_at_ms = clock::timestamp_ms(clock);
    
    // Convert coin to balance for storage
    let balance_to_stake = coin::into_balance(payment);
    
    // Create stake position
    let position = StakePosition {
        id: object::new(ctx),
        music_id,
        staker,
        amount: balance_to_stake,
        staked_at_epoch: current_epoch,
        unlock_epoch,
        staked_at_ms,
    };
    
    // Update registry
    registry.total_staked = registry.total_staked + amount;
    registry.total_positions = registry.total_positions + 1;
    
    // Emit event
    event::emit(Staked {
        position_id: object::id(&position),
        music_id,
        staker,
        amount,
        unlock_epoch,
    });
    
    position
}

/// Unstake - Withdraw staked SUI after unlock epoch
/// Can only be called by the original staker after unlock epoch
public fun unstake(
    position: StakePosition,
    registry: &mut StakeRegistry,
    ctx: &mut TxContext,
): Coin<SUI> {
    let current_epoch = tx_context::epoch(ctx);
    let staker = tx_context::sender(ctx);
    
    // Verify ownership
    assert!(position.staker == staker, E_NOT_OWNER);
    
    // Verify unlock epoch has passed
    assert!(current_epoch >= position.unlock_epoch, E_EARLY_UNSTAKE);
    
    // Destructure position
    let StakePosition {
        id,
        music_id,
        staker: _,
        amount,
        staked_at_epoch: _,
        unlock_epoch: _,
        staked_at_ms: _,
    } = position;
    
    let amount_value = balance::value(&amount);
    
    // Convert balance back to coin
    let withdrawn = coin::from_balance(amount, ctx);
    
    // Update registry
    registry.total_staked = registry.total_staked - amount_value;
    registry.total_positions = registry.total_positions - 1;
    
    // Emit event
    event::emit(Unstaked {
        position_id: object::uid_to_inner(&id),
        music_id,
        staker,
        amount: amount_value,
    });
    
    // Delete position object
    object::delete(id);
    
    withdrawn
}

/// Emergency unstake - Allows immediate withdrawal but may incur penalty (future feature)
/// For MVP, this just checks ownership and allows withdrawal
public fun emergency_unstake(
    position: StakePosition,
    registry: &mut StakeRegistry,
    ctx: &mut TxContext,
): Coin<SUI> {
    let staker = tx_context::sender(ctx);
    
    // Verify ownership
    assert!(position.staker == staker, E_NOT_OWNER);
    
    // Destructure position
    let StakePosition {
        id,
        music_id,
        staker: _,
        amount,
        staked_at_epoch: _,
        unlock_epoch: _,
        staked_at_ms: _,
    } = position;
    
    let amount_value = balance::value(&amount);
    
    // Convert balance back to coin
    let withdrawn = coin::from_balance(amount, ctx);
    
    // Update registry
    registry.total_staked = registry.total_staked - amount_value;
    registry.total_positions = registry.total_positions - 1;
    
    // Emit event
    event::emit(Unstaked {
        position_id: object::uid_to_inner(&id),
        music_id,
        staker,
        amount: amount_value,
    });
    
    // Delete position object
    object::delete(id);
    
    withdrawn
}

// ======== Getter Functions ========

public fun music_id(position: &StakePosition): ID {
    position.music_id
}

public fun staker(position: &StakePosition): address {
    position.staker
}

public fun amount(position: &StakePosition): u64 {
    balance::value(&position.amount)
}

public fun unlock_epoch(position: &StakePosition): u64 {
    position.unlock_epoch
}

public fun staked_at_epoch(position: &StakePosition): u64 {
    position.staked_at_epoch
}

public fun staked_at_ms(position: &StakePosition): u64 {
    position.staked_at_ms
}

public fun is_unlocked(position: &StakePosition, ctx: &TxContext): bool {
    tx_context::epoch(ctx) >= position.unlock_epoch
}

public fun total_staked(registry: &StakeRegistry): u64 {
    registry.total_staked
}

public fun total_positions(registry: &StakeRegistry): u64 {
    registry.total_positions
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
