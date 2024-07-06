// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
	address public constant TEST_WALLET =
		0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

	constructor() ERC20("Tether USD", "USDT") {
		uint256 initialSupply = 1000000000 * (10 ** decimals());
		_mint(TEST_WALLET, initialSupply);
	}

	function decimals() public view virtual override returns (uint8) {
		return 6;
	}

	function mint(address to, uint256 amount) external {
		_mint(to, amount);
	}
}
