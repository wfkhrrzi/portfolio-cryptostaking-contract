import { viem } from "hardhat";
import { ContractCollection } from "../../test/CryptoStakingOps";

export async function getContracts() {
	return {
		CryptoStaking: await viem.getContractAt(
			"CryptoStaking",
			"0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"
		),
		USDT: await viem.getContractAt(
			"USDT",
			"0x5fbdb2315678afecb367f032d93f642f64180aa3"
		),
	} as const satisfies ContractCollection;
}
