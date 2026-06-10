import { JsonObject } from "@prisma/client/runtime/library";
import { parse } from "../parser";

export async function handleSlack(metadata: JsonObject, zapRunMetadata: unknown): Promise<void> {
    const webhookUrl = parse((metadata?.webhookUrl as string) ?? "", zapRunMetadata);
    const message = parse((metadata?.message as string) ?? "", zapRunMetadata);

    if (!webhookUrl) {
        throw new Error("[action:slack] missing 'webhookUrl' field in metadata");
    }

    const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message })
    });

    if (!response.ok) {
        throw new Error(`[action:slack] Slack webhook failed with status ${response.status}`);
    }

    console.log(`[action:slack] message sent to Slack`);
}
