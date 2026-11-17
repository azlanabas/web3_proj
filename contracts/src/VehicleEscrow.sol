// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title VehicleEscrow
/// @notice Non-custodial USDC escrow for vehicle sales.
/// @dev One deployment holds many escrows. Immutable, non-upgradeable by design.
contract VehicleEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        NONE,
        CREATED,
        FUNDED,
        SHIPPED,
        DISPUTED,
        RELEASED,
        REFUNDED,
        CANCELLED
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint64 shippedAt;
        uint64 disputedAt;
        State state;
    }

    /// @notice Window after shipment before anyone may release to the seller.
    uint64 public constant RELEASE_TIMEOUT = 14 days;

    IERC20 public immutable usdc;
    address public immutable arbiter;

    uint256 public nextEscrowId = 1;
    mapping(uint256 => Escrow) private _escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        bytes32 indexed listingId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    event Funded(uint256 indexed escrowId, uint256 amount);
    event Shipped(uint256 indexed escrowId, uint64 shippedAt);
    event Disputed(uint256 indexed escrowId, uint64 disputedAt);
    event Released(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event Refunded(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event Cancelled(uint256 indexed escrowId, address indexed cancelledBy);

    error ZeroAddress();
    error ZeroAmount();
    error InvalidParticipant();
    error NotFound(uint256 escrowId);
    error WrongState(uint256 escrowId, State current);
    error NotAuthorized(address caller);
    error AlreadyDisputed(uint256 escrowId);
    error TimeoutNotReached(uint256 escrowId, uint64 availableAt);
    error TimeoutAlreadyReached(uint256 escrowId);

    constructor(IERC20 usdc_, address arbiter_) {
        if (address(usdc_) == address(0) || arbiter_ == address(0)) revert ZeroAddress();
        usdc = usdc_;
        arbiter = arbiter_;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotAuthorized(msg.sender);
        _;
    }

    /// @notice Buyer opens an escrow for a listing. No funds move yet.
    function createEscrow(bytes32 listingId, address seller, uint256 amount)
        external
        returns (uint256 escrowId)
    {
        if (seller == address(0)) revert ZeroAddress();
        if (seller == msg.sender) revert InvalidParticipant();
        if (amount == 0) revert ZeroAmount();

        escrowId = nextEscrowId++;
        _escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            shippedAt: 0,
            disputedAt: 0,
            state: State.CREATED
        });

        emit EscrowCreated(escrowId, listingId, msg.sender, seller, amount);
    }

    /// @notice Buyer deposits USDC into the contract.
    function fund(uint256 escrowId) external nonReentrant {
        Escrow storage e = _requireState(escrowId, State.CREATED);
        if (msg.sender != e.buyer) revert NotAuthorized(msg.sender);

        e.state = State.FUNDED;
        emit Funded(escrowId, e.amount);
        usdc.safeTransferFrom(e.buyer, address(this), e.amount);
    }

    /// @notice Seller declares the vehicle shipped; starts the release timer.
    function markShipped(uint256 escrowId) external {
        Escrow storage e = _requireState(escrowId, State.FUNDED);
        if (msg.sender != e.seller) revert NotAuthorized(msg.sender);

        e.state = State.SHIPPED;
        e.shippedAt = uint64(block.timestamp);
        emit Shipped(escrowId, e.shippedAt);
    }

    /// @notice Buyer accepts delivery; releases funds to the seller.
    function confirmDelivery(uint256 escrowId) external nonReentrant {
        Escrow storage e = _requireState(escrowId, State.SHIPPED);
        if (msg.sender != e.buyer) revert NotAuthorized(msg.sender);
        _release(escrowId, e);
    }

    /// @notice Buyer freezes the timeout clock. Must happen before the deadline.
    function dispute(uint256 escrowId) external {
        Escrow storage e = _requireState(escrowId, State.SHIPPED);
        if (msg.sender != e.buyer) revert NotAuthorized(msg.sender);
        if (e.disputedAt != 0) revert AlreadyDisputed(escrowId);

        uint64 deadline = e.shippedAt + RELEASE_TIMEOUT;
        if (block.timestamp >= deadline) revert TimeoutAlreadyReached(escrowId);

        e.disputedAt = uint64(block.timestamp);
        e.state = State.DISPUTED;
        emit Disputed(escrowId, e.disputedAt);
    }

    /// @notice Permissionless: after the timeout, an undisputed escrow pays the seller.
    function releaseByTimeout(uint256 escrowId) external nonReentrant {
        Escrow storage e = _requireState(escrowId, State.SHIPPED);
        if (e.disputedAt != 0) revert AlreadyDisputed(escrowId);

        uint64 deadline = e.shippedAt + RELEASE_TIMEOUT;
        if (block.timestamp < deadline) revert TimeoutNotReached(escrowId, deadline);

        _release(escrowId, e);
    }

    /// @notice Arbiter returns funds to the buyer. The only way money goes buyer-ward.
    function refund(uint256 escrowId) external nonReentrant onlyArbiter {
        Escrow storage e = _load(escrowId);
        if (e.state != State.FUNDED && e.state != State.SHIPPED && e.state != State.DISPUTED) {
            revert WrongState(escrowId, e.state);
        }

        e.state = State.REFUNDED;
        uint256 amount = e.amount;
        emit Refunded(escrowId, e.buyer, amount);
        usdc.safeTransfer(e.buyer, amount);
    }

    /// @notice Arbiter rules for the seller. Only reachable inside a raised dispute.
    function releaseToSeller(uint256 escrowId) external nonReentrant onlyArbiter {
        Escrow storage e = _requireState(escrowId, State.DISPUTED);
        _release(escrowId, e);
    }

    /// @notice Either party may cancel an unfunded escrow.
    function cancel(uint256 escrowId) external {
        Escrow storage e = _requireState(escrowId, State.CREATED);
        if (msg.sender != e.buyer && msg.sender != e.seller) revert NotAuthorized(msg.sender);

        e.state = State.CANCELLED;
        emit Cancelled(escrowId, msg.sender);
    }

    // ---------------------------------------------------------------- views

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return _load(escrowId);
    }

    function releaseDeadline(uint256 escrowId) external view returns (uint64) {
        Escrow storage e = _load(escrowId);
        if (e.shippedAt == 0) return 0;
        return e.shippedAt + RELEASE_TIMEOUT;
    }

    // -------------------------------------------------------------- internal

    function _release(uint256 escrowId, Escrow storage e) private {
        e.state = State.RELEASED;
        uint256 amount = e.amount;
        emit Released(escrowId, e.seller, amount);
        usdc.safeTransfer(e.seller, amount);
    }

    function _load(uint256 escrowId) private view returns (Escrow storage e) {
        e = _escrows[escrowId];
        if (e.state == State.NONE) revert NotFound(escrowId);
    }

    function _requireState(uint256 escrowId, State expected)
        private
        view
        returns (Escrow storage e)
    {
        e = _load(escrowId);
        if (e.state != expected) revert WrongState(escrowId, e.state);
    }
}
