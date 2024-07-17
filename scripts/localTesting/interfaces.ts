import { Address, Hex } from "viem";

export type StakeInfo = {
	wallet_address: Address;
	initial_principal: string;
	current_principal: string;
	claimable_reward: string;
	txHash: Hex;
	time_stake: number;
};

export const STAKE_FILENAME = `${__dirname}/stakeBulk.json`;
