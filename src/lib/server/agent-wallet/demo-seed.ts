import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { SecureWallet } from "agentwallets";

import { getGcpProjectId } from "@/lib/server/agent-wallet/config";
import { serializeTransaction } from "@/lib/guardian/solana-tx";
import { addPendingTransaction } from "@/lib/server/pending-transactions";
import { getSolanaRpcUrl } from "@/lib/solana/rpc";

export async function queueDemoPendingTransfer(
  subOrganizationId: string,
  transferSol: number,
) {
  const { GcpAgent } = await import("agentwallets");

  const gcp = GcpAgent.fromEnv({ projectId: getGcpProjectId() });
  const wallet = await gcp.loadJsonSecret<SecureWallet>(
    `wallet-${subOrganizationId}`,
  );

  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const from = new PublicKey(wallet.solanaAddress);
  const to = new PublicKey(
    process.env.DEMO_RECIPIENT_ADDRESS ??
      "11111111111111111111111111111112",
  );

  const { blockhash } = await connection.getLatestBlockhash();
  const lamports = Math.floor(transferSol * 1_000_000_000);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: from,
  }).add(
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports,
    }),
  );

  return addPendingTransaction({
    description: `AI Agent transfer request (${transferSol} SOL)`,
    recipient: to.toBase58(),
    transferSol,
    serializedTx: serializeTransaction(tx),
    subOrganizationId: wallet.subOrganizationId,
  });
}
