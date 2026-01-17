/// Treasury Module - Platform fund management
module music_core::treasury;

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
/** Platform Treasury
 */
public struct Treasury has key {
    id: UID,
    balance: Balance<SUI>,
    admin: address,
    total_collected: u64,
    total_withdrawn: u64,
}

/** Admin capability
 */
public struct AdminCap has key, store {
    id: UID,
}

// ======== Events ========
public struct FundsDeposited has copy, drop {
    amount: u64,
    total_balance: u64,
}

public struct FundsWithdrawn has copy, drop {
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
/** Deposit funds to treasury (method syntax)
 */
public fun deposit(self: &mut Treasury, payment: Coin<SUI>) {
    let amount = coin::value(&payment);
    let mut balance_to_add = coin::into_balance(payment); // let mut
    balance::join(&mut self.balance, balance_to_add);

    self.total_collected = self.total_collected + amount;

    event::emit(FundsDeposited {
        amount,
        total_balance: balance::value(&self.balance),
    });
}

/** Withdraw funds from treasury (admin only)
 */
public fun withdraw(
    self: &mut Treasury,
    admin_cap: &AdminCap,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(self.admin == tx_context::sender(ctx), ENotAdmin); // Extra check
    assert!(balance::value(&self.balance) >= amount, EInsufficientBalance);

    let withdrawn_balance = balance::split(&mut self.balance, amount);
    let withdrawn = coin::from_balance(withdrawn_balance, ctx);

    self.total_withdrawn = self.total_withdrawn + amount;

    event::emit(FundsWithdrawn {
        amount,
        recipient,
        remaining_balance: balance::value(&self.balance),
    });

    transfer::public_transfer(withdrawn, recipient);
}

/** Transfer admin capability
 */
public fun transfer_admin(admin_cap: AdminCap, new_admin: address) {
    transfer::transfer(admin_cap, new_admin);
}

// ======== Getter Functions (method syntax) ========
public fun balance(self: &Treasury): u64 {
    balance::value(&self.balance)
}

public fun total_collected(self: &Treasury): u64 {
    self.total_collected
}

public fun total_withdrawn(self: &Treasury): u64 {
    self.total_withdrawn
}

public fun admin(self: &Treasury): address {
    self.admin
}

// ======== Test Functions ========
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
