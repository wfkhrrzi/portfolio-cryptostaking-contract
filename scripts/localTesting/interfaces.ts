import { Address, Hex } from "viem";

export type StakeInfo = {
	wallet_address: Address;
	stake_amount: string;
	txHash: Hex;
};

export const STAKE_FILENAME = `${__dirname}/stakeBulk.json`;
