import { network, viem } from "hardhat";
import { parseEther } from "viem";
import { getContracts } from "./contractCollection";

async function main() {
	const amount = parseEther("100", "gwei");

	const contractCollection = await getContracts();

	// mint / approve usdt
	(await viem.getWalletClients()).map(async (wallet) => {
		// mint
		await contractCollection.USDT.write.mint([
			wallet.account.address,
			amount,
		]);
		// approve
		await contractCollection.USDT.write.approve(
			[contractCollection.CryptoStaking.address, amount],
			{ account: wallet.account }
		);
	});

	// mint usdt to contract
	await contractCollection.USDT.write.mint([
		contractCollection.CryptoStaking.address,
		parseEther("100", "gwei"),
	]);

	// check contract USDT balance
	console.log(
		"contract's usdt balance:",
		await contractCollection.USDT.read.balanceOf([
			contractCollection.CryptoStaking.address,
		])
	);

	// start interval mining
	await network.provider.send("evm_setIntervalMining", [3000]);

	// ensure correct backend signer
	console.log(
		"backend signer:",
		await contractCollection.CryptoStaking.read.backendSigner()
	);
}

main().catch((error) => console.log(error));
