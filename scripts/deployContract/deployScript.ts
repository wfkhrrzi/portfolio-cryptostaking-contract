import { viem } from "hardhat";
import DeployContract from "./DeployContract";
import { Abi } from "viem";
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
export async function deployContracts(deployToChain=false) {
	const ABIs: Abi[] = []
	
	const config = new Config()
	const ContractDeployment = new DeployContract(config)

	let func_deploy: typeof DeployContract.deployLocal | typeof ContractDeployment.deployToChain;
	if (deployToChain) {
		func_deploy = ContractDeployment.deployToChain.bind(ContractDeployment)
	} else {
		func_deploy = DeployContract.deployLocal.bind(DeployContract)
	}

	// deploy REdacted contracts
	const Lock = await viem.getContractAt(
		"Lock",
		(await (
			await func_deploy('Lock')
		).getAddress()) as `0x${string}`
	);
	ABIs.push(Lock.abi)
	

	return { Lock, ABIs : ABIs.reduce((prev, cur)=>[...prev, ...cur])};
}
