import { network, viem } from "hardhat";
import assert from "assert";

async function main() {
	const minutes = Number(process.env["minutes"]);

	assert(
		minutes !== undefined && !isNaN(minutes) && Number.isInteger(minutes),
		"invalid minutes param"
	);

	// increase time to boost reward
	await network.provider.request({
		method: "evm_increaseTime",
		params: [minutes * 60],
	});

	// display current timestamp
	console.log(
		"current block timestamp:",
		(await (await viem.getPublicClient()).getBlock()).timestamp
	);
}

main().catch((err) => console.error(err));
