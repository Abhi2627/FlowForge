import { JsonObject } from "@prisma/client/runtime/library";
import { parse } from "../parser";

export async function handleWebhook(metadata: JsonObject, zapRunMetadata: unknown): Promise<void> {
    const url = parse((metadata?.url as string) ?? "", zapRunMetadata);
    const bodyTemplate = (metadata?.body as string) ?? "{}";
    const body = parse(bodyTemplate, zapRunMetadata);

    if (!url) {
        throw new Error("[action:webhook] missing 'url' field in metadata");
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-FlowForge-Event": "zap-trigger"
        },
        body
    });

    if (!response.ok) {
        throw new Error(`[action:webhook] POST to ${url} failed with status ${response.status}`);
    }

    console.log(`[action:webhook] POST to ${url} succeeded with status ${response.status}`);
}
