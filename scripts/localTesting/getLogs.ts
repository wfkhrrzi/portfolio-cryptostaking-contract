import { viem } from "hardhat";
import { getContracts } from "./contractCollection";

async function main() {
	const client = await viem.getPublicClient();

	const contractCollection = await getContracts();

	console.log(
		await client.getContractEvents({
			abi: contractCollection.CryptoStaking.abi,
			fromBlock: 44n,
			toBlock: 59n,
		})
	);
}

main().catch((error) => console.log(error));
