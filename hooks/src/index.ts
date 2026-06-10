import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();
const app = express();
app.use(express.json());

// Rate limit: max 30 webhook deliveries per minute per IP
// Protects against webhook flooding and abuse
const webhookRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." }
});

app.post("/hooks/catch/:userId/:zapId", webhookRateLimiter, async (req, res) => {
    const userId = req.params.userId;
    const zapId = req.params.zapId;
    const body = req.body;

    const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;

    if (idempotencyKey) {
        const existingRun = await client.zapRun.findFirst({
            where: {
                zapId,
                metadata: {
                    path: ["_idempotencyKey"],
                    equals: idempotencyKey
                }
            }
        });

        if (existingRun) {
            console.log(`[hooks] duplicate delivery detected for key=${idempotencyKey}, returning existing run`);
            return res.json({
                message: "Webhook already processed",
                zapRunId: existingRun.id,
                duplicate: true
            });
        }
    }

    const zap = await client.zap.findFirst({
        where: {
            id: zapId,
            userId: parseInt(userId)
        }
    });

    if (!zap) {
        return res.status(404).json({ message: "Zap not found" });
    }

    const metadata = idempotencyKey
        ? { ...body, _idempotencyKey: idempotencyKey }
        : body;

    const run = await client.$transaction(async tx => {
        const zapRun = await tx.zapRun.create({
            data: {
                zapId,
                metadata
            }
        });

        await tx.zapRunOutbox.create({
            data: { zapRunId: zapRun.id }
        });

        return zapRun;
    });

    console.log(`[hooks] zapRun created: ${run.id} for zapId=${zapId}`);

    return res.json({
        message: "Webhook received",
        zapRunId: run.id
    });
});

app.listen(3002, () => {
    console.log("[hooks] running on port 3002");
});
