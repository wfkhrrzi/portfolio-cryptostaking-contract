// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CryptoStaking is Initializable, ReentrancyGuardUpgradeable {
	/**
	 * @dev usdt contract
	 */
	IERC20 public usdt;

	/**
	 * @dev backend signer
	 */
	address public backendSigner;

	/**
	 * @dev store revoked signatures
	 */
	mapping(bytes => bool) public invalidSignature;

	/**
	 * @dev usdt withdrawal ops identifier
	 */
	enum WithdrawUSDTOps {
		UNSTAKE,
		CLAIM_REWARD
	}

	/**
	 * @dev param definition for signature
	 */
	struct WithdrawUSDTSignaturePayload {
		WithdrawUSDTOps ops;
		uint256 amount;
		uint256 timestamp;
	}

	event StakeUSDT(uint256 amount);
	event UnstakeUSDT(uint256 amount);
	event ClaimUSDTReward(uint256 amount);

	error SignatureAlreadyClaimed(bytes signature);
	error InvalidSignature(bytes32 hashedMessage, bytes signature);

	/// @custom:oz-upgrades-unsafe-allow constructor
	constructor() {
		_disableInitializers();
	}

	function initialize(
		IERC20 _usdt,
		address _backendSigner
	) public initializer {
		__ReentrancyGuard_init();

		usdt = _usdt;
		backendSigner = _backendSigner;
	}

	// ====================
	// Staking operations
	// ====================

	function stakeUSDT(uint256 amount) external nonReentrant {
		// stake
		usdt.transferFrom(msg.sender, address(this), amount);

		// emit event
		emit StakeUSDT(amount);
	}

	function unstakeOrClaimUSDT(
		bytes calldata signature,
		WithdrawUSDTSignaturePayload calldata payload
	) external nonReentrant {
		// verify signature
		_validateSignature(_getHashedMessage(payload), signature);

        // revoke signature
        invalidSignature[signature] = true;

		// unstake
		usdt.transfer(msg.sender, payload.amount);

		// emit event
		if (payload.ops == WithdrawUSDTOps.UNSTAKE) {
			emit UnstakeUSDT(payload.amount);
		} else {
			emit ClaimUSDTReward(payload.amount);
		}
	}

	// ====================================
	// Claim Reward Signature Helper tools
	// ====================================

	function _validateSignature(
		bytes32 hashedMessage,
		bytes memory signature
	) internal view {
		// check if signature has already been used
		if (invalidSignature[signature])
			revert SignatureAlreadyClaimed(signature);

		// check if signature matches the signer's address
		if (ECDSA.recover(hashedMessage, signature) != backendSigner)
			revert InvalidSignature(hashedMessage, signature);
	}

	/**
	 * Returns the hashed message from the given payload
	 * @param payload signatureInfo
	 */
	function _getHashedMessage(
		WithdrawUSDTSignaturePayload calldata payload
	) internal view returns (bytes32 hashedMessage) {
		string memory message = string(
			abi.encodePacked(
				Strings.toHexString(tx.origin),
				"_",
				Strings.toString(uint256(payload.ops)),
				"_",
				Strings.toString(payload.amount),
				"_",
				Strings.toString(payload.timestamp)
			)
		);

		hashedMessage = keccak256(
			abi.encodePacked(
				"\x19Ethereum Signed Message:\n",
				Strings.toString(bytes(message).length),
				message
			)
		); // format: address_timestamp_type_quantity
	}
}
