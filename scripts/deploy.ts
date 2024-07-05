import { deployContracts } from "./deployContract/deployScript";

async function main() {
	await deployContracts(true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
