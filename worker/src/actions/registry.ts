import { JsonObject } from "@prisma/client/runtime/library";
import { handleEmail } from "./email";
import { handleWebhook } from "./webhook";
import { handleSlack } from "./slack";
import { handleSolana } from "./solana";

// Action handler type — every action must conform to this signature
type ActionHandler = (metadata: JsonObject, zapRunMetadata: unknown) => Promise<void>;

// Registry maps action IDs (as stored in AvailableAction.id) to their handlers.
// To add a new action: create a handler file in ./actions, import it here, add one line.
// Zero changes required to the execution pipeline in index.ts.
const ACTION_REGISTRY: Record<string, ActionHandler> = {
    "email": handleEmail,
    "webhook": handleWebhook,
    "slack": handleSlack,
    "send-sol": handleSolana
};

export function getActionHandler(actionId: string): ActionHandler | null {
    return ACTION_REGISTRY[actionId] ?? null;
}
