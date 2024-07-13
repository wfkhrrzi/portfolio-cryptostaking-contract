import {
	GetContractReturnType,
	WalletClient,
} from "@nomicfoundation/hardhat-viem/types";
import { CryptoStaking$Type } from "../artifacts/contracts/CryptoStaking.sol/CryptoStaking";
import { USDT$Type } from "../artifacts/contracts/USDT.sol/USDT";
import { expect } from "chai";
import { Address, Hex } from "viem";
import { viem } from "hardhat";

export enum WithdrawUSDTOps {
	UNSTAKE,
	CLAIM_REWARD,
}
export type WithdrawUSDTOpsSignature = {
	signature: Hex;
	payload: {
		ops: WithdrawUSDTOps;
		amount: bigint;
		timestamp: bigint;
	};
};
export type ContractCollection = {
	CryptoStaking: GetContractReturnType<CryptoStaking$Type["abi"]>;
	USDT: GetContractReturnType<USDT$Type["abi"]>;
};

export class CryptoStakingOps {
	static async stakeUSDT(
		contracts: ContractCollection,
		staker: WalletClient,
		amount: bigint,
		expectFailure = false
	) {
		// record balances
		const balanceBeforeStaker = await contracts.USDT.read.balanceOf([
			staker.account.address,
		]);
		const balanceBeforeContract = await contracts.USDT.read.balanceOf([
			contracts.CryptoStaking.address,
		]);

		// stake
		const tx = contracts.CryptoStaking.write.stakeUSDT([amount], {
			account: staker.account.address,
		});

		if (expectFailure) {
			await expect(tx).rejected;
			return;
		}
		await expect(tx).fulfilled;

		// validation
		expect(
			await contracts.USDT.read.balanceOf([staker.account.address])
		).equal(balanceBeforeStaker - amount);
		expect(
			await contracts.USDT.read.balanceOf([
				contracts.CryptoStaking.address,
			])
		).equal(balanceBeforeContract + amount);
	}

	static async unstakeOrClaimUSDT(
		contracts: ContractCollection,
		staker: WalletClient,
		signaturePayload: WithdrawUSDTOpsSignature,
		expectFailure = false
	) {
		// record balances
		const beforeWithdrawOpsStaker = await contracts.USDT.read.balanceOf([
			staker.account.address,
		]);
		const beforeWithdrawOpsContract = await contracts.USDT.read.balanceOf([
			contracts.CryptoStaking.address,
		]);

		// unstake or claim
		const tx = contracts.CryptoStaking.write.unstakeOrClaimUSDT(
			[signaturePayload.signature, signaturePayload.payload],
			{
				account: staker.account.address,
			}
		);

		if (expectFailure) {
			await expect(tx).rejected;
			return;
		}
		await expect(tx).fulfilled;

		// validation
		expect(
			await contracts.USDT.read.balanceOf([staker.account.address])
		).equal(beforeWithdrawOpsStaker + signaturePayload.payload.amount);
		expect(
			await contracts.USDT.read.balanceOf([
				contracts.CryptoStaking.address,
			])
		).equal(beforeWithdrawOpsContract - signaturePayload.payload.amount);
	}

	static async generateWithdrawUSDTOpsSignature(
		staker: Address,
		backendSigner: Address,
		ops: WithdrawUSDTOps,
		amount: bigint,
		timestamp?: bigint
	): Promise<WithdrawUSDTOpsSignature> {
		const backendSignerWallet = await viem.getWalletClient(backendSigner);

		timestamp =
			timestamp || BigInt(Math.floor(Date.now() + Math.random() * 9999));

		// generate signature
		const message = `${staker}_${ops}_${amount}_${timestamp}`;
		const signature = await backendSignerWallet.signMessage({ message });

		return {
			signature,
			payload: {
				amount,
				ops,
				timestamp,
			},
		};
	}
}
