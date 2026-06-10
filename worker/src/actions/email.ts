import { JsonObject } from "@prisma/client/runtime/library";
import { parse } from "../parser";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handleEmail(metadata: JsonObject, zapRunMetadata: unknown): Promise<void> {
    const to = parse((metadata?.email as string) ?? "", zapRunMetadata);
    const body = parse((metadata?.body as string) ?? "", zapRunMetadata);

    if (!to) {
        throw new Error("[action:email] missing 'email' field in metadata");
    }

    await resend.emails.send({
        from: "FlowForge <onboarding@resend.dev>",
        to,
        subject: "FlowForge automation triggered",
        text: body
    });

    console.log(`[action:email] sent to ${to}`);
}
