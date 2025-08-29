import { PublicKey } from '@solana/web3.js';

// Program ID for Actions Prediction Markets
export const PROGRAM_ID = new PublicKey('ACTUdJVh7H389kKpgxKjhR6o2JhRrTPdB9dS6cy41XzX');

// Default platform ID for Actions platform
export const ACTIONS_PLATFORM_ID = new PublicKey('ACTYY7k4vRAhzHw5gazNtEDdYEk1hC8751enx5K7Rwc');

// System Program ID
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// Instruction discriminators (first 8 bytes of each instruction)
export const INSTRUCTION_DISCRIMINATORS = {
  CREATE_MARKET: Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]),
  MAKE_PREDICTION: Buffer.from([206, 137, 238, 92, 59, 16, 13, 227]),
  FINISH_MARKET: Buffer.from([200, 216, 58, 2, 224, 204, 151, 26]),
  CLAIM_WINNINGS: Buffer.from([161, 215, 24, 59, 14, 236, 242, 221]),
  CLAIM_CREATOR_FEES: Buffer.from([0, 23, 125, 234, 156, 118, 134, 89]),
  UPDATE_MARKET_STATE: Buffer.from([195, 34, 135, 147, 8, 27, 159, 18]),
  INIT_PLATFORM: Buffer.from([29, 22, 210, 225, 219, 114, 193, 169]),
  UPDATE_PLATFORM: Buffer.from([46, 78, 138, 189, 47, 163, 120, 85])
};

// PDA Seeds
export const PDA_SEEDS = {
  GLOBAL_CONFIG: 'global_config',
  PLATFORM_CONFIG: 'platform_config',
  MARKET: 'market',
  MARKET_VAULT: 'market_vault',
  PARTICIPANTS: 'participants',
  CREATOR_FEES: 'creator_fees',
  CLAIM_ACCOUNT: 'claim'
};

// Error codes
export const ERROR_CODES = {
  INVALID_EXPIRY_TIME: 6019,
  INVALID_MARKET_STATE: 6008,
  INSUFFICIENT_FUNDS: 6013,
  PARTICIPANT_NOT_FOUND: 6011,
  NOT_A_WINNER: 6017,
  INVALID_BET_AMOUNT: 6010
};
