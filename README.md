# `eth_createAccessList` RPC Implementation Issues

This repository demonstrates implementation issues with the `eth_createAccessList` RPC method across different blockchain networks and RPC providers.

## 🐛 Issue Summary

The `eth_createAccessList` RPC method has inconsistent implementation across blockchain networks and RPC providers:

- **Base Network**: Works on Alchemy, fails on public RPC
- **Celo Network**: Fails across all tested providers (Forno, Alchemy, QuickNode)

This prevents applications from reliably using EIP-2930 access lists for gas optimization.

### Expected Behavior

The `eth_createAccessList` method should consistently return an access list containing contract addresses and storage keys that will be accessed during transaction execution across all EVM-compatible networks and RPC providers.

### Actual Behavior

Implementation varies significantly by provider:

- **Alchemy (Base)**: ✅ Works correctly
- **Public RPC (Base)**: ❌ Implementation issues
- **Celo providers**: ❌ Various implementation issues (not whitelisted, crashes, gas estimation errors)

## 🧪 Reproduction

This repository contains a TypeScript demo that tests `eth_createAccessList` implementation across different networks and RPC providers using a simple ERC-20 token transfer transaction.

### Setup

```bash
# Install dependencies
yarn install

# Copy environment file
cp .env.example .env
# Edit .env with your RPC URLs and mnemonic (optional)
```

### Running the Demo

#### ✅ Working Example - Base Network (Alchemy RPC)

```bash
yarn demo:base
```

**Result**: Successfully creates access list and executes transaction

```json
{
  "accessList": [
    {
      "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "storageKeys": ["0x..."]
    },
    {
      "address": "0x2ce6311ddae708829bc0784c967b7d77d19fd779",
      "storageKeys": []
    }
  ],
  "gasUsed": "39347"
}
```

#### ❌ Failing Examples

**Celo Network (any RPC):**

```bash
yarn demo:celo
```

Result: Various failures depending on provider (see RPC Provider Testing Results below)

**Base Network (Public RPC):**
Using `--rpc-url https://mainnet.base.org` also fails with implementation issues.

## 📋 Technical Details

### Transaction Details

- **Method**: ERC-20 `transfer(address,uint256)`
- **Token on Base**: USDC (`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`)
- **Token on Celo**: USDC (`0xceba9300f2b948710d2653dd7b07f33a8b32118c`)
- **Amount**: 0.01 tokens
- **Target**: Self-transfer (same address for from/to)

### RPC Request

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

### Environment

- **Viem Version**: 2.34.0
- **Node.js**: Latest LTS
- **Networks Tested**:
  - ✅ Base Mainnet (Working) - Alchemy RPC
  - ❌ Base Mainnet (Failed) - Default public RPC (`https://mainnet.base.org`)
  - ❌ Celo Mainnet (Multiple Failures) - See RPC Provider Results below

## 🔄 Network Comparison

| Feature                | Base Network          | Celo Network         |
| ---------------------- | --------------------- | -------------------- |
| `eth_createAccessList` | ✅ Works (Alchemy)    | ❌ Multiple Failures |
|                        | ❌ Fails (Public RPC) |                      |
| Transaction Simulation | ✅ Works              | ✅ Works             |
| Contract Calls         | ✅ Works              | ✅ Works             |
| Regular Transactions   | ✅ Works              | ✅ Works             |

## 🌐 RPC Provider Testing Results

### Base Network Results

#### ✅ Alchemy

Successfully implements `eth_createAccessList` with proper access list generation and gas estimation.

#### ❌ Default Public RPC (`https://mainnet.base.org`)

The `eth_createAccessList` method also fails on Base's default public RPC endpoint, indicating this is a broader RPC implementation issue beyond just Celo.

### Celo Network Results

The `eth_createAccessList` method was tested across all major Celo RPC providers with the following results:

### ❌ Forno (Official Celo RPC)

```json
{
  "code": -32601,
  "message": "rpc method is not whitelisted"
}
```

**Issue**: The `eth_createAccessList` method is not whitelisted/enabled on the official Celo RPC endpoint.

### ❌ Alchemy

```
CallExecutionError: An internal error was received.
Details: method handler crashed
```

**Issue**: Internal server error crashes the RPC handler when processing the request.

### ❌ QuickNode

```
failed to apply transaction: 0x2e748daa922f53a7be1ec66ba73d0de8af1ed2335bb123384c3a7a34ba2cce8e
err: insufficient funds for gas * price + value:
address 0xe30E59040385cfa09e5C61241C20f0673F314C98 have 99063787553000000 want 30000600000000000000
```

**Issue**: Incorrect gas estimation (requesting 30 ETH worth of gas for a simple token transfer).

## 📊 Summary of Issues

The `eth_createAccessList` method has implementation issues across multiple networks and providers:

### Base Network

- **Alchemy**: ✅ Working correctly
- **Public RPC** (`https://mainnet.base.org`): ❌ Implementation issues

### Celo Network

1. **Forno**: Method not implemented/whitelisted
2. **Alchemy**: Server crashes with internal error
3. **QuickNode**: Gas estimation issues

### Common Patterns

- **Gas estimation issues**: Both QuickNode (Celo) and Base Public RPC show similar unrealistic gas requirement errors
- **Provider variance**: Implementation quality varies significantly across providers
- **Limited support**: Only some providers (like Alchemy on Base) properly support the method

## 🛠️ Workaround

Applications that rely on `eth_createAccessList` for gas optimization must implement provider-specific logic:

- **Base Network**: Use Alchemy RPC for reliable access list support
- **Celo Network**: Tested providers have implementation issues; proceed without access list optimization
- **General**: Implement fallback logic for when `eth_createAccessList` fails

## 📋 Observed Issues by Provider

### Forno (Official Celo RPC)

- Method returns "rpc method is not whitelisted" error
- EIP-2930 access list functionality not available

### Alchemy (Celo)

- Server crashes with internal error when processing requests
- RPC handler encounters unhandled exceptions

### QuickNode (Celo)

- Gas estimation appears incorrect (estimates 30 ETH for simple transfers)
- Access list creation fails due to gas calculation issues

### Base Public RPC (`https://mainnet.base.org`)

- Gas estimation appears incorrect (similar to QuickNode issue)
- Returns insufficient funds error with unrealistic gas requirements

```
failed to apply transaction: 0xd59f861eb82c5fc5c08495a8b7ca5f44e181d4e12bc253d6dff40de1c3e9243b
err: insufficient funds for gas * price + value:
address 0xe30E59040385cfa09e5C61241C20f0673F314C98 have 99568782918001 want 3000355200000000
```

## 🔗 Related Information

- **EIP-2930**: Optional access lists
- **Viem Documentation**: [createAccessList](https://viem.sh/docs/actions/public/createAccessList.html)
- **Ethereum RPC Specification**: [eth_createAccessList](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_createaccesslist)

## 🧰 Repository Structure

```
├── demo.ts           # Main reproduction script
├── package.json      # Dependencies and scripts
├── .env.example      # Environment variables template
└── README.md         # This documentation
```

## 🚀 Scripts

- `yarn demo:base` - Run demo on Base network (working)
- `yarn demo:celo` - Run demo on Celo network (failing)
- `yarn demo:help` - Show available options

## 📊 Impact Assessment

This issue affects multiple blockchain ecosystems:

- EIP-2930 access lists are inconsistently implemented across RPC providers
- Applications expecting standard Ethereum RPC behavior may encounter compatibility issues
- Gas optimization strategies using access lists have limited provider support
- Developer tooling that relies on `eth_createAccessList` must account for provider-specific implementations
- Different networks have varying levels of provider support for the method

## 📞 Contact

This repository documents implementation issues with `eth_createAccessList` across different RPC providers. The findings may be relevant to:

- cLabs team (Forno implementation)
- Alchemy (server stability)
- QuickNode (gas estimation)
- Celo Foundation (ecosystem overview)
- Application developers using EIP-2930 access lists
