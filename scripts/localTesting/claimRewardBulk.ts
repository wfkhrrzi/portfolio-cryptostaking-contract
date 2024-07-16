import { WithdrawUSDTOps } from "../../test/CryptoStakingOps";
import { withdrawalOps } from "./withdrawalOps";

withdrawalOps(WithdrawUSDTOps.CLAIM_REWARD).catch((err) => console.error(err));
