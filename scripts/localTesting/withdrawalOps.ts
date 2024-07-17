import { viem } from "hardhat";
import { getContracts } from "./contractCollection";
import { Hex } from "viem";
import { CryptoStakingOps, WithdrawUSDTOps } from "../../test/CryptoStakingOps";
import { STAKE_FILENAME, StakeInfo } from "./interfaces";
import fs from "fs";
import { expect } from "chai";

export async function withdrawalOps(withdrawalOpsType: WithdrawUSDTOps) {
	const contractCollection = await getContracts();

	// load stakes from json
	let stakes: StakeInfo[] = [];

	if (fs.existsSync(STAKE_FILENAME)) {
		stakes = JSON.parse(fs.readFileSync(STAKE_FILENAME, "utf-8"));

		// filter stakes that has zero principal
		stakes = stakes.filter((stake) => BigInt(stake.current_principal) > 0n);
	} else throw new Error("No stakes found!");

	const num_stakers: number = Number(
		process.env["num_stakers"] ||
			Math.floor(Math.random() * stakes.length + 1)
	);

	if (num_stakers > stakes.length)
		throw new Error("num_stakers > stakes.length");

	const ops: string = WithdrawUSDTOps[withdrawalOpsType].toLowerCase();

	for (let i = 0; i < num_stakers; i++) {
		const {
			current_principal,
			wallet_address,
			txHash: stake_tx_hash,
			claimable_reward,
		} = stakes[i];

		// skip if amount is zero
		if (
			(withdrawalOpsType == WithdrawUSDTOps.UNSTAKE &&
				BigInt(current_principal) == 0n) ||
			(withdrawalOpsType == WithdrawUSDTOps.CLAIM_REWARD &&
				BigInt(claimable_reward) == 0n)
		) {
			return;
		}

		let withdrawalAmount: string;

		// determin withdrawal amount
		if (withdrawalOpsType == WithdrawUSDTOps.CLAIM_REWARD) {
			withdrawalAmount = 0n.toString();
		} else {
			withdrawalAmount = String(
				Math.random() < 0.2
					? current_principal
					: Math.floor(Math.random() * Number(current_principal))
			);
		}

		const response = (await (
			await fetch(
				`${process.env["BACKEND_URL"]}/staking/requestWithdrawal`,
				{
					method: "post",
					body: new URLSearchParams({
						stake_tx_hash,
						amount: withdrawalAmount,
						type: ops,
					} as {
						stake_tx_hash: Hex;
						amount: string;
						type: string;
					} as unknown as Record<string, string>),
				}
			)
		).json()) as {
			data: {
				signature: Hex;
				signature_payload: {
					ops: string;
					amount: bigint;
					timestamp: bigint;
				};
			};
		};

		const balanceUSDTBeforeContract =
			await contractCollection.USDT.read.balanceOf([
				contractCollection.CryptoStaking.address,
			]);
		const balanceUSDTBeforeStaker =
			await contractCollection.USDT.read.balanceOf([wallet_address]);

		// perform withdrawal ops
		const { txHash } = await CryptoStakingOps.unstakeOrClaimUSDT(
			contractCollection,
			await viem.getWalletClient(wallet_address),
			{
				signature: response.data.signature,
				payload: {
					timestamp: BigInt(
						response.data.signature_payload.timestamp
					),
					amount: BigInt(response.data.signature_payload.amount),
					ops: WithdrawUSDTOps[
						response.data.signature_payload.ops.toUpperCase() as keyof typeof WithdrawUSDTOps
					],
				},
			}
		);

		// validate balance after fro contract & staker
		expect(
			await contractCollection.USDT.read.balanceOf([
				contractCollection.CryptoStaking.address,
			])
		).equal(balanceUSDTBeforeContract - BigInt(withdrawalAmount));

		expect(
			await contractCollection.USDT.read.balanceOf([wallet_address])
		).equal(balanceUSDTBeforeStaker + BigInt(withdrawalAmount));

		console.log(
			`Staker ${wallet_address} has successfully ${
				withdrawalOpsType == WithdrawUSDTOps.UNSTAKE
					? "unstaked"
					: "claimed reward"
			} ${withdrawalAmount} USDT\n${response.data}`
		);

		// update stake if unstake
		if (withdrawalOpsType == WithdrawUSDTOps.UNSTAKE) {
			stakes[i] = {
				...stakes[i],
				current_principal: (
					BigInt(current_principal) - BigInt(withdrawalAmount)
				).toString(),
			};
		}
	}

	console.log(
		`${num_stakers} have ${
			withdrawalOpsType == WithdrawUSDTOps.UNSTAKE
				? "unstaked"
				: "claimed reward"
		}`
	);

	// save file to json
	fs.writeFileSync(STAKE_FILENAME, JSON.stringify(stakes, undefined, 4));
}
