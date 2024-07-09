# Installation & Setup

1.  Clone the repo.

    ```sh
    $ git clone https://github.com/wfkhrrzi/contract-template-v1.git
    ```

2.  Install required dependencies.

    ```sh
    $ npm install
    ```

3.  Create `.env` from the `.env.example` template.

    ```sh
     $ cp .env.example .env
    ```

4.  Populate the `.env` file with the preferred configuration.

    ```sh
    PUBLIC_KEY=<INSERT YOUR WALET PUBLIC KEY>
    PRIVATE_KEY=<INSERT YOUR WALET PRIVATE KEY>
    ```

5.  Test the contracts.

    ```sh
    $ npx hardhat test
    ```

# Deployment

1.  Finalize the deployment [script](scripts/deployContract/deployScript.ts) & [configuration](.env).

    ```sh
    # .env

    DEPLOY_NETWORK=bsc_testnet # modify the chain used for deployment here
    ```

    ```ts
    export async function deployContracts(deployToChain = false) {
    	// ...

    	// script for deploying USDT contract in the local deployment only (testing)
    	// For testnet deployment, this script uses the existing USDT token contract (0x281164a08efe10445772B26D2154fd6F4b90Fc08)
    	const USDTContract = deployToChain
    		? await viem.getContractAt(
    				"USDT",
    				"0x281164a08efe10445772B26D2154fd6F4b90Fc08" // You can modify the USDT contract address here
    		  )
    		: await viem.getContractAt(
    				"USDT",
    				(await (
    					await func_deploy("USDT")
    				).getAddress()) as `0x${string}`
    		  );
    	ABIs.push(USDTContract.abi);

    	// script for deploying staking contract
    	const CryptoStakingContract = await viem.getContractAt(
    		"CryptoStaking",
    		(await (
    			await func_deploy("CryptoStaking", [
    				USDTContract.address,
    				backendSignerAddress,
    			])
    		).getAddress()) as `0x${string}`
    	);
    	ABIs.push(CryptoStakingContract.abi);

    	// ...
    }
    ```

2.  Deploy the contract

    ```sh
    $ npm run deploy
    ```
