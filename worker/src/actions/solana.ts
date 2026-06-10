import { JsonObject } from "@prisma/client/runtime/library";
import { parse } from "../parser";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey, sendAndConfirmTransaction, Connection } from "@solana/web3.js";
import base58 from "bs58";

const connection = new Connection("https://api.mainnet-beta.solana.com", "finalized");

export async function handleSolana(metadata: JsonObject, zapRunMetadata: unknown): Promise<void> {
    const to = parse((metadata?.address as string) ?? "", zapRunMetadata);
    const amount = parse((metadata?.amount as string) ?? "", zapRunMetadata);

    if (!to || !amount) {
        throw new Error("[action:solana] missing 'address' or 'amount' field in metadata");
    }

    const keypair = Keypair.fromSecretKey(base58.decode(process.env.SOL_PRIVATE_KEY ?? ""));

    const transferTransaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: new PublicKey(to),
            lamports: parseFloat(amount) * LAMPORTS_PER_SOL
        })
    );

    await sendAndConfirmTransaction(connection, transferTransaction, [keypair]);

    console.log(`[action:solana] sent ${amount} SOL to ${to}`);
}
