import { WithdrawUSDTOps } from "../../test/CryptoStakingOps";
import { withdrawalOps } from "./withdrawalOps";

async function main() {
	await withdrawalOps(WithdrawUSDTOps.CLAIM_REWARD).catch((err) =>
		console.error(err)
	);
}

main().catch((err) => console.error(err));
