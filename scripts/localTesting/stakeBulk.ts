import { viem } from "hardhat";
import { getContracts } from "./contractCollection";
import { parseEther } from "viem";
import { CryptoStakingOps } from "../../test/CryptoStakingOps";
import assert from "assert";

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
			Math.floor(Math.random() * accounts.length)
	);

	for (let i = 0; i < num_stakers; i++) {
		const stake_amount: bigint = parseEther(
			(Math.random() * 0.02).toFixed(5),
			"gwei"
		);

		await CryptoStakingOps.stakeUSDT(
			contractCollection,
			accounts[i],
			stake_amount
		);
	}

	console.log(`${num_stakers} stakers staked in CryptoStaking contract!`);
	console.log(`beforeBlockNumber: ${beforeBlockNumber}`);
	console.log(`afterBlockNumber: ${await client.getBlockNumber()}`);
}

main().catch((error) => console.log(error));
