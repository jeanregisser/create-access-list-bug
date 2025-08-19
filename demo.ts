import {
  Address,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  parseUnits,
  Chain,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { base, celo } from "viem/chains";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import "dotenv/config";

// Token to send
// Amount to send in decimal
const TOKEN_SEND_AMOUNT = 0.01;

// USDC
const TOKEN_ADDRESS_BY_CHAIN: Record<number, Address> = {
  [celo.id]: "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
  [base.id]: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
};

const CHAINS_BY_NAME: Record<string, Chain> = {
  base: base,
  celo: celo,
};

const RPC_ENV_VAR_BY_CHAIN: Record<string, string> = {
  base: "BASE_RPC_URL",
  celo: "CELO_RPC_URL",
};

// Parse command line arguments with yargs
const argv = yargs(hideBin(process.argv))
  .option("chain", {
    alias: "c",
    type: "string",
    description: "Blockchain network to use",
    choices: Object.keys(CHAINS_BY_NAME),
    default: "base",
  })
  .option("rpc-url", {
    alias: "r",
    type: "string",
    description: "RPC URL to use (overrides environment variable)",
  })
  .example("$0 --chain base", "Run on Base network")
  .example("$0 --chain celo", "Run on Celo network")
  .example("$0 -c base", "Run on Base network (short alias)")
  .example(
    "$0 --chain base --rpc-url https://base.llamarpc.com",
    "Use custom RPC URL"
  )
  .example(
    "$0 -c celo -r https://forno.celo.org",
    "Use custom RPC URL with short aliases"
  )
  .help()
  .alias("help", "h")
  .version(false)
  .parseSync();

const chainName = argv.chain;
const customRpcUrl = argv["rpc-url"];

const chain = CHAINS_BY_NAME[chainName];
const tokenAddress = TOKEN_ADDRESS_BY_CHAIN[chain.id];

const MNEMONIC = process.env.MNEMONIC;
const FALLBACK_ADDRESS = "0xe30E59040385cfa09e5C61241C20f0673F314C98";

// Get RPC URL: use custom URL if provided, otherwise fall back to environment variable
let rpcUrl = customRpcUrl;
if (!rpcUrl) {
  const rpcEnvVar = RPC_ENV_VAR_BY_CHAIN[chainName];
  rpcUrl = process.env[rpcEnvVar];
}

const transport = http(rpcUrl);

// Use fallback account if no mnemonic is provided
const isUsingFallback = !MNEMONIC;
const account = MNEMONIC ? mnemonicToAccount(MNEMONIC) : null;

const accountAddress = account?.address || (FALLBACK_ADDRESS as Address);
const publicClient = createPublicClient({
  chain,
  transport,
});
const walletClient = createWalletClient({
  chain,
  transport,
});

(async () => {
  // Log startup information
  console.log(`🌐 RPC URL: ${publicClient.transport.url}`);

  if (isUsingFallback) {
    console.log(
      `⚠️  Using fallback account (read-only mode): ${accountAddress} on ${chainName}`
    );
    console.log("📝 Set MNEMONIC in .env file to enable transaction sending");
  }

  console.log(
    `Determining balances for account: ${accountAddress} on ${chainName}`
  );

  // Get balances
  const nativeBalance = await publicClient.getBalance({
    address: accountAddress,
  });
  const nativeBalanceInDecimal = formatEther(nativeBalance);
  console.log(`${nativeBalanceInDecimal} ${chain.nativeCurrency.symbol}`);

  // Get token information
  const [tokenSymbol, tokenDecimals, tokenBalance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [accountAddress],
    }),
  ]);
  const tokenBalanceInDecimal = formatUnits(tokenBalance, tokenDecimals);
  console.log(`${tokenBalanceInDecimal} ${tokenSymbol}`);

  // Check token balance - early return for insufficient balance (only when not using fallback)
  if (tokenBalance <= 0 && !isUsingFallback) {
    throw new Error(`Please add ${tokenSymbol} to your account`);
  }

  // Log transaction intent
  if (isUsingFallback) {
    console.log(
      `\n🔍 Simulating ${TOKEN_SEND_AMOUNT} ${tokenSymbol} transaction (read-only mode)...`
    );
  } else {
    console.log(
      `\n=> Sending ${TOKEN_SEND_AMOUNT} ${tokenSymbol} transaction to self...`
    );
  }

  // Simulate the transaction
  const { request } = await publicClient.simulateContract({
    account: accountAddress,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "transfer",
    // sending to self
    args: [
      accountAddress,
      parseUnits(TOKEN_SEND_AMOUNT.toString(), tokenDecimals),
    ],
  });

  console.log("Request:", request);

  // Create access list
  const result = await publicClient.createAccessList({
    account: accountAddress,
    to: request.address,
    data: encodeFunctionData({
      abi: request.abi,
      functionName: request.functionName,
      args: request.args,
    }),
    value: 0n,
  });

  console.log("Create access list result:", result);

  // Early return for fallback mode - skip transaction sending
  if (isUsingFallback) {
    console.log("🚫 Skipping transaction sending (read-only mode)");
    console.log("✅ Demo completed successfully in read-only mode");
    return;
  }

  // Ensure we have a valid account for transaction sending
  if (!account) {
    throw new Error("Account is required for transaction sending");
  }

  // Send the transaction
  const txHash = await walletClient.writeContract({
    ...request,
    account,
  });

  console.log(`Waiting for transaction receipt for ${txHash}`);
  const txReceipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log("Receipt:", txReceipt);
})();
