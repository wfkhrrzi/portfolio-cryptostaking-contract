import { viem } from "hardhat";
import { getContracts } from "./contractCollection";
import { Hex, parseEther } from "viem";
import { CryptoStakingOps, WithdrawUSDTOps } from "../../test/CryptoStakingOps";
import assert from "assert";
import { STAKE_FILENAME, StakeInfo } from "./interfaces";
import fs from "fs";

async function main() {
	const client = await viem.getPublicClient();
	const contractCollection = await getContracts();

	assert(process.env["ACCESS_TOKEN"] !== undefined);

	// load stakes from json
	let stakes: StakeInfo[] = [];

	if (fs.existsSync(STAKE_FILENAME))
		stakes = JSON.parse(fs.readFileSync(STAKE_FILENAME, "utf-8"));
	else throw new Error("No stakes found!");

	const num_stakers: number = Number(
		process.env["num_stakers"] || Math.floor(Math.random() * stakes.length)
	);

	if (num_stakers > stakes.length)
		throw new Error("num_stakers > stakes.length");

	for (let i = 0; i < num_stakers; i++) {
		const { stake_amount, wallet_address, txHash } = stakes[i];

		const ops: string =
			WithdrawUSDTOps[WithdrawUSDTOps.UNSTAKE].toLowerCase();

		const response = (await (
			await fetch(
				`${process.env["BACKEND_URL"]}/staking/requestWithdrawal`,
				{
					method: "post",
					body: new URLSearchParams({
						stake_tx_hash: txHash,
						amount: stake_amount.toString(),
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

		try {
			// unstake
			const { txHash } = await CryptoStakingOps.unstakeOrClaimUSDT(
				contractCollection,
				await viem.getWalletClient(wallet_address),
				{
					signature: response.data.signature,
					payload: {
						...response.data.signature_payload,
						amount: BigInt(response.data.signature_payload.amount),
						ops: WithdrawUSDTOps[
							response.data.signature_payload.ops.toUpperCase() as keyof typeof WithdrawUSDTOps
						],
					},
				}
			);

			console.log(
				`Staker ${wallet_address} has successfully unstake ${stake_amount} USDT\n${response.data}`
			);

			// remove stake from json
			stakes = stakes.filter(
				({ wallet_address: _wallet_address }) =>
					wallet_address.toLowerCase() !==
					_wallet_address.toLowerCase()
			);
		} catch (error) {}
	}

	// save file to json
	fs.writeFileSync(STAKE_FILENAME, JSON.stringify(stakes, undefined, 4));
}

main().catch((error) => console.log(error));
