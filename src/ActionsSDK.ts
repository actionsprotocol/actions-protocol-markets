import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  AccountMeta,
  Keypair
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  PROGRAM_ID,
  ACTIONS_PLATFORM_ID,
  SYSTEM_PROGRAM_ID,
  INSTRUCTION_DISCRIMINATORS
} from './constants';
import {
  deriveGlobalConfigPDA,
  derivePlatformConfigPDA,
  deriveMarketPDA,
  deriveMarketVaultPDA,
  deriveParticipantsRegistryPDA,
  deriveCreatorFeeAccountPDA,
  deriveClaimAccountPDA,
  serializeString,
  serializeI64,
  serializeU64,
  serializeU16,
  serializeBoolean,
  getCurrentTimestamp,
  createExpiryTimestamp,
  createFinalizationDeadline
} from './utils';
import {
  CreateMarketParams,
  MakePredictionParams,
  ClaimWinningsParams,
  FinishMarketParams,
  ClaimCreatorFeesParams,
  InitPlatformParams,
  UpdatePlatformParams,
  UpdateMarketStateParams,
  MarketData
} from './types';

export class ActionsSDK {
  private connection: Connection;
  private platformId: PublicKey;

  constructor(connection: Connection, platformId: PublicKey = ACTIONS_PLATFORM_ID) {
    this.connection = connection;
    this.platformId = platformId;
  }

  /**
   * Create a new prediction market
   */
  async createMarket(params: CreateMarketParams): Promise<{
    transaction: Transaction;
    marketAddress: string;
    instructions: TransactionInstruction[];
  }> {
    const creator = params.creatorKeypair.publicKey;
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [marketPDA] = deriveMarketPDA(creator, params.expiryTime);
    const [marketVaultPDA] = deriveMarketVaultPDA(marketPDA);
    const [participantsRegistryPDA] = deriveParticipantsRegistryPDA(marketPDA);
    const [creatorFeeAccountPDA] = deriveCreatorFeeAccountPDA(this.platformId, marketPDA);

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.CREATE_MARKET,
      this.platformId.toBuffer(), // platform_id
      serializeString(params.marketName),
      serializeString(params.marketDescription),
      serializeString(params.metadataUri),
      serializeI64(params.expiryTime),
      serializeI64(params.finalizationDeadline)
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: marketVaultPDA, isSigner: false, isWritable: true },
      { pubkey: participantsRegistryPDA, isSigner: false, isWritable: true },
      { pubkey: creatorFeeAccountPDA, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      marketAddress: marketPDA.toString(),
      instructions: [instruction]
    };
  }

  /**
   * Make a prediction (bet) on a market
   */
  async makePrediction(params: MakePredictionParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const participant = params.participantKeypair.publicKey;
    const marketPDA = new PublicKey(params.marketAddress);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [marketVaultPDA] = deriveMarketVaultPDA(marketPDA);
    const [participantsRegistryPDA] = deriveParticipantsRegistryPDA(marketPDA);
    const [creatorFeeAccountPDA] = deriveCreatorFeeAccountPDA(this.platformId, marketPDA);

    // Fetch actual treasury addresses from on-chain accounts
    const globalConfigAccount = await this.connection.getAccountInfo(globalConfigPDA);
    const platformConfigAccount = await this.connection.getAccountInfo(platformConfigPDA);
    
    if (!globalConfigAccount || !platformConfigAccount) {
      throw new Error('Failed to fetch config accounts');
    }

    // Parse global config to get global treasury
    // GlobalConfig: discriminator(8) + protocol_authority(32) + global_treasury(32) + ...
    const globalTreasury = new PublicKey(globalConfigAccount.data.slice(40, 72));
    
    // Parse platform config to get platform treasury  
    // PlatformConfig: discriminator(8) + authority(32) + fee_percentage(2) + creator_fee_percentage(2) + treasury(32) + ...
    const platformTreasury = new PublicKey(platformConfigAccount.data.slice(44, 76));

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.MAKE_PREDICTION,
      this.platformId.toBuffer(), // platform_id
      serializeBoolean(params.option), // option (true = YES, false = NO)
      serializeU64(params.amount) // amount in lamports
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: marketVaultPDA, isSigner: false, isWritable: true },
      { pubkey: creatorFeeAccountPDA, isSigner: false, isWritable: true },
      { pubkey: participantsRegistryPDA, isSigner: false, isWritable: true },
      { pubkey: participant, isSigner: true, isWritable: true },
      { pubkey: platformTreasury, isSigner: false, isWritable: true }, // Platform treasury from config
      { pubkey: globalTreasury, isSigner: false, isWritable: true }, // Global treasury from config
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Finish/resolve a market
   */
  async finishMarket(params: FinishMarketParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const authority = params.authorityKeypair.publicKey;
    const marketPDA = new PublicKey(params.marketAddress);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [participantsRegistryPDA] = deriveParticipantsRegistryPDA(marketPDA);

    // Build instruction data
    // winning_option is Option<bool>: 1 byte for Some/None + 1 byte for bool value if Some
    const winningOptionBuffer = Buffer.alloc(2);
    winningOptionBuffer.writeUInt8(1, 0); // Some variant (1 = Some, 0 = None)
    winningOptionBuffer.writeUInt8(params.winningOption ? 1 : 0, 1); // bool value
    
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.FINISH_MARKET,
      this.platformId.toBuffer(), // platform_id
      winningOptionBuffer // winning_option: Option<bool>
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: participantsRegistryPDA, isSigner: false, isWritable: true }, // Must be writable
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Claim winnings from a resolved market
   */
  async claimWinnings(params: ClaimWinningsParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const participant = params.participantKeypair.publicKey;
    const marketPDA = new PublicKey(params.marketAddress);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [marketVaultPDA] = deriveMarketVaultPDA(marketPDA);
    const [participantsRegistryPDA] = deriveParticipantsRegistryPDA(marketPDA);
    const [claimAccountPDA] = deriveClaimAccountPDA(marketPDA, participant);

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.CLAIM_WINNINGS,
      this.platformId.toBuffer() // platform_id
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: marketVaultPDA, isSigner: false, isWritable: true },
      { pubkey: participantsRegistryPDA, isSigner: false, isWritable: true },
      { pubkey: claimAccountPDA, isSigner: false, isWritable: true },
      { pubkey: participant, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Helper: Create a market with sensible defaults
   */
  async createMarketWithDefaults(
    creatorKeypair: Keypair,
    marketName: string,
    marketDescription: string,
    metadataUri: string,
    durationMinutes: number = 60
  ): Promise<{
    transaction: Transaction;
    marketAddress: string;
    instructions: TransactionInstruction[];
    expiryTime: number;
    finalizationDeadline: number;
  }> {
    const expiryTime = createExpiryTimestamp(durationMinutes * 60);
    const finalizationDeadline = createFinalizationDeadline(expiryTime);

    const result = await this.createMarket({
      marketName,
      marketDescription,
      metadataUri,
      expiryTime,
      finalizationDeadline,
      creatorKeypair
    });

    return {
      ...result,
      expiryTime,
      finalizationDeadline
    };
  }

  /**
   * Get market address for given creator and expiry time
   */
  getMarketAddress(creator: PublicKey, expiryTime: number): string {
    const [marketPDA] = deriveMarketPDA(creator, expiryTime);
    return marketPDA.toString();
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get platform ID
   */
  getPlatformId(): PublicKey {
    return this.platformId;
  }

  /**
   * Claim creator fees from a market
   */
  async claimCreatorFees(params: ClaimCreatorFeesParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const creator = params.creatorKeypair.publicKey;
    const marketPDA = new PublicKey(params.marketAddress);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [creatorFeeAccountPDA] = deriveCreatorFeeAccountPDA(this.platformId, marketPDA);

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.CLAIM_CREATOR_FEES,
      this.platformId.toBuffer() // platform_id
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: false },
      { pubkey: creatorFeeAccountPDA, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Initialize a new platform
   */
  async initPlatform(params: InitPlatformParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const authority = params.authorityKeypair.publicKey;
    const platformId = new PublicKey(params.platformId);
    const treasury = new PublicKey(params.treasury);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, platformId);

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.INIT_PLATFORM,
      platformId.toBuffer(), // platform_id
      serializeU16(params.feePercentage), // fee_percentage
      serializeU16(params.creatorFeePercentage), // creator_fee_percentage
      treasury.toBuffer() // treasury
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false }, // Treasury account
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Update platform configuration
   */
  async updatePlatform(params: UpdatePlatformParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const authority = params.authorityKeypair.publicKey;
    const platformId = new PublicKey(params.platformId);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, platformId);

    // Serialize optional parameters
    const feePercentageBuffer = params.feePercentage !== undefined 
      ? Buffer.concat([Buffer.from([1]), serializeU16(params.feePercentage)]) // Some(value)
      : Buffer.from([0]); // None

    const creatorFeePercentageBuffer = params.creatorFeePercentage !== undefined
      ? Buffer.concat([Buffer.from([1]), serializeU16(params.creatorFeePercentage)]) // Some(value)
      : Buffer.from([0]); // None

    const treasuryBuffer = params.treasury !== undefined
      ? Buffer.concat([Buffer.from([1]), new PublicKey(params.treasury).toBuffer()]) // Some(value)
      : Buffer.from([0]); // None

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.UPDATE_PLATFORM,
      platformId.toBuffer(), // platform_id
      feePercentageBuffer, // fee_percentage: Option<u16>
      creatorFeePercentageBuffer, // creator_fee_percentage: Option<u16>
      treasuryBuffer // treasury: Option<Pubkey>
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }

  /**
   * Update market state (force state transition)
   */
  async updateMarketState(params: UpdateMarketStateParams): Promise<{
    transaction: Transaction;
    instructions: TransactionInstruction[];
  }> {
    const authority = params.authorityKeypair.publicKey;
    const marketPDA = new PublicKey(params.marketAddress);
    
    // Derive all required PDAs
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    const [platformConfigPDA] = derivePlatformConfigPDA(globalConfigPDA, this.platformId);
    const [participantsRegistryPDA] = deriveParticipantsRegistryPDA(marketPDA);

    // Build instruction data
    const instructionData = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.UPDATE_MARKET_STATE,
      this.platformId.toBuffer() // platform_id
    ]);

    // Build accounts array
    const accounts: AccountMeta[] = [
      { pubkey: globalConfigPDA, isSigner: false, isWritable: false },
      { pubkey: platformConfigPDA, isSigner: false, isWritable: false },
      { pubkey: marketPDA, isSigner: false, isWritable: true },
      { pubkey: participantsRegistryPDA, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false }
    ];

    const instruction = new TransactionInstruction({
      keys: accounts,
      programId: PROGRAM_ID,
      data: instructionData
    });

    const transaction = new Transaction().add(instruction);

    return {
      transaction,
      instructions: [instruction]
    };
  }
}
