import * as fs from "node:fs";
import { Address } from "viem";
import { network } from "hardhat";
import { ArtifactsMap } from "hardhat/types";

type ContractName<StringT extends string> = StringT extends keyof ArtifactsMap
	? StringT
	: never;

interface ConfigFile {
	contracts: { [key: string]: Address };
	[key: `v${number}`]: {
		[key: string]: Address;
	};
}

export class Config {
	private configFilePath: string;

	constructor(configFilePath?: string) {
		if (configFilePath == undefined) {
			configFilePath = Config.getNetworkFilePath();
		}

		this.configFilePath = configFilePath;
	}

	private static getNetworkFilePath() {
		const networkName = network.name;

		if (networkName == "hardhat") return "";

		const configFilePath = process.env[
			`${networkName.toUpperCase()}_CONFIG_FILE_PATH`
		] as string | undefined;

		if (configFilePath == undefined) {
			throw new Error(
				`Config file path for network "${networkName}" is not configured in .env file!\nPlease add "${networkName.toUpperCase()}_CONFIG_FILE_PATH=<path>" in .env file`
			);
		}

		return configFilePath;
	}

	// Function to read the config file
	private static _readConfig(configFilePath: string): ConfigFile {
		try {
			const data = fs.readFileSync(
				`${__dirname}/${configFilePath}`,
				"utf8"
			);
			return JSON.parse(data) as ConfigFile;
		} catch (error) {
			console.error(
				`Error reading config file: ${
					(error as unknown as Error).message
				}`
			);

			console.log("\nCreating an empty config file");
			return Config.createEmptyConfigFile(configFilePath);
		}
	}

	static readConfig() {
		return Config._readConfig(Config.getNetworkFilePath());
	}

	readConfig() {
		return Config._readConfig(this.configFilePath);
	}

	// Function to write the config file
	private static _writeConfig(
		config: ConfigFile,
		configFilePath: string
	): void {
		try {
			fs.writeFileSync(
				`${__dirname}/${configFilePath}`,
				JSON.stringify(config, null, 4),
				"utf8"
			);
			console.log("Config file updated.");
		} catch (error) {
			throw Error(
				`Error writing config file: ${
					(error as unknown as Error).message
				}`
			);
		}
	}

	static writeConfig(config: ConfigFile) {
		Config._writeConfig(config, Config.getNetworkFilePath());
	}

	writeConfig(config: ConfigFile) {
		Config._writeConfig(config, this.configFilePath);
	}

	private static createEmptyConfigFile(configFilePath: string): ConfigFile {
		const config = {
			contracts: {},
		} as ConfigFile;

		fs.writeFileSync(
			`${__dirname}/${configFilePath}`,
			JSON.stringify(config, null, 4),
			"utf8"
		);

		console.log(`Successfully created ${configFilePath} config file.\n`);

		return config;
	}

	static getContractAddress<CN extends string>(
		contractName: ContractName<CN>
	): Address {
		return Config.readConfig()["contracts"][contractName];
	}
}
