import { viem } from "hardhat";
import DeployContract from "./DeployContract";
import { Abi, Address, zeroAddress } from "viem";
import { Config } from "../config/config";

const { PUBLIC_KEY, BACKEND_WALLET } = process.env;

/**
 * Util function to deploy test contracts to testnet configured in {@link Config} & `DEPLOY_NETWORK` in {@link .env}
 * @param deployToChain Pass `true` to deploy test contracts to testnet
 * 
 * @example
 * // to deploy contract
 * const REdactedNFTContract = await viem.getContractAt(
 * 	"NFT",
 * 	(await (
 * 		await func_deploy("NFT")
 * 	).getAddress()) as `0x${string}`
 *	);
	ABIs.push(REdactedNFTContract.abi)
 */
export async function deployContracts(deployToChain = false) {
	const ABIs: Abi[] = [];

	const config = new Config();
	const ContractDeployment = new DeployContract(config);

	let func_deploy:
		| typeof DeployContract.deployLocal
		| typeof ContractDeployment.deployToChain;
	if (deployToChain) {
		func_deploy = ContractDeployment.deployToChain.bind(ContractDeployment);
	} else {
		func_deploy = DeployContract.deployLocal.bind(DeployContract);
	}

	const backendSignerAddress: Address = deployToChain
		? (BACKEND_WALLET as Address)
		: (await viem.getWalletClients())[1].account.address;

	// deploy USDT contracts
	const USDTContract = deployToChain
		? await viem.getContractAt(
				"USDT",
				"0x281164a08efe10445772B26D2154fd6F4b90Fc08"
		  )
		: await viem.getContractAt(
				"USDT",
				(await (
					await func_deploy("USDT")
				).getAddress()) as `0x${string}`
		  );
	ABIs.push(USDTContract.abi);

	// deploy CryptoStaking contracts
	const CryptoStakingContract = await viem.getContractAt(
		"CryptoStaking",
		(await (
			await func_deploy("CryptoStaking", [
				USDTContract.address,
				backendSignerAddress,
			])
		).getAddress()) as `0x${string}`
	);
	ABIs.push(CryptoStakingContract.abi);

	return {
		CryptoStakingContract,
		USDTContract,
		ABIs: ABIs.reduce((prev, cur) => [...prev, ...cur]),
	};
}
