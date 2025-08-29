import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { PROGRAM_ID, PDA_SEEDS, ACTIONS_PLATFORM_ID } from './constants';

/**
 * Derive Global Config PDA
 */
export function deriveGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
    PROGRAM_ID
  );
}

/**
 * Derive Platform Config PDA
 */
export function derivePlatformConfigPDA(
  globalConfigPDA: PublicKey,
  platformId: PublicKey = ACTIONS_PLATFORM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.PLATFORM_CONFIG),
      globalConfigPDA.toBuffer(),
      platformId.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Market PDA
 */
export function deriveMarketPDA(
  creator: PublicKey,
  expiryTime: number
): [PublicKey, number] {
  const expiryTimeBN = new BN(expiryTime);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.MARKET),
      creator.toBuffer(),
      expiryTimeBN.toArrayLike(Buffer, 'le', 8)
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Market Vault PDA
 */
export function deriveMarketVaultPDA(marketPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.MARKET_VAULT), marketPDA.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Participants Registry PDA
 */
export function deriveParticipantsRegistryPDA(marketPDA: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PARTICIPANTS), marketPDA.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Creator Fee Account PDA
 */
export function deriveCreatorFeeAccountPDA(
  platformId: PublicKey,
  marketPDA: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.CREATOR_FEES),
      platformId.toBuffer(),
      marketPDA.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Claim Account PDA
 */
export function deriveClaimAccountPDA(
  marketPDA: PublicKey,
  participant: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.CLAIM_ACCOUNT),
      marketPDA.toBuffer(),
      participant.toBuffer()
    ],
    PROGRAM_ID
  );
}

/**
 * Serialize string for instruction data
 */
export function serializeString(str: string): Buffer {
  const strBuffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(strBuffer.length, 0);
  return Buffer.concat([lengthBuffer, strBuffer]);
}

/**
 * Serialize i64 for instruction data
 */
export function serializeI64(value: number): Buffer {
  const bn = new BN(value);
  return bn.toArrayLike(Buffer, 'le', 8);
}

/**
 * Serialize u64 for instruction data
 */
export function serializeU64(value: number): Buffer {
  const bn = new BN(value);
  return bn.toArrayLike(Buffer, 'le', 8);
}

/**
 * Serialize u16 for instruction data
 */
export function serializeU16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

/**
 * Serialize boolean for instruction data
 */
export function serializeBoolean(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

/**
 * Get current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create expiry timestamp (current time + duration in seconds)
 */
export function createExpiryTimestamp(durationSeconds: number): number {
  return getCurrentTimestamp() + durationSeconds;
}

/**
 * Create finalization deadline (expiry time + buffer in seconds)
 */
export function createFinalizationDeadline(expiryTime: number, bufferSeconds: number = 12 * 60 * 60): number {
  return expiryTime + bufferSeconds;
}

/**
 * Format timestamp to human readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Check if market has expired
 */
export function isMarketExpired(expiryTime: number): boolean {
  return getCurrentTimestamp() >= expiryTime;
}

/**
 * Get time until expiry in seconds
 */
export function getTimeUntilExpiry(expiryTime: number): number {
  return Math.max(0, expiryTime - getCurrentTimestamp());
}
