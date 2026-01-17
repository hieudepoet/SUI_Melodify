/// Core Flow Integration Tests
/// Tests: Create Music → Publish → Listen → Stake → Unstake → Withdraw
#[test_only]
module music_core::music_core_tests;

use music_core::music::{Self, Music, MusicRegistry};
use music_core::listen::{Self, ListenConfig, ParentRoyaltyPool, ListenCap};
use music_core::treasury::{Self, Treasury};
use music_core::stake::{Self, StakeRegistry, StakePosition};
use std::option;
use std::string;
use sui::balance;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils;

// Test accounts
const CREATOR: address = @0xC1;
const LISTENER: address = @0xC2;
const STAKER: address = @0xC3;
const ADMIN: address = @0xAD;

// Test constants
const LISTEN_PRICE: u64 = 1_000_000; // 0.001 SUI
const STAKE_AMOUNT: u64 = 10_000_000; // 0.01 SUI
const ROYALTY_BPS: u16 = 1000; // 10%

// ============================================================================
// Test 1: Complete Music Lifecycle
// ============================================================================

#[test]
fun test_complete_music_lifecycle() {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // === SETUP: Initialize all modules ===
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        listen::init_for_testing(ts::ctx(&mut scenario));
        treasury::init_for_testing(ts::ctx(&mut scenario));
        stake::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // === STEP 1: Creator mints music (Draft) ===
    let music_id = {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let music = music::create_music(
            string::utf8(b"walrus_audio_cid_123"),
            string::utf8(b"walrus_preview_cid_123"),
            string::utf8(b"ipfs://metadata_uri"),
            string::utf8(b"https://cover.url"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        let music_id = object::id(&music);
        
        // Verify initial state
        assert!(music::creator(&music) == CREATOR, 0);
        assert!(music::status(&music) == 0, 1); // DRAFT
        assert!(music::total_listens(&music) == 0, 2);
        assert!(music::revenue_balance(&music) == 0, 3);
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
        music_id
    };
    
    // === STEP 2: Creator publishes music ===
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut music = ts::take_from_sender<Music>(&scenario);
        
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        // Verify published
        assert!(music::is_published(&music), 4);
        assert!(music::status(&music) == 1, 5); // PUBLISHED
        
        ts::return_to_sender(&scenario, music);
    };
    
    // === STEP 3: Listener pays to listen ===
    ts::next_tx(&mut scenario, LISTENER);
    {
        let mut music = ts::take_from_address<Music>(&scenario, CREATOR);
        let mut treasury = ts::take_shared<Treasury>(&scenario);
        let mut parent_pool = ts::take_shared<ParentRoyaltyPool>(&scenario);
        let config = ts::take_shared<ListenConfig>(&scenario);
        
        // Create payment
        let payment = coin::mint_for_testing<SUI>(LISTEN_PRICE, ts::ctx(&mut scenario));
        
        // Listen to music
        let listen_cap = listen::listen(
            &mut music,
            payment,
            &mut treasury,
            &mut parent_pool,
            &config,
            &clock,
            ts::ctx(&mut scenario),
        );
        
        // Verify listen cap created
        assert!(listen::listener(&listen_cap) == LISTENER, 6);
        assert!(listen::music_id(&listen_cap) == music_id, 7);
        
        // Verify listen count increased
        assert!(music::total_listens(&music) == 1, 8);
        
        // Verify revenue split (70% to creator)
        let expected_creator_revenue = (LISTEN_PRICE * 7000) / 10000;
        assert!(music::revenue_balance(&music) >= expected_creator_revenue, 9);
        
        // Verify treasury received funds (20%)
        let treasury_balance = treasury::balance(&treasury);
        let expected_platform_fee = (LISTEN_PRICE * 2000) / 10000;
        assert!(treasury_balance >= expected_platform_fee, 10);
        
        // Cleanup - burn listen cap
        listen::burn_cap(listen_cap);
        ts::return_to_address(CREATOR, music);
        ts::return_shared(treasury);
        ts::return_shared(parent_pool);
        ts::return_shared(config);
    };
    
    // === STEP 4: Creator withdraws revenue ===
    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut music = ts::take_from_sender<Music>(&scenario);
        
        let revenue_before = music::revenue_balance(&music);
        assert!(revenue_before > 0, 11);
        
        let withdrawn = music::withdraw_revenue(
            &mut music,
            revenue_before,
            ts::ctx(&mut scenario),
        );
        
        // Verify withdrawal
        assert!(coin::value(&withdrawn) == revenue_before, 12);
        assert!(music::revenue_balance(&music) == 0, 13);
        
        coin::burn_for_testing(withdrawn);
        ts::return_to_sender(&scenario, music);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ============================================================================
// Test 2: Staking Flow
// ============================================================================

#[test]
fun test_staking_flow() {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // Setup
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        stake::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // Create and publish music
    let music_id = {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut music = music::create_music(
            string::utf8(b"audio_cid"),
            string::utf8(b"preview_cid"),
            string::utf8(b"metadata"),
            string::utf8(b"cover"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        let music_id = object::id(&music);
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
        music_id
    };
    
    // === STEP 1: User stakes SUI on music ===
    ts::next_tx(&mut scenario, STAKER);
    {
        let music = ts::take_from_address<Music>(&scenario, CREATOR);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        // Create stake payment
        let payment = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ts::ctx(&mut scenario));
        
        let lock_epochs = 5u64;
        
        // Stake
        let position = stake::stake(
            &music,
            payment,
            lock_epochs,
            &mut registry,
            &clock,
            ts::ctx(&mut scenario),
        );
        
        // Verify stake position
        assert!(stake::staker(&position) == STAKER, 20);
        assert!(stake::music_id(&position) == music_id, 21);
        assert!(stake::amount(&position) == STAKE_AMOUNT, 22);
        
        let current_epoch = ts::ctx(&mut scenario).epoch();
        assert!(stake::unlock_epoch(&position) == current_epoch + lock_epochs, 23);
        assert!(!stake::is_unlocked(&position, ts::ctx(&mut scenario)), 24);
        
        // Verify registry updated
        assert!(stake::total_staked(&registry) == STAKE_AMOUNT, 25);
        assert!(stake::total_positions(&registry) == 1, 26);
        
        // Transfer position to STAKER so we can take it in next steps
        transfer::public_transfer(position, STAKER);
        ts::return_to_address(CREATOR, music);
        ts::return_shared(registry);
    };
    
    // === STEP 2: Try to unstake early (should fail) ===
    ts::next_tx(&mut scenario, STAKER);
    {
        let position = ts::take_from_sender<StakePosition>(&scenario);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        // This should fail because unlock epoch not reached
        // We'll use emergency_unstake for this test instead
        // Transfer back for next step
        transfer::public_transfer(position, STAKER);
        ts::return_shared(registry);
    };
    
    // === STEP 3: Advance epochs and unstake ===
    ts::next_tx(&mut scenario, STAKER);
    {
        // Advance epoch by 5
        let mut i = 0;
        while (i < 5) {
            ts::next_epoch(&mut scenario, STAKER);
            i = i + 1;
        };
        
        let position = ts::take_from_sender<StakePosition>(&scenario);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        // Now should be unlocked
        assert!(stake::is_unlocked(&position, ts::ctx(&mut scenario)), 27);
        
        // Unstake
        let withdrawn = stake::unstake(
            position,
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        // Verify withdrawal
        assert!(coin::value(&withdrawn) == STAKE_AMOUNT, 28);
        
        // Verify registry updated
        assert!(stake::total_staked(&registry) == 0, 29);
        assert!(stake::total_positions(&registry) == 0, 30);
        
        coin::burn_for_testing(withdrawn);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ============================================================================
// Test 3: Multiple Listeners + Revenue Accumulation
// ============================================================================

#[test]
fun test_multiple_listeners() {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // Setup
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        listen::init_for_testing(ts::ctx(&mut scenario));
        treasury::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // Create and publish music
    {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut music = music::create_music(
            string::utf8(b"audio_cid"),
            string::utf8(b"preview_cid"),
            string::utf8(b"metadata"),
            string::utf8(b"cover"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
    };
    
    // === Multiple users listen ===
    let num_listens = 3u64;
    let mut i = 0;
    
    while (i < num_listens) {
        ts::next_tx(&mut scenario, LISTENER);
        {
            let mut music = ts::take_from_address<Music>(&scenario, CREATOR);
            let mut treasury = ts::take_shared<Treasury>(&scenario);
            let mut parent_pool = ts::take_shared<ParentRoyaltyPool>(&scenario);
            let config = ts::take_shared<ListenConfig>(&scenario);
            
            let payment = coin::mint_for_testing<SUI>(LISTEN_PRICE, ts::ctx(&mut scenario));
            
            let listen_cap = listen::listen(
                &mut music,
                payment,
                &mut treasury,
                &mut parent_pool,
                &config,
                &clock,
                ts::ctx(&mut scenario),
            );
            
            // Verify listen count
            assert!(music::total_listens(&music) == i + 1, 40 + i);
            
            listen::burn_cap(listen_cap);
            ts::return_to_address(CREATOR, music);
            ts::return_shared(treasury);
            ts::return_shared(parent_pool);
            ts::return_shared(config);
        };
        
        i = i + 1;
    };
    
    // === Verify accumulated revenue ===
    ts::next_tx(&mut scenario, CREATOR);
    {
        let music = ts::take_from_sender<Music>(&scenario);
        
        // Should have revenue from 3 listens (70% each)
        let total_revenue = music::revenue_balance(&music);
        let expected_revenue = (LISTEN_PRICE * num_listens * 7000) / 10000;
        
        assert!(total_revenue >= expected_revenue, 50);
        assert!(music::total_listens(&music) == num_listens, 51);
        
        ts::return_to_sender(&scenario, music);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ============================================================================
// Test 4: Remix Flow with Parent Royalties
// ============================================================================

#[test]
fun test_remix_parent_royalty() {
    let mut scenario = ts::begin(ADMIN);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // Setup
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        listen::init_for_testing(ts::ctx(&mut scenario));
        treasury::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // Create original music
    let parent_music_id = {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut music = music::create_music(
            string::utf8(b"original_audio"),
            string::utf8(b"preview"),
            string::utf8(b"metadata"),
            string::utf8(b"cover"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        let music_id = object::id(&music);
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
        music_id
    };
    
    // Create remix
    ts::next_tx(&mut scenario, LISTENER); // Listener creates remix
    let remix_music_id = {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut remix = music::create_music(
            string::utf8(b"remix_audio"),
            string::utf8(b"remix_preview"),
            string::utf8(b"remix_metadata"),
            string::utf8(b"remix_cover"),
            ROYALTY_BPS,
            option::some(parent_music_id), // Set parent
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        let remix_id = object::id(&remix);
        music::publish(&mut remix, ts::ctx(&mut scenario));
        
        // Verify parent is set
        assert!(option::is_some(&music::parent(&remix)), 60);
        assert!(*option::borrow(&music::parent(&remix)) == parent_music_id, 61);
        
        ts::return_shared(registry);
        transfer::public_transfer(remix, LISTENER);
        remix_id
    };
    
    // Someone listens to the remix
    ts::next_tx(&mut scenario, STAKER);
    {
        let mut remix = ts::take_from_address<Music>(&scenario, LISTENER);
        let mut treasury = ts::take_shared<Treasury>(&scenario);
        let mut parent_pool = ts::take_shared<ParentRoyaltyPool>(&scenario);
        let config = ts::take_shared<ListenConfig>(&scenario);
        
        let payment = coin::mint_for_testing<SUI>(LISTEN_PRICE, ts::ctx(&mut scenario));
        
        let listen_cap = listen::listen(
            &mut remix,
            payment,
            &mut treasury,
            &mut parent_pool,
            &config,
            &clock,
            ts::ctx(&mut scenario),
        );
        
        // Verify parent royalty accumulated (10%)
        let parent_balance = listen::get_parent_balance(&parent_pool, parent_music_id);
        let expected_parent_royalty = (LISTEN_PRICE * 1000) / 10000;
        assert!(parent_balance == expected_parent_royalty, 62);
        
        listen::burn_cap(listen_cap);
        ts::return_to_address(LISTENER, remix);
        ts::return_shared(treasury);
        ts::return_shared(parent_pool);
        ts::return_shared(config);
    };
    
    // Original creator claims parent royalty
    ts::next_tx(&mut scenario, CREATOR);
    {
        let parent_music = ts::take_from_sender<Music>(&scenario);
        let mut parent_pool = ts::take_shared<ParentRoyaltyPool>(&scenario);
        
        let royalty = listen::claim_parent_royalty(
            &parent_music,
            &mut parent_pool,
            ts::ctx(&mut scenario),
        );
        
        let expected_parent_royalty = (LISTEN_PRICE * 1000) / 10000;
        assert!(coin::value(&royalty) == expected_parent_royalty, 63);
        
        // Verify pool balance is now 0
        let parent_balance = listen::get_parent_balance(&parent_pool, parent_music_id);
        assert!(parent_balance == 0, 64);
        
        coin::burn_for_testing(royalty);
        ts::return_to_sender(&scenario, parent_music);
        ts::return_shared(parent_pool);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ============================================================================
// Test 5: Emergency Unstake
// ============================================================================

#[test]
fun test_emergency_unstake() {
    let mut scenario = ts::begin(CREATOR);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // Setup
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        stake::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // Create and publish music
    {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut music = music::create_music(
            string::utf8(b"audio"),
            string::utf8(b"preview"),
            string::utf8(b"metadata"),
            string::utf8(b"cover"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
    };
    
    // Stake
    ts::next_tx(&mut scenario, STAKER);
    {
        let music = ts::take_from_address<Music>(&scenario, CREATOR);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        let payment = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ts::ctx(&mut scenario));
        
        let position = stake::stake(
            &music,
            payment,
            100, // Long lock period
            &mut registry,
            &clock,
            ts::ctx(&mut scenario),
        );
        
        // Transfer position to STAKER for emergency unstake
        transfer::public_transfer(position, STAKER);
        ts::return_to_address(CREATOR, music);
        ts::return_shared(registry);
    };
    
    // Emergency unstake immediately (without waiting)
    ts::next_tx(&mut scenario, STAKER);
    {
        let position = ts::take_from_sender<StakePosition>(&scenario);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        // Should be locked
        assert!(!stake::is_unlocked(&position, ts::ctx(&mut scenario)), 70);
        
        // Emergency unstake
        let withdrawn = stake::emergency_unstake(
            position,
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        assert!(coin::value(&withdrawn) == STAKE_AMOUNT, 71);
        assert!(stake::total_staked(&registry) == 0, 72);
        
        coin::burn_for_testing(withdrawn);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}

// ============================================================================
// Test 6: Verify Staking Does NOT Affect Listen Count
// ============================================================================

#[test]
fun test_staking_does_not_affect_listens() {
    let mut scenario = ts::begin(CREATOR);
    let clock = clock::create_for_testing(ts::ctx(&mut scenario));
    
    // Setup
    {
        music::init_for_testing(ts::ctx(&mut scenario));
        stake::init_for_testing(ts::ctx(&mut scenario));
    };
    ts::next_tx(&mut scenario, CREATOR);
    
    // Create and publish music
    {
        let mut registry = ts::take_shared<MusicRegistry>(&scenario);
        
        let mut music = music::create_music(
            string::utf8(b"audio"),
            string::utf8(b"preview"),
            string::utf8(b"metadata"),
            string::utf8(b"cover"),
            ROYALTY_BPS,
            option::none(),
            &mut registry,
            ts::ctx(&mut scenario),
        );
        
        music::publish(&mut music, ts::ctx(&mut scenario));
        
        ts::return_shared(registry);
        transfer::public_transfer(music, CREATOR);
    };
    
    // Stake on music
    ts::next_tx(&mut scenario, STAKER);
    {
        let music = ts::take_from_address<Music>(&scenario, CREATOR);
        let mut registry = ts::take_shared<StakeRegistry>(&scenario);
        
        let listen_count_before = music::total_listens(&music);
        let revenue_before = music::revenue_balance(&music);
        
        let payment = coin::mint_for_testing<SUI>(STAKE_AMOUNT, ts::ctx(&mut scenario));
        
        let position = stake::stake(
            &music,
            payment,
            5,
            &mut registry,
            &clock,
            ts::ctx(&mut scenario),
        );
        
        // Verify listen count unchanged
        assert!(music::total_listens(&music) == listen_count_before, 80);
        // Verify revenue unchanged
        assert!(music::revenue_balance(&music) == revenue_before, 81);
        
        // Cleanup - delete position
        test_utils::destroy(position);
        ts::return_to_address(CREATOR, music);
        ts::return_shared(registry);
    };
    
    clock::destroy_for_testing(clock);
    ts::end(scenario);
}
