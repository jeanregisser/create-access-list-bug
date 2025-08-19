# `eth_createAccessList` RPC Implementation Issues

This repository demonstrates implementation inconsistencies with the `eth_createAccessList` RPC method across different blockchain networks and RPC providers.

## Overview

The `eth_createAccessList` method shows inconsistent behavior across different RPC providers and networks when tested with a simple USDC transfer transaction.

### Test Results

| Network | Provider         | Status | Issue                                     |
| ------- | ---------------- | ------ | ----------------------------------------- |
| Base    | Alchemy          | ✅     | Works as expected                         |
| Base    | Public RPC       | ❌     | Incorrect gas estimation                  |
| Celo    | Forno (Official) | ❌     | Method not whitelisted                    |
| Celo    | Alchemy          | ❌     | Server crashes                            |
| Celo    | QuickNode        | ❌     | Estimates 30 ETH gas for simple transfers |

## Reproduction

### Setup

```bash
yarn install
cp .env.example .env  # Optional: add your RPC URLs
```

### Running Tests

```bash
yarn demo:base  # Test on Base network
yarn demo:celo  # Test on Celo network
```

### Expected Results

- **Base + Alchemy**: Returns access list with contract addresses and storage keys
- **Other combinations**: Various error responses as documented below

## Technical Details

The test performs a simple USDC transfer (0.01 USDC self-transfer) using the `eth_createAccessList` RPC method.

**Test Transaction**: ERC-20 `transfer()` on USDC contracts:

- Base: `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`
- Celo: `0xceba9300f2b948710d2653dd7b07f33a8b32118c`

<details>
<summary>View Raw RPC Request</summary>

```json
{
  "method": "eth_createAccessList",
  "params": [
    {
      "data": "0xa9059cbb000000000000000000000000e30e59040385cfa09e5c61241c20f0673f314c980000000000000000000000000000000000000000000000000000000000002710",
      "from": "0xe30E59040385cfa09e5C61241C20f0673F314C98",
      "to": "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
      "value": "0x0"
    },
    "latest"
  ]
}
```

</details>

## Error Details

### Celo Network

<details>
<summary><strong>Forno (Official Celo RPC)</strong></summary>

```json
{
  "code": -32601,
  "message": "rpc method is not whitelisted"
}
```

</details>

<details>
<summary><strong>Alchemy Celo</strong></summary>

```
CallExecutionError: An internal error was received.
Details: method handler crashed
```

</details>

<details>
<summary><strong>QuickNode Celo</strong></summary>

```
err: insufficient funds for gas * price + value:
address 0xe30E59040385cfa09e5C61241C20f0673F314C98 have 99063787553000000 want 30000600000000000000
```

Gas estimation: ~30 ETH for a simple USDC transfer (account balance: ~0.1 ETH).

</details>

### Base Network

<details>
<summary><strong>Base Public RPC</strong></summary>

Similar gas estimation issues as seen with QuickNode on Celo.

</details>

## Observations

The test results show that `eth_createAccessList` implementation varies significantly across providers:

1. **Network vs Provider**: The same network shows different results depending on the RPC provider
2. **Error Types**: Failures range from method not being available to server crashes to incorrect gas calculations
3. **Consistency**: Only Base with Alchemy shows consistent, expected behavior

### Example Fallback Pattern

```typescript
try {
  const accessList = await publicClient.createAccessList(txParams);
  // Use optimized transaction with access list
} catch (error) {
  // Fallback: send transaction without access list
  console.warn("Access list creation failed, proceeding without optimization");
}
```

## Available Scripts

```bash
yarn demo:base    # Test on Base network
yarn demo:celo    # Test on Celo network
yarn demo:help    # View all options
```

## References

- **[EIP-2930](https://eips.ethereum.org/EIPS/eip-2930)**: Optional access lists specification
- **[Viem docs](https://viem.sh/docs/actions/public/createAccessList.html)**: createAccessList implementation
- **[Ethereum RPC spec](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_createaccesslist)**: Official method documentation
