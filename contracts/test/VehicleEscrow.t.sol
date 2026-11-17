// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VehicleEscrow} from "../src/VehicleEscrow.sol";
import {MockUSDC, ReentrantUSDC} from "./mocks/MockUSDC.sol";

contract VehicleEscrowTest is Test {
    VehicleEscrow internal escrow;
    MockUSDC internal usdc;

    address internal buyer = address(0xB0B);
    address internal seller = address(0x5E11E);
    address internal arbiter = address(0xA2B17E2);
    address internal stranger = address(0xBAD);

    uint256 internal constant AMOUNT = 15_000e6;
    bytes32 internal constant LISTING = keccak256("listing-1");

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new VehicleEscrow(IERC20(address(usdc)), arbiter);
        usdc.mint(buyer, 1_000_000e6);
        vm.prank(buyer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ------------------------------------------------------------- helpers

    function _open() internal returns (uint256 id) {
        vm.prank(buyer);
        id = escrow.createEscrow(LISTING, seller, AMOUNT);
    }

    function _funded() internal returns (uint256 id) {
        id = _open();
        vm.prank(buyer);
        escrow.fund(id);
    }

    function _shipped() internal returns (uint256 id) {
        id = _funded();
        vm.prank(seller);
        escrow.markShipped(id);
    }

    // ---------------------------------------------------------- happy path

    function test_HappyPath() public {
        uint256 id = _shipped();
        vm.prank(buyer);
        escrow.confirmDelivery(id);

        assertEq(usdc.balanceOf(seller), AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(VehicleEscrow.State.RELEASED));
    }

    function test_FundMovesUsdcIntoContract() public {
        uint256 id = _funded();
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(VehicleEscrow.State.FUNDED));
    }

    // -------------------------------------------------------------- refund

    function test_RefundByArbiter() public {
        uint256 id = _funded();
        uint256 before = usdc.balanceOf(buyer);

        vm.prank(arbiter);
        escrow.refund(id);

        assertEq(usdc.balanceOf(buyer), before + AMOUNT);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(VehicleEscrow.State.REFUNDED));
    }

    function test_RevertWhen_NonArbiterRefunds() public {
        uint256 id = _funded();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(VehicleEscrow.NotAuthorized.selector, stranger)
        );
        escrow.refund(id);
    }

    function test_RevertWhen_RefundAfterRelease() public {
        uint256 id = _shipped();
        vm.prank(buyer);
        escrow.confirmDelivery(id);

        vm.prank(arbiter);
        vm.expectRevert(
            abi.encodeWithSelector(
                VehicleEscrow.WrongState.selector, id, VehicleEscrow.State.RELEASED
            )
        );
        escrow.refund(id);
    }

    function test_RefundAllowedWhenDisputed() public {
        uint256 id = _shipped();
        vm.prank(buyer);
        escrow.dispute(id);
        uint256 before = usdc.balanceOf(buyer);

        vm.prank(arbiter);
        escrow.refund(id);

        assertEq(usdc.balanceOf(buyer), before + AMOUNT);
    }

    // ------------------------------------------------- arbiter asymmetry

    function test_RevertWhen_ArbiterReleasesWithoutDispute() public {
        uint256 id = _shipped();
        vm.prank(arbiter);
        vm.expectRevert(
            abi.encodeWithSelector(
                VehicleEscrow.WrongState.selector, id, VehicleEscrow.State.SHIPPED
            )
        );
        escrow.releaseToSeller(id);
    }

    function test_ArbiterCanReleaseOnlyInsideDispute() public {
        uint256 id = _shipped();
        vm.prank(buyer);
        escrow.dispute(id);

        vm.prank(arbiter);
        escrow.releaseToSeller(id);

        assertEq(usdc.balanceOf(seller), AMOUNT);
    }

    // ----------------------------------------------------------- disputes

    function test_DisputeFreezesTimer() public {
        uint256 id = _shipped();
        vm.prank(buyer);
        escrow.dispute(id);

        vm.warp(block.timestamp + 30 days);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                VehicleEscrow.WrongState.selector, id, VehicleEscrow.State.DISPUTED
            )
        );
        escrow.releaseByTimeout(id);
    }

    function test_RevertWhen_DisputeAfterDeadline() public {
        uint256 id = _shipped();
        vm.warp(block.timestamp + 14 days);

        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VehicleEscrow.TimeoutAlreadyReached.selector, id)
        );
        escrow.dispute(id);
    }

    function test_RevertWhen_DisputeByNonBuyer() public {
        uint256 id = _shipped();
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VehicleEscrow.NotAuthorized.selector, seller)
        );
        escrow.dispute(id);
    }

    // ------------------------------------------------------------ timeout

    function test_TimeoutReleasesToSeller() public {
        uint256 id = _shipped();
        vm.warp(block.timestamp + 14 days);

        vm.prank(stranger);
        escrow.releaseByTimeout(id);

        assertEq(usdc.balanceOf(seller), AMOUNT);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(VehicleEscrow.State.RELEASED));
    }

    function test_RevertWhen_TimeoutBeforeDeadline() public {
        uint256 id = _shipped();
        vm.warp(block.timestamp + 14 days - 1);

        vm.prank(stranger);
        vm.expectRevert();
        escrow.releaseByTimeout(id);
    }

    function test_TimeoutBoundaryIsExact() public {
        uint256 id = _shipped();
        uint64 deadline = escrow.releaseDeadline(id);
        vm.warp(deadline);

        vm.prank(stranger);
        escrow.releaseByTimeout(id);

        assertEq(usdc.balanceOf(seller), AMOUNT);
    }

    // ----------------------------------------------------------- lifecycle

    function test_RevertWhen_DoubleFund() public {
        uint256 id = _funded();
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                VehicleEscrow.WrongState.selector, id, VehicleEscrow.State.FUNDED
            )
        );
        escrow.fund(id);
    }

    function test_RevertWhen_NonBuyerFunds() public {
        uint256 id = _open();
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(VehicleEscrow.NotAuthorized.selector, stranger)
        );
        escrow.fund(id);
    }

    function test_CancelBeforeFunding() public {
        uint256 id = _open();
        vm.prank(seller);
        escrow.cancel(id);
        assertEq(uint8(escrow.getEscrow(id).state), uint8(VehicleEscrow.State.CANCELLED));
    }

    function test_RevertWhen_CancelAfterFunding() public {
        uint256 id = _funded();
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(
                VehicleEscrow.WrongState.selector, id, VehicleEscrow.State.FUNDED
            )
        );
        escrow.cancel(id);
    }

    function test_RevertWhen_BuyerIsSeller() public {
        vm.prank(buyer);
        vm.expectRevert(VehicleEscrow.InvalidParticipant.selector);
        escrow.createEscrow(LISTING, buyer, AMOUNT);
    }

    function test_RevertWhen_ZeroAmount() public {
        vm.prank(buyer);
        vm.expectRevert(VehicleEscrow.ZeroAmount.selector);
        escrow.createEscrow(LISTING, seller, 0);
    }

    function test_RevertWhen_UnknownEscrow() public {
        vm.expectRevert(abi.encodeWithSelector(VehicleEscrow.NotFound.selector, 999));
        escrow.getEscrow(999);
    }

    function test_RevertWhen_ConfirmByNonBuyer() public {
        uint256 id = _shipped();
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VehicleEscrow.NotAuthorized.selector, seller)
        );
        escrow.confirmDelivery(id);
    }

    // --------------------------------------------------------- reentrancy

    function test_ReentrancyOnReleaseIsBlocked() public {
        ReentrantUSDC bad = new ReentrantUSDC();
        VehicleEscrow e2 = new VehicleEscrow(IERC20(address(bad)), arbiter);
        bad.mint(buyer, AMOUNT);

        vm.startPrank(buyer);
        bad.approve(address(e2), type(uint256).max);
        uint256 id = e2.createEscrow(LISTING, seller, AMOUNT);
        e2.fund(id);
        vm.stopPrank();

        vm.prank(seller);
        e2.markShipped(id);
        vm.warp(block.timestamp + 14 days);

        // Token re-enters the permissionless release path during the payout transfer.
        bad.arm(address(e2), abi.encodeWithSelector(VehicleEscrow.releaseByTimeout.selector, id));

        vm.prank(stranger);
        e2.releaseByTimeout(id);

        assertFalse(bad.reentrySucceeded(), "reentrant release must not succeed");
        assertEq(bad.balanceOf(seller), AMOUNT, "seller must be paid exactly once");
        assertEq(bad.balanceOf(address(e2)), 0);
    }
}
