import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const DEFAULT_DEVNET = "https://api.devnet.solana.com";

export function getClientSolanaRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || DEFAULT_DEVNET;
}

export function getClientSolanaConnection(): Connection {
  return new Connection(getClientSolanaRpcUrl(), "confirmed");
}

export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    transaction: Transaction,
    opts?: { skipPreflight?: boolean },
  ) => Promise<{ signature: string }>;
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const provider = (window as Window & { solana?: PhantomProvider }).solana;
  if (!provider?.isPhantom) return null;
  return provider;
}

export async function buildSolTransferTransaction(
  connection: Connection,
  fromAddress: string,
  toAddress: string,
  amountSol: number,
): Promise<Transaction> {
  const from = new PublicKey(fromAddress);
  const to = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }),
  );
  tx.feePayer = from;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  return tx;
}

export async function sendSolBribe(
  fromAddress: string,
  toAddress: string,
  amountSol: number,
): Promise<string> {
  const provider = getPhantomProvider();
  if (!provider) {
    throw new Error("Phantom wallet not found. Install Phantom to pay bribes.");
  }

  const connection = getClientSolanaConnection();
  const tx = await buildSolTransferTransaction(
    connection,
    fromAddress,
    toAddress,
    amountSol,
  );

  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction(signature, "confirmed");
  return signature;
}

export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
