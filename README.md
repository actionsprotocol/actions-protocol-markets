[![Twitter Follow](https://img.shields.io/twitter/follow/useactions?style=social)](https://x.com/useactions)
[![License](https://img.shields.io/github/license/actionsprotocol/actions-protocol-markets)](LICENSE)
[![Issues](https://img.shields.io/github/issues/actionsprotocol/actions-protocol-markets)](https://github.com/actionsprotocol/actions-protocol-markets/issues)

# Action Protocol Markets SDK

A TypeScript SDK for interacting with Action Protocol Markets on Solana. Built with pure `@solana/web3.js` - no Anchor dependency required.

## Features

- **Launch Your Own Platform** - Create and manage your own prediction markets platform
- **Create Markets** - Launch new prediction markets with custom parameters
- **Make Predictions** - Place bets on market outcomes (YES/NO)
- **Resolve Markets** - Finalize markets with winning outcomes
- **Claim Winnings** - Collect rewards from winning predictions
- **Claim Creator Fees** - Market creators can claim their earned fees
- **Platform Management** - Initialize and update custom platforms with your own fees
- **Market State Management** - Platform authorities can update market states

## Installation

```bash
npm install @useactions/action-protocol-markets
# or
yarn add @useactions/action-protocol-markets
```

## Quick Start - Launch a Market on Actions.fun

```typescript
import { ActionsSDK, Connection, Keypair } from '@useactions/action-protocol-markets';

// Initialize SDK with actions.fun platform
const connection = new Connection('https://api.devnet.solana.com');
const sdk = new ActionsSDK(connection); // Uses actions.fun platform by default

// Create your market creator keypair (fund with devnet SOL)
const creatorKeypair = Keypair.generate();

// Upload metadata to IPFS first (e.g., using Pinata)
// Example metadata JSON structure:
// {
//   "name": "Bitcoin $100k Prediction",
//   "description": "Will resolve to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD by December 31, 2024, 11:59 PM UTC. Data will be validated using CoinGecko API price feeds. Market will resolve to NO if the target price is not reached by the deadline.",
//   "image": "https://your-image-url.com/bitcoin-chart.png",
//   "external_url": "https://your-website.com/market/bitcoin-100k",
//   "attributes": [
//     { "trait_type": "Category", "value": "Cryptocurrency" },
//     { "trait_type": "Asset", "value": "Bitcoin" },
//     { "trait_type": "Target Price", "value": "$100,000" }
//   ]
// }
// Upload to Pinata: https://app.pinata.cloud/pinmanager
// Get IPFS URI: https://gateway.mypinata.cloud/ipfs/YOUR_CID
const metadataUri = 'https://gateway.mypinata.cloud/ipfs/QmYourCidHere';

// Create a market on actions.fun
const marketResult = await sdk.createMarketWithDefaults(
  creatorKeypair,
  'Will Bitcoin reach $100k by end of 2024?',
  'Will resolve to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD by December 31, 2024, 11:59 PM UTC. Data will be validated using CoinGecko API price feeds.',
  metadataUri,
  60 // 60 minutes duration
);

// Send transaction to create the market
const signature = await connection.sendTransaction(
  marketResult.transaction, 
  [creatorKeypair]
);
await connection.confirmTransaction(signature);

console.log('Market created on actions.fun!');
console.log('Market Address:', marketResult.marketAddress);
console.log('View on Explorer:', `https://explorer.solana.com/address/${marketResult.marketAddress}?cluster=devnet`);
```

## Launch Your Own Platform

Want to create your own prediction markets platform? The SDK makes it easy:

```typescript
import { ActionsSDK, Connection, Keypair, PublicKey } from '@useactions/action-protocol-markets';

// Initialize SDK
const connection = new Connection('https://api.devnet.solana.com');
const sdk = new ActionsSDK(connection);

// Generate a unique platform ID
const platformKeypair = Keypair.generate();
const platformId = platformKeypair.publicKey;

// Create your platform
const platformResult = await sdk.initPlatform({
  platformId: platformId,
  feePercentage: 500,        // 5% platform fee
  creatorFeePercentage: 200, // 2% creator fee
  treasury: yourTreasuryAddress,
  authorityKeypair: yourAuthorityKeypair
});

// Send the transaction
const signature = await connection.sendTransaction(
  platformResult.transaction,
  [yourAuthorityKeypair]
);

console.log('Platform created:', platformId.toString());

// Now create markets on YOUR platform
const customSDK = new ActionsSDK(connection, platformId);
const marketResult = await customSDK.createMarketWithDefaults(
  creatorKeypair,
  'Your First Market',
  'This market runs on your platform!',
  'metadata_uri',
  60
);
```

### Platform Benefits
- **Custom Fees**: Set your own platform and creator fee percentages
- **Revenue Stream**: Earn fees from all markets created on your platform
- **Full Control**: Manage market states and platform settings
- **Branding**: Markets created on your platform are associated with your platform ID

## Core Concepts

### Markets
- **Time-based**: Markets use Unix timestamps for expiry and finalization
- **Binary outcomes**: Each market has YES/NO options
- **Creator fees**: Market creators earn fees from trading activity
- **Platform fees**: Actions platform collects protocol fees

### Predictions
- **Betting**: Users can bet SOL on YES or NO outcomes
- **Multiple bets**: Users can place multiple bets on the same option
- **Fee structure**: Fees are deducted from bet amounts

### Resolution
- **Manual resolution**: Market creators or authorities can resolve markets
- **Auto-cancellation**: Markets auto-cancel if not resolved within deadline
- **Winnings**: Winners receive proportional share of the prize pool

## API Reference

### ActionsSDK

#### Constructor
```typescript
new ActionsSDK(connection: Connection, platformId?: PublicKey)
```

#### Methods

##### createMarket(params: CreateMarketParams)
Create a new prediction market.

```typescript
const result = await sdk.createMarket({
  marketName: 'Will it rain tomorrow?',
  marketDescription: 'Resolves YES if it rains in NYC',
  metadataUri: 'ipfs://...',
  expiryTime: 1234567890, // Unix timestamp
  finalizationDeadline: 1234567890 + 3600, // 1 hour after expiry
  creatorKeypair: keypair
});
```

##### makePrediction(params: MakePredictionParams)
Place a bet on a market outcome.

```typescript
const result = await sdk.makePrediction({
  marketAddress: 'market_address_here',
  option: true, // true = YES, false = NO
  amount: 100_000_000, // 0.1 SOL in lamports
  participantKeypair: keypair
});
```

##### finishMarket(params: FinishMarketParams)
Resolve a market with the winning outcome.

```typescript
const result = await sdk.finishMarket({
  marketAddress: 'market_address_here',
  winningOption: true, // true = YES wins, false = NO wins
  authorityKeypair: keypair
});
```

##### claimWinnings(params: ClaimWinningsParams)
Claim winnings from a resolved market.

```typescript
const result = await sdk.claimWinnings({
  marketAddress: 'market_address_here',
  participantKeypair: keypair
});
```

##### claimCreatorFees(params: ClaimCreatorFeesParams)
Claim creator fees from a market.

```typescript
const result = await sdk.claimCreatorFees({
  marketAddress: 'market_address_here',
  creatorKeypair: keypair
});
```

##### initPlatform(params: InitPlatformParams)
Initialize a new platform for creating markets.

```typescript
const result = await sdk.initPlatform({
  platformId: new PublicKey('your_platform_id'),
  feePercentage: 500, // 5% in basis points
  creatorFeePercentage: 200, // 2% in basis points
  treasury: treasuryPublicKey,
  authorityKeypair: keypair
});
```

##### updatePlatform(params: UpdatePlatformParams)
Update platform settings (only platform authority can do this).

```typescript
const result = await sdk.updatePlatform({
  platformId: new PublicKey('your_platform_id'),
  feePercentage: 600, // Optional: update to 6%
  creatorFeePercentage: 300, // Optional: update to 3%
  treasury: newTreasuryPublicKey, // Optional: update treasury
  authorityKeypair: keypair
});
```

##### updateMarketState(params: UpdateMarketStateParams)
Update market state (only platform authority can do this).

```typescript
const result = await sdk.updateMarketState({
  marketAddress: 'market_address_here',
  newState: 3, // MarketState enum value
  winningOption: true, // Optional: set winning option
  authorityKeypair: keypair
});
```

##### createMarketWithDefaults()
Helper method to create a market with sensible defaults.

```typescript
const result = await sdk.createMarketWithDefaults(
  creatorKeypair,
  'Market Name',
  'Market Description',
  'metadata_uri',
  60 // duration in minutes
);
```

### Utility Functions

#### Time Utilities
```typescript
import { 
  getCurrentTimestamp,
  createExpiryTimestamp,
  createFinalizationDeadline,
  formatTimestamp,
  isMarketExpired,
  getTimeUntilExpiry
} from '@useactions/action-protocol-markets';

const now = getCurrentTimestamp();
const expiry = createExpiryTimestamp(3600); // 1 hour from now
const deadline = createFinalizationDeadline(expiry);
const formatted = formatTimestamp(expiry);
const expired = isMarketExpired(expiry);
const timeLeft = getTimeUntilExpiry(expiry);
```

#### PDA Derivation
```typescript
import {
  deriveMarketPDA,
  deriveMarketVaultPDA,
  deriveParticipantsRegistryPDA
} from '@useactions/action-protocol-markets';

const [marketPDA] = deriveMarketPDA(creator, expiryTime);
const [vaultPDA] = deriveMarketVaultPDA(marketPDA);
const [registryPDA] = deriveParticipantsRegistryPDA(marketPDA);
```

## Market States

Markets can be in one of the following states:

- `0` - **Active**: Market is open for betting
- `1` - **Resolved**: Market has been resolved with a winning outcome
- `2` - **Canceled**: Market has been manually canceled
- `3` - **AutoCanceled**: Market was automatically canceled (not resolved within deadline)

## Examples

See the `examples/` directory for complete usage examples:

- `full-flow-test.ts` - Complete market lifecycle example with step-by-step instructions

## Constants

```typescript
import { 
  PROGRAM_ID,
  ACTIONS_PLATFORM_ID,
  ERROR_CODES 
} from '@useactions/action-protocol-markets';

console.log('Program ID:', PROGRAM_ID.toString());
console.log('Platform ID:', ACTIONS_PLATFORM_ID.toString());
```

## Types

The SDK exports comprehensive TypeScript types:

```typescript
import {
  CreateMarketParams,
  MakePredictionParams,
  ClaimWinningsParams,
  FinishMarketParams,
  ClaimCreatorFeesParams,
  InitPlatformParams,
  UpdatePlatformParams,
  UpdateMarketStateParams,
  MarketData,
  ParticipantData
} from '@useactions/action-protocol-markets';
```

## Error Handling

The SDK uses Solana's standard error handling. Common error codes:

- `6019` - Invalid expiry time (time must be in future)
- `6008` - Invalid market state
- `6013` - Insufficient funds
- `6011` - Participant not found
- `6017` - Not a winner
- `6000` - Unauthorized access
- `6001` - Global config not initialized
- `6002` - Platform not initialized

## Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Run example
npm run test
```

## Platform Information

- **Program ID**: `ACTUdJVh7H389kKpgxKjhR6o2JhRrTPdB9dS6cy41XzX`
- **Platform ID**: `ACTYY7k4vRAhzHw5gazNtEDdYEk1hC8751enx5K7Rwc` (example platform for actions.fun)
- **Networks**: Mainnet, Devnet

## License

MIT

## Support

For support and questions:
- GitHub Issues: Create an issue in the repository
- Documentation: Check the examples and type definitions
- Community: Join the Actions Protocol community
