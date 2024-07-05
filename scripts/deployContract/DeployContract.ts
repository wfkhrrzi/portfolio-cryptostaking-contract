import { ethers, upgrades, network, run } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { Contract } from "ethers";
import { Config } from "../config/config";
import { ArtifactsMap, EthereumProvider, HttpNetworkConfig } from "hardhat/types";
import { Address } from "viem";

type ContractName<StringT extends string> = StringT extends keyof ArtifactsMap ? StringT : never;

export default class DeployContract {
	private config: Config;

	constructor(config?: Config) {
		if (config) this.config = config;
		else this.config = new Config()
	}

	private static async deployNormalContract(contractName: string, params: any[]|undefined=[]) {
		const contractFactory = await ethers.getContractFactory(
			contractName
		);

		const contract = await contractFactory.deploy(params)

		await contract.waitForDeployment()

		return contract
	}

	private static async deployProxyContract(contractName: string, params: any[]|undefined=undefined, initializer_name = "initialize") {
		const contractFactory = await ethers.getContractFactory(
			contractName
		);

		const contract = await upgrades.deployProxy(
			contractFactory, 
			params, 
			{
				initializer: initializer_name,
			}
		);

		await contract.waitForDeployment();

		return contract
	}

	static async upgradeContract(contractName: string, config: Config, params: any[]|undefined=undefined, initializer_name = "initialize") {
		const contractFactory = await ethers.getContractFactory(
			contractName
		);

		// set up options
		let options: 
			{
				fn: string;
				args?: unknown[] | undefined;
			} 
			| undefined

		if (initializer_name != undefined && initializer_name != 'initialize') {
			options = {
				fn: initializer_name
			}
		}

		if (params != undefined) {
			if (options) {
				options = {...options, args: params}
			} else {
				throw Error('args != undefined BUT fn == undefined');
			}
		} 
		
		const implContract = await upgrades.upgradeProxy((config.readConfig())['contracts'][contractName], contractFactory, 
			options ? {call:options} : undefined
		)

		await implContract.waitForDeployment();

		return implContract
	}

	private static async isUpgradeable(contractName:string) {
		const contractFactory = await ethers.getContractFactory(
			contractName
		)

		const resp = contractFactory.interface.hasEvent('Initialized')

		return resp
	}

	static async deployLocal<CN extends string>(contractName: ContractName<CN>, params: any[]|undefined=undefined, initializer_name = "initialize") {
		if(await DeployContract.isUpgradeable(contractName)) 
			return await DeployContract.deployProxyContract(contractName, params, initializer_name)
		else 
			return await DeployContract.deployNormalContract(contractName,params)
	}

	async deployToChain<CN extends string>(
		contractName: ContractName<CN>,
		params: any[] | undefined = undefined,
		impl_version: number = 1,
		initializer_name = "initialize",
	): Promise<Contract> {
		let config = this.config.readConfig();

		// deploy/upgrade contract
		let contract: Contract;

		if (
			(!(await DeployContract.isUpgradeable(contractName)) && config["contracts"][contractName]) || 
			(config["contracts"][contractName] && config[`v${impl_version}`] && config[`v${impl_version}`][contractName])
		) {
			contract = await ethers.getContractAt(
				contractName,
				config["contracts"][contractName]
			);  
			console.log(
				`Proxy contract for ${contractName} already deployed at ${await contract.getAddress()}!`
			);

			return contract;
		} 

		// upgrade contract
		else if (config['contracts'][contractName]) {
			if (await DeployContract.isUpgradeable(contractName))
				contract = await DeployContract.upgradeContract(contractName,this.config,params,initializer_name,)
			else 
				contract = await DeployContract.deployNormalContract(contractName,params) as Contract

			config["contracts"][contractName] = await contract.getAddress() as Address;
		}

		// deploy contract
		else {
			if (await DeployContract.isUpgradeable(contractName))
				contract = await DeployContract.deployProxyContract(contractName,params,initializer_name)
			else 
				contract = await DeployContract.deployNormalContract(contractName,params) as Contract

			config["contracts"][contractName] = await contract.getAddress() as Address;
		}

		this.config.writeConfig(config);

		try {
			if (await DeployContract.isUpgradeable(contractName)) {
				
				// get implementation contract
				const provider = ethers.getDefaultProvider(
					(network.config as HttpNetworkConfig).url
				) as unknown as EthereumProvider;
				const impl_contract_address = await getImplementationAddress(
					provider,
					config["contracts"][contractName]
				);
	
				// add implm_contract to config if not available
				if (!config[`v${impl_version}`]) {
					// create the first entry for the specific version if not existed yet
					config[`v${impl_version}`] = {};
				}
				if (!config[`v${impl_version}`][contractName]) {
					config[`v${impl_version}`][contractName] =
						impl_contract_address as Address;
				}
	
				console.log(
					`Implementation contract for ${contractName} deployed at ${impl_contract_address}`
				);
	
				this.config.writeConfig(config);
	
				// verify the implm_contract
				await run("verify:verify", {
					address: impl_contract_address,
				});

			}

			// verify the proxy contract
			await run("verify:verify", {
				address: await contract.getAddress(),
			});
		} catch (error) {
			console.log(error);
		}

		console.log(
			`Contract ${contractName} deployed to ${await contract.getAddress()}\n`
		);

		return contract;
	}

}
