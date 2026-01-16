/// Treasury Module - Platform fund management
module treasury::treasury;

use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};
use sui::event;
use sui::object::{Self, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self, TxContext};

// ======== Errors ========
const ENotAdmin: u64 = 1;
const EInsufficientBalance: u64 = 2;

// ======== Structs ========

/// Platform Treasury
struct Treasury has key {
    id: UID,
    balance: Balance<SUI>,
    admin: address,
    total_collected: u64,
    total_withdrawn: u64,
}

/// Admin capability
struct AdminCap has key, store {
    id: UID,
}

// ======== Events ========

struct FundsDeposited has copy, drop {
    amount: u64,
    total_balance: u64,
}

struct FundsWithdrawn has copy, drop {
    amount: u64,
    recipient: address,
    remaining_balance: u64,
}

// ======== Init Function ========

fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);

    let treasury = Treasury {
        id: object::new(ctx),
        balance: balance::zero(),
        admin,
        total_collected: 0,
        total_withdrawn: 0,
    };
    transfer::share_object(treasury);

    let admin_cap = AdminCap {
        id: object::new(ctx),
    };
    transfer::transfer(admin_cap, admin);
}

// ======== Public Functions ========

/// Deposit funds to treasury
public fun deposit(treasury: &mut Treasury, payment: Coin<SUI>) {
    let amount = coin::value(&payment);
    let balance_to_add = coin::into_balance(payment);
    balance::join(&mut treasury.balance, balance_to_add);

    treasury.total_collected = treasury.total_collected + amount;

    event::emit(FundsDeposited {
        amount,
        total_balance: balance::value(&treasury.balance),
    });
}

/// Withdraw funds from treasury (admin only)
public fun withdraw(
    treasury: &mut Treasury,
    _admin_cap: &AdminCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(balance::value(&treasury.balance) >= amount, EInsufficientBalance);

    let withdrawn = coin::from_balance(
        balance::split(&mut treasury.balance, amount),
        ctx,
    );

    treasury.total_withdrawn = treasury.total_withdrawn + amount;

    event::emit(FundsWithdrawn {
        amount,
        recipient,
        remaining_balance: balance::value(&treasury.balance),
    });

    transfer::public_transfer(withdrawn, recipient);
}

/// Transfer admin capability
public fun transfer_admin(admin_cap: AdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

// ======== Getter Functions ========

public fun get_balance(treasury: &Treasury): u64 {
    balance::value(&treasury.balance)
}

public fun get_total_collected(treasury: &Treasury): u64 {
    treasury.total_collected
}

public fun get_total_withdrawn(treasury: &Treasury): u64 {
    treasury.total_withdrawn
}

public fun get_admin(treasury: &Treasury): address {
    treasury.admin
}

// ======== Test Functions ========

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
