import { viem } from "hardhat";
import { parseEther } from "viem";
import { deployContracts } from "../scripts/deployContract/deployScript";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import {
	ContractCollection,
	CryptoStakingOps,
	WithdrawUSDTOps,
} from "./CryptoStakingOps";

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

	it("Stake", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// stake
		await CryptoStakingOps.stakeUSDT(contracts, staker, parseEther("10"));
	});

	it("Unstake", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// unstake
		const signaturePayload =
			await CryptoStakingOps.generateWithdrawUSDTOpsSignature(
				staker.account.address,
				await contracts.CryptoStaking.read.backendSigner(),
				WithdrawUSDTOps.UNSTAKE,
				parseEther("9")
			);

		await CryptoStakingOps.unstakeOrClaimUSDT(
			contracts,
			staker,
			signaturePayload
		);
	});

	it("Claim Reward", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// claim reward
		const signaturePayload =
			await CryptoStakingOps.generateWithdrawUSDTOpsSignature(
				staker.account.address,
				await contracts.CryptoStaking.read.backendSigner(),
				WithdrawUSDTOps.CLAIM_REWARD,
				parseEther("0.5")
			);

		await CryptoStakingOps.unstakeOrClaimUSDT(
			contracts,
			staker,
			signaturePayload
		);
	});

	it("Rejects CryptoStakingOps.unstakeOrClaimUSDT tx when reusing revoked signature", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// unstake
		const signaturePayload =
			await CryptoStakingOps.generateWithdrawUSDTOpsSignature(
				staker.account.address,
				await contracts.CryptoStaking.read.backendSigner(),
				WithdrawUSDTOps.UNSTAKE,
				parseEther("0.5")
			);

		// successful
		await CryptoStakingOps.unstakeOrClaimUSDT(
			contracts,
			staker,
			signaturePayload
		);

		// failure
		await CryptoStakingOps.unstakeOrClaimUSDT(
			contracts,
			staker,
			signaturePayload,
			true
		);
	});

	it("Rejects stake tx when user has insufficient USDT balance", async function () {
		const { CryptoStakingContract, USDTContract, contracts } =
			await loadFixture(deployCryptoStakingFixture);

		const staker = (await viem.getWalletClients())[1];

		// successful
		await CryptoStakingOps.stakeUSDT(
			contracts,
			staker,
			await USDTContract.read.balanceOf([staker.account.address])
		);

		// failure
		await CryptoStakingOps.stakeUSDT(
			contracts,
			staker,
			parseEther("1"),
			true
		);
	});
});
