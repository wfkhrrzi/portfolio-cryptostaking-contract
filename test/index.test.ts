import { viem } from "hardhat";
import { Address, Hex, parseEther } from "viem";
import { deployContracts } from "../scripts/deployContract/deployScript";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import {
	GetContractReturnType,
	WalletClient,
} from "@nomicfoundation/hardhat-viem/types";
import { CryptoStaking$Type } from "../artifacts/contracts/CryptoStaking.sol/CryptoStaking";
import { USDT$Type } from "../artifacts/contracts/USDT.sol/USDT";

enum WithdrawUSDTOps {
	UNSTAKE,
	CLAIM_REWARD,
}
type WithdrawUSDTOpsSignature = {
	signature: Hex;
	payload: {
		ops: WithdrawUSDTOps;
		amount: bigint;
		timestamp: bigint;
	};
};
type ContractCollection = {
	CryptoStaking: GetContractReturnType<CryptoStaking$Type["abi"]>;
	USDT: GetContractReturnType<USDT$Type["abi"]>;
};

describe("Crypto Staking Platform", async function () {
	async function deployCryptoStakingFixture() {
		const { CryptoStakingContract, USDTContract } = await deployContracts();

		const accounts = await viem.getWalletClients();

		// mint usdt & approve cryptostaking
		const amountMint = parseEther("100");
		for (let i = 0; i < accounts.length; i++) {
			const account = accounts[i];
			await USDTContract.write.mint([
				account.account.address,
				amountMint,
			]);
			await USDTContract.write.approve(
				[CryptoStakingContract.address, amountMint],
				{ account: account.account }
			);
		}

		// mint usdt to crypto contract
		await USDTContract.write.mint([
			CryptoStakingContract.address,
			parseEther("100000"),
		]);

		return {
			CryptoStakingContract,
			USDTContract,
			contracts: {
				CryptoStaking: CryptoStakingContract,
				USDT: USDTContract,
			} as ContractCollection,
		};
	}

	async function generateWithdrawUSDTOpsSignature(
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

	async function stakeUSDT(
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

	async function unstakeOrClaimUSDT(
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

	it("Stake", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// stake
		await stakeUSDT(contracts, staker, parseEther("10"));
	});

	it("Unstake", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// unstake
		const signaturePayload = await generateWithdrawUSDTOpsSignature(
			staker.account.address,
			await contracts.CryptoStaking.read.backendSigner(),
			WithdrawUSDTOps.UNSTAKE,
			parseEther("9")
		);

		await unstakeOrClaimUSDT(contracts, staker, signaturePayload);
	});

	it("Claim Reward", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// claim reward
		const signaturePayload = await generateWithdrawUSDTOpsSignature(
			staker.account.address,
			await contracts.CryptoStaking.read.backendSigner(),
			WithdrawUSDTOps.CLAIM_REWARD,
			parseEther("0.5")
		);

		await unstakeOrClaimUSDT(contracts, staker, signaturePayload);
	});

	it("Rejects unstakeOrClaimUSDT tx when reusing revoked signature", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// unstake
		const signaturePayload = await generateWithdrawUSDTOpsSignature(
			staker.account.address,
			await contracts.CryptoStaking.read.backendSigner(),
			WithdrawUSDTOps.UNSTAKE,
			parseEther("0.5")
		);

		// successful
		await unstakeOrClaimUSDT(contracts, staker, signaturePayload);

		// failure
		await unstakeOrClaimUSDT(contracts, staker, signaturePayload, true);
	});

	it("Rejects stake tx when user has insufficient USDT balance", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// successful
		await stakeUSDT(
			contracts,
			staker,
			await USDTContract.read.balanceOf([staker.account.address])
		);

		// failure
		await stakeUSDT(contracts, staker, parseEther("1"), true);
	});
});
