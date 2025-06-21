// Mock Solana types
declare module '@solana/web3.js' {
  export class Connection {
    constructor(endpoint: string, commitment?: string);
    getBalance(publicKey: PublicKey): Promise<number>;
    sendTransaction(transaction: Transaction): Promise<string>;
  }

  export class PublicKey {
    constructor(value: string | Buffer | Uint8Array);
    toString(): string;
    toBase58(): string;
  }

  export class Transaction {
    constructor();
    add(instruction: TransactionInstruction): Transaction;
    sign(...signers: Signer[]): void;
  }

  export class TransactionInstruction {
    constructor(opts: {
      keys: AccountMeta[];
      programId: PublicKey;
      data?: Buffer;
    });
  }

  export interface AccountMeta {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }

  export interface Signer {
    publicKey: PublicKey;
    secretKey: Uint8Array;
  }

  export const SystemProgram: {
    transfer(opts: {
      fromPubkey: PublicKey;
      toPubkey: PublicKey;
      lamports: number;
    }): TransactionInstruction;
  };

  export const LAMPORTS_PER_SOL: number;
}
