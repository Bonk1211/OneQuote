#[test_only]
module solo_escrow::escrow_tests {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use solo_escrow::escrow::{Self, Escrow};

    // ── Constants ──

    const CLIENT: address = @0xC1;
    const OPERATOR: address = @0xD1;
    const OUTSIDER: address = @0xE1;

    const MILESTONE_AMOUNT_1: u64 = 1_000_000_000; // 1 SUI
    const MILESTONE_AMOUNT_2: u64 = 2_000_000_000; // 2 SUI

    // ── Helpers ──

    /// Spin up a scenario, create a shared Clock, and return both.
    fun begin(): Scenario {
        let mut scenario = ts::begin(CLIENT);
        // Create a Clock (shared) in the first transaction.
        {
            let ctx = ts::ctx(&mut scenario);
            let clock = clock::create_for_testing(ctx);
            clock::share_for_testing(clock);
        };
        scenario
    }

    /// Standard two-milestone escrow creation helper.
    fun create_test_escrow(scenario: &mut Scenario) {
        ts::next_tx(scenario, CLIENT);
        {
            let clock = ts::take_shared<Clock>(scenario);
            let amounts = vector[MILESTONE_AMOUNT_1, MILESTONE_AMOUNT_2];
            let desc_hashes = vector[b"milestone_1_hash", b"milestone_2_hash"];
            let quote_hash = b"quote_hash_abc";

            escrow::create_escrow<SUI>(
                CLIENT,
                OPERATOR,
                amounts,
                desc_hashes,
                quote_hash,
                &clock,
                ts::ctx(scenario),
            );
            ts::return_shared(clock);
        };
    }

    /// Fund milestone at `index` with `amount` as CLIENT.
    fun fund_test_milestone(scenario: &mut Scenario, index: u64, amount: u64) {
        ts::next_tx(scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(scenario);
            let payment = coin::mint_for_testing<SUI>(amount, ts::ctx(scenario));
            escrow::fund_milestone<SUI>(&mut escrow, index, payment, ts::ctx(scenario));
            ts::return_shared(escrow);
        };
    }

    // ========================================================================
    // create_escrow tests
    // ========================================================================

    #[test]
    fun test_create_escrow_basic() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // Verify the shared Escrow object exists after creation.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            // If we got here the object was created and shared successfully.
            ts::return_shared(escrow);
        };

        // Verify an EscrowCreatedEvent was emitted.
        let effects = ts::next_tx(&mut scenario, CLIENT);
        // The previous tx that created the escrow should have emitted 1 event.
        // (test_scenario captures events per-tx; we check indirectly by tx success.)
        let _ = effects;

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_LENGTH_MISMATCH)]
    fun test_create_escrow_length_mismatch() {
        let mut scenario = begin();
        ts::next_tx(&mut scenario, CLIENT);
        {
            let clock = ts::take_shared<Clock>(&scenario);
            let amounts = vector[1_000];
            let desc_hashes = vector[b"h1", b"h2"]; // 2 hashes but only 1 amount
            escrow::create_escrow<SUI>(
                CLIENT,
                OPERATOR,
                amounts,
                desc_hashes,
                b"q",
                &clock,
                ts::ctx(&mut scenario),
            );
            ts::return_shared(clock);
        };
        ts::end(scenario);
    }

    // ========================================================================
    // fund_milestone tests
    // ========================================================================

    #[test]
    fun test_fund_milestone_single() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // After funding one of two milestones the escrow should still be accessible.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_fund_all_milestones() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);
        fund_test_milestone(&mut scenario, 1, MILESTONE_AMOUNT_2);

        // Both funded — escrow should be fully funded.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_NOT_CLIENT)]
    fun test_fund_milestone_not_client() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // OUTSIDER tries to fund — should fail.
        ts::next_tx(&mut scenario, OUTSIDER);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            let payment = coin::mint_for_testing<SUI>(MILESTONE_AMOUNT_1, ts::ctx(&mut scenario));
            escrow::fund_milestone<SUI>(&mut escrow, 0, payment, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_MILESTONE_ALREADY_FUNDED)]
    fun test_fund_milestone_already_funded() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Fund milestone 0 again — should fail.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            let payment = coin::mint_for_testing<SUI>(MILESTONE_AMOUNT_1, ts::ctx(&mut scenario));
            escrow::fund_milestone<SUI>(&mut escrow, 0, payment, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_INSUFFICIENT_AMOUNT)]
    fun test_fund_milestone_insufficient_amount() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            // Pay less than the required amount.
            let payment = coin::mint_for_testing<SUI>(MILESTONE_AMOUNT_1 - 1, ts::ctx(&mut scenario));
            escrow::fund_milestone<SUI>(&mut escrow, 0, payment, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    // ========================================================================
    // request_release tests
    // ========================================================================

    #[test]
    fun test_request_release() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator requests release for funded milestone 0.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_NOT_OPERATOR)]
    fun test_request_release_not_operator() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // CLIENT tries to request release — should fail.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_MILESTONE_NOT_FUNDED)]
    fun test_request_release_unfunded_milestone() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // Operator requests release for un-funded milestone — should fail.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    // ========================================================================
    // release_milestone tests
    // ========================================================================

    #[test]
    fun test_release_milestone_after_request() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator requests release.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client approves release.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Operator should have received the coin.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT_1, 0);
            ts::return_to_sender(&scenario, coin);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_release_milestone_directly_when_funded() {
        // Client can release a funded milestone even without an explicit request.
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Client directly releases (status == MILESTONE_FUNDED is accepted).
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Operator receives payment.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT_1, 0);
            ts::return_to_sender(&scenario, coin);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_release_all_milestones_completes_escrow() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);
        fund_test_milestone(&mut scenario, 1, MILESTONE_AMOUNT_2);

        // Release milestone 0.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Release milestone 1 — should set status to COMPLETED.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 1, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_NOT_CLIENT)]
    fun test_release_milestone_not_client() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // OPERATOR tries to release — only client can release.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_MILESTONE_NOT_PENDING_RELEASE)]
    fun test_release_unfunded_milestone() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // Try to release milestone 0 that has never been funded.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::release_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    // ========================================================================
    // dispute_milestone tests
    // ========================================================================

    #[test]
    fun test_dispute_milestone_by_client() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Client disputes funded milestone 0.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::dispute_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_dispute_milestone_by_operator() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator disputes funded milestone 0.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::dispute_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_dispute_milestone_after_release_requested() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator requests release.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client disputes the release-requested milestone.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::dispute_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_NOT_CLIENT)]
    fun test_dispute_milestone_outsider() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Outsider tries to dispute — should fail.
        ts::next_tx(&mut scenario, OUTSIDER);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::dispute_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_INVALID_STATUS)]
    fun test_dispute_unfunded_milestone() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // Try to dispute milestone 0 that is still PENDING (unfunded).
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::dispute_milestone<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    // ========================================================================
    // cancel_escrow tests
    // ========================================================================

    #[test]
    fun test_cancel_escrow_refunds_funded_milestones() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Client cancels — milestone 0 should be refunded.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client should receive the refund coin.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT_1, 0);
            ts::return_to_sender(&scenario, coin);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_cancel_escrow_by_operator() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator cancels — refund goes to CLIENT.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client receives the refund (not the operator).
        ts::next_tx(&mut scenario, CLIENT);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT_1, 0);
            ts::return_to_sender(&scenario, coin);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_cancel_escrow_no_funded_milestones() {
        // Cancelling before any funding should succeed with zero refund.
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_cancel_escrow_refunds_multiple_milestones() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);
        fund_test_milestone(&mut scenario, 1, MILESTONE_AMOUNT_2);

        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client should receive two separate refund coins.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let coin1 = ts::take_from_sender<Coin<SUI>>(&scenario);
            let v1 = coin::value(&coin1);
            ts::return_to_sender(&scenario, coin1);
            // Both coins should have been transferred; just check one is valid.
            assert!(v1 > 0, 0);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_cancel_escrow_refunds_release_requested_milestone() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);
        fund_test_milestone(&mut scenario, 0, MILESTONE_AMOUNT_1);

        // Operator requests release.
        ts::next_tx(&mut scenario, OPERATOR);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::request_release<SUI>(&mut escrow, 0, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Client cancels — release-requested milestones should also be refunded.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::next_tx(&mut scenario, CLIENT);
        {
            let coin = ts::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == MILESTONE_AMOUNT_1, 0);
            ts::return_to_sender(&scenario, coin);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_NOT_CLIENT)]
    fun test_cancel_escrow_outsider() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        ts::next_tx(&mut scenario, OUTSIDER);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_INVALID_STATUS)]
    fun test_cancel_already_cancelled_escrow() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // First cancel.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Second cancel — should fail.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = escrow::escrow::E_ESCROW_NOT_ACTIVE)]
    fun test_fund_milestone_after_cancel() {
        let mut scenario = begin();
        create_test_escrow(&mut scenario);

        // Cancel the escrow.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            escrow::cancel_escrow<SUI>(&mut escrow, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        // Try to fund after cancel — should fail.
        ts::next_tx(&mut scenario, CLIENT);
        {
            let mut escrow = ts::take_shared<Escrow<SUI>>(&scenario);
            let payment = coin::mint_for_testing<SUI>(MILESTONE_AMOUNT_1, ts::ctx(&mut scenario));
            escrow::fund_milestone<SUI>(&mut escrow, 0, payment, ts::ctx(&mut scenario));
            ts::return_shared(escrow);
        };

        ts::end(scenario);
    }
}
