import { WithdrawUSDTOps } from "../../test/CryptoStakingOps";
import { withdrawalOps } from "./withdrawalOps";

withdrawalOps(WithdrawUSDTOps.UNSTAKE).catch((err) => console.error(err));
