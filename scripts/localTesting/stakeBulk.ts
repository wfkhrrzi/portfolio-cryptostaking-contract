import { viem } from "hardhat";
import { getContracts } from "./contractCollection";
import { Address, parseEther } from "viem";
import { CryptoStakingOps } from "../../test/CryptoStakingOps";
import assert from "assert";
import fs from "fs";
import { STAKE_FILENAME, StakeInfo } from "./interfaces";

async function main() {
	const client = await viem.getPublicClient();
	const beforeBlockNumber = await client.getBlockNumber();

	const accounts = (await viem.getWalletClients()).slice(1);

	const contractCollection = await getContracts();

	assert(
		(await contractCollection.CryptoStaking.read.usdt()).toLowerCase() ===
			contractCollection.USDT.address.toLowerCase()
	);

	const num_stakers: number = Number(
		process.env["num_stakers"] ||
			Math.floor(Math.random() * accounts.length + 1)
	);

	// load stakes from json
	let stakes: StakeInfo[] = [];

	if (fs.existsSync(STAKE_FILENAME))
		stakes = JSON.parse(fs.readFileSync(STAKE_FILENAME, "utf-8"));

	// perform stake operation
	for (let i = 0; i < num_stakers; i++) {
		const stake_amount: bigint = parseEther(
			(Math.random() * 0.02).toFixed(5),
			"gwei"
		);

		const { txHash } = await CryptoStakingOps.stakeUSDT(
			contractCollection,
			accounts[i],
			stake_amount
		);

		// push stake
		stakes.push({
			current_principal: stake_amount.toString(),
			initial_principal: stake_amount.toString(),
			wallet_address: accounts[i].account.address,
			txHash,
			time_stake: Number(
				(
					await client.getBlock({
						blockHash: (
							await client.getTransactionReceipt({ hash: txHash })
						).blockHash,
					})
				).timestamp
			),
			claimable_reward: 0n.toString(),
		});
	}

	// save stakers
	fs.writeFileSync(STAKE_FILENAME, JSON.stringify(stakes, undefined, 4));

	console.log(`${num_stakers} stakers staked in CryptoStaking contract!`);
	console.log(`beforeBlockNumber: ${beforeBlockNumber}`);
	console.log(`afterBlockNumber: ${await client.getBlockNumber()}`);
}

main().catch((error) => console.log(error));
