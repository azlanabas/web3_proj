// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev ERC20 that re-enters a target contract during transfer, for guard testing.
contract ReentrantUSDC is ERC20 {
    address public target;
    bytes public payload;
    bool public reentrySucceeded;

    constructor() ERC20("USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address target_, bytes calldata payload_) external {
        target = target_;
        payload = payload_;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        address t = target;
        if (t != address(0)) {
            target = address(0);
            (bool ok,) = t.call(payload);
            if (ok) reentrySucceeded = true;
        }
        return super.transfer(to, value);
    }
}
