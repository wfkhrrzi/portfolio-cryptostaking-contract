import fs from "fs";
import { STAKE_FILENAME } from "./interfaces";

async function main() {
	if (fs.existsSync(STAKE_FILENAME)) {
		fs.unlinkSync(STAKE_FILENAME);
		console.log("stakeBulk.json file deleted successfuly.");
	}
}

main().catch((error) => console.log(error));
