module solo_escrow::escrow {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ── Error Codes ──
    const E_NOT_CLIENT: u64 = 0;
    const E_NOT_OPERATOR: u64 = 1;
    const E_INVALID_STATUS: u64 = 2;
    const E_MILESTONE_NOT_FOUND: u64 = 3;
    const E_MILESTONE_NOT_FUNDED: u64 = 4;
    const E_MILESTONE_ALREADY_FUNDED: u64 = 5;
    const E_INSUFFICIENT_AMOUNT: u64 = 6;
    const E_ESCROW_NOT_ACTIVE: u64 = 7;
    const E_MILESTONE_NOT_PENDING_RELEASE: u64 = 8;
    const E_LENGTH_MISMATCH: u64 = 9;

    // ── Status Constants ──
    const STATUS_CREATED: u8 = 0;
    const STATUS_PARTIALLY_FUNDED: u8 = 1;
    const STATUS_FULLY_FUNDED: u8 = 2;
    const STATUS_IN_PROGRESS: u8 = 3;
    const STATUS_COMPLETED: u8 = 4;
    const STATUS_CANCELLED: u8 = 5;
    const STATUS_DISPUTED: u8 = 6;

    const MILESTONE_PENDING: u8 = 0;
    const MILESTONE_FUNDED: u8 = 1;
    const MILESTONE_RELEASE_REQUESTED: u8 = 2;
    const MILESTONE_RELEASED: u8 = 3;
    const MILESTONE_DISPUTED: u8 = 4;
    const MILESTONE_REFUNDED: u8 = 5;

    // ── Structs ──

    public struct Escrow<phantom T> has key {
        id: UID,
        client: address,
        operator: address,
        milestones: vector<Milestone<T>>,
        status: u8,
        quote_hash: vector<u8>,
        created_at_ms: u64,
    }

    public struct Milestone<phantom T> has store {
        amount: u64,
        balance: Balance<T>,
        description_hash: vector<u8>,
        status: u8,
    }

    // ── Events ──

    public struct EscrowCreatedEvent has copy, drop {
        escrow_id: ID,
        client: address,
        operator: address,
        milestone_count: u64,
        total_amount: u64,
        quote_hash: vector<u8>,
    }

    public struct MilestoneFundedEvent has copy, drop {
        escrow_id: ID,
        milestone_index: u64,
        amount: u64,
        funder: address,
    }

    public struct ReleaseRequestedEvent has copy, drop {
        escrow_id: ID,
        milestone_index: u64,
        operator: address,
    }

    public struct MilestoneReleasedEvent has copy, drop {
        escrow_id: ID,
        milestone_index: u64,
        amount: u64,
        operator: address,
    }

    public struct DisputeOpenedEvent has copy, drop {
        escrow_id: ID,
        milestone_index: u64,
        disputer: address,
    }

    public struct EscrowCancelledEvent has copy, drop {
        escrow_id: ID,
        cancelled_by: address,
        refunded_amount: u64,
    }

    // ── Entry Functions ──

    public entry fun create_escrow<T>(
        client: address,
        operator: address,
        amounts: vector<u64>,
        description_hashes: vector<vector<u8>>,
        quote_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let milestone_count = vector::length(&amounts);
        assert!(milestone_count == vector::length(&description_hashes), E_LENGTH_MISMATCH);

        let mut milestones = vector::empty<Milestone<T>>();
        let mut total_amount: u64 = 0;
        let mut i: u64 = 0;

        while (i < milestone_count) {
            let amount = *vector::borrow(&amounts, i);
            let desc_hash = *vector::borrow(&description_hashes, i);
            total_amount = total_amount + amount;

            vector::push_back(&mut milestones, Milestone<T> {
                amount,
                balance: balance::zero<T>(),
                description_hash: desc_hash,
                status: MILESTONE_PENDING,
            });
            i = i + 1;
        };

        let escrow = Escrow<T> {
            id: object::new(ctx),
            client,
            operator,
            milestones,
            status: STATUS_CREATED,
            quote_hash,
            created_at_ms: clock::timestamp_ms(clock),
        };

        let escrow_id = object::id(&escrow);

        event::emit(EscrowCreatedEvent {
            escrow_id,
            client,
            operator,
            milestone_count,
            total_amount,
            quote_hash,
        });

        transfer::share_object(escrow);
    }

    public entry fun fund_milestone<T>(
        escrow: &mut Escrow<T>,
        milestone_index: u64,
        payment: Coin<T>,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == escrow.client, E_NOT_CLIENT);
        assert!(escrow.status != STATUS_CANCELLED, E_ESCROW_NOT_ACTIVE);

        let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
        assert!(milestone.status == MILESTONE_PENDING, E_MILESTONE_ALREADY_FUNDED);

        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= milestone.amount, E_INSUFFICIENT_AMOUNT);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut milestone.balance, payment_balance);
        milestone.status = MILESTONE_FUNDED;

        if (all_milestones_funded(escrow)) {
            escrow.status = STATUS_FULLY_FUNDED;
        } else {
            escrow.status = STATUS_PARTIALLY_FUNDED;
        };

        event::emit(MilestoneFundedEvent {
            escrow_id: object::id(escrow),
            milestone_index,
            amount: payment_amount,
            funder: tx_context::sender(ctx),
        });
    }

    public entry fun request_release<T>(
        escrow: &mut Escrow<T>,
        milestone_index: u64,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == escrow.operator, E_NOT_OPERATOR);
        let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
        assert!(milestone.status == MILESTONE_FUNDED, E_MILESTONE_NOT_FUNDED);

        milestone.status = MILESTONE_RELEASE_REQUESTED;

        event::emit(ReleaseRequestedEvent {
            escrow_id: object::id(escrow),
            milestone_index,
            operator: escrow.operator,
        });
    }

    public entry fun release_milestone<T>(
        escrow: &mut Escrow<T>,
        milestone_index: u64,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == escrow.client, E_NOT_CLIENT);
        let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
        assert!(
            milestone.status == MILESTONE_FUNDED || milestone.status == MILESTONE_RELEASE_REQUESTED,
            E_MILESTONE_NOT_PENDING_RELEASE
        );

        let amount = balance::value(&milestone.balance);
        let released_coin = coin::from_balance(balance::withdraw_all(&mut milestone.balance), ctx);
        milestone.status = MILESTONE_RELEASED;

        transfer::public_transfer(released_coin, escrow.operator);

        if (all_milestones_released(escrow)) {
            escrow.status = STATUS_COMPLETED;
        } else {
            escrow.status = STATUS_IN_PROGRESS;
        };

        event::emit(MilestoneReleasedEvent {
            escrow_id: object::id(escrow),
            milestone_index,
            amount,
            operator: escrow.operator,
        });
    }

    public entry fun dispute_milestone<T>(
        escrow: &mut Escrow<T>,
        milestone_index: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.client || sender == escrow.operator, E_NOT_CLIENT);

        let milestone = vector::borrow_mut(&mut escrow.milestones, milestone_index);
        assert!(
            milestone.status == MILESTONE_FUNDED || milestone.status == MILESTONE_RELEASE_REQUESTED,
            E_INVALID_STATUS
        );

        milestone.status = MILESTONE_DISPUTED;
        escrow.status = STATUS_DISPUTED;

        event::emit(DisputeOpenedEvent {
            escrow_id: object::id(escrow),
            milestone_index,
            disputer: sender,
        });
    }

    public entry fun cancel_escrow<T>(
        escrow: &mut Escrow<T>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == escrow.client || sender == escrow.operator, E_NOT_CLIENT);
        assert!(escrow.status != STATUS_COMPLETED && escrow.status != STATUS_CANCELLED, E_INVALID_STATUS);

        let mut refunded_total: u64 = 0;
        let len = vector::length(&escrow.milestones);
        let mut i: u64 = 0;

        while (i < len) {
            let milestone = vector::borrow_mut(&mut escrow.milestones, i);
            if (milestone.status == MILESTONE_FUNDED || milestone.status == MILESTONE_RELEASE_REQUESTED) {
                let amount = balance::value(&milestone.balance);
                if (amount > 0) {
                    let refund = coin::from_balance(balance::withdraw_all(&mut milestone.balance), ctx);
                    transfer::public_transfer(refund, escrow.client);
                    refunded_total = refunded_total + amount;
                };
                milestone.status = MILESTONE_REFUNDED;
            };
            i = i + 1;
        };

        escrow.status = STATUS_CANCELLED;

        event::emit(EscrowCancelledEvent {
            escrow_id: object::id(escrow),
            cancelled_by: sender,
            refunded_amount: refunded_total,
        });
    }

    // ── Helper Functions ──

    fun all_milestones_funded<T>(escrow: &Escrow<T>): bool {
        let len = vector::length(&escrow.milestones);
        let mut i: u64 = 0;
        while (i < len) {
            let m = vector::borrow(&escrow.milestones, i);
            if (m.status == MILESTONE_PENDING) { return false };
            i = i + 1;
        };
        true
    }

    fun all_milestones_released<T>(escrow: &Escrow<T>): bool {
        let len = vector::length(&escrow.milestones);
        let mut i: u64 = 0;
        while (i < len) {
            let m = vector::borrow(&escrow.milestones, i);
            if (m.status != MILESTONE_RELEASED) { return false };
            i = i + 1;
        };
        true
    }
}
