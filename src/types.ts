import { PublicKey } from '@solana/web3.js';

export interface MarketData {
  name: string;
  description: string;
  metadataUri: string;
  creator: PublicKey;
  expiryTime: number;
  finalizationDeadline: number;
  state: MarketState;
  totalMarketSize: number;
  yesAmount: number;
  noAmount: number;
  winningOption: boolean | null;
  participantsRegistry: PublicKey;
  createdTime: number;
  finalizationTime: number | null;
  bump: number;
}

export enum MarketState {
  Active = 'active',
  Deciding = 'deciding',
  Finalized = 'finalized',
  FinalizedNoParticipants = 'finalizedNoParticipants',
  AutoCanceled = 'autoCanceled'
}

export interface Participant {
  pubkey: PublicKey;
  amount: number;
  option: boolean;
  timestamp: number;
}

export interface CreateMarketParams {
  marketName: string;
  marketDescription: string;
  metadataUri: string;
  expiryTime: number; // Unix timestamp
  finalizationDeadline: number; // Unix timestamp
  creatorKeypair: any; // Keypair or wallet adapter
}

export interface MakePredictionParams {
  marketAddress: string;
  option: boolean; // true = YES, false = NO
  amount: number; // in lamports
  participantKeypair: any; // Keypair or wallet adapter
}

export interface ClaimWinningsParams {
  marketAddress: string;
  participantKeypair: any; // Keypair or wallet adapter
}

export interface FinishMarketParams {
  marketAddress: string;
  winningOption: boolean; // true = YES, false = NO
  authorityKeypair: any; // Keypair or wallet adapter
}

export interface ClaimCreatorFeesParams {
  marketAddress: string;
  creatorKeypair: any; // Keypair or wallet adapter
}

export interface InitPlatformParams {
  platformId: string;
  authorityKeypair: any; // Keypair or wallet adapter
  feePercentage: number; // Basis points (100 = 1%)
  creatorFeePercentage: number; // Basis points (100 = 1%)
  treasury: string; // Treasury wallet address
}

export interface UpdatePlatformParams {
  platformId: string;
  authorityKeypair: any; // Keypair or wallet adapter
  feePercentage?: number; // Optional - basis points (100 = 1%)
  creatorFeePercentage?: number; // Optional - basis points (100 = 1%)
  treasury?: string; // Optional - treasury wallet address
}

export interface UpdateMarketStateParams {
  marketAddress: string;
  authorityKeypair: any; // Keypair or wallet adapter
}
