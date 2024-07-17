import { viem } from "hardhat";
import { getContracts } from "./contractCollection";
import { decodeErrorResult, isHex } from "viem";
import assert from "assert";

async function main() {
	const contractCollection = await getContracts();

	const errorData = process.env["data"];
	assert(errorData !== undefined && isHex(errorData));

	const result = decodeErrorResult({
		abi: contractCollection.CryptoStaking.abi,
		data: errorData,
	});

	console.log(result);
}

main().catch((err) => console.error(err));
