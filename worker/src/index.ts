import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { Kafka } from "kafkajs";
import { getActionHandler } from "./actions/registry";

const prismaClient = new PrismaClient();
const TOPIC_NAME = "zap-events";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";

const kafka = new Kafka({
    clientId: "flowforge-worker",
    brokers: [KAFKA_BROKER]
});

async function main() {
    const consumer = kafka.consumer({ groupId: "flowforge-worker-group" });
    await consumer.connect();

    const producer = kafka.producer();
    await producer.connect();

    console.log("[worker] connected to Kafka, waiting for messages...");

    await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true });

    await consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value?.toString()) {
                return;
            }

            const parsedValue = JSON.parse(message.value.toString());
            const zapRunId: string = parsedValue.zapRunId;
            const stage: number = parsedValue.stage;

            console.log(`[worker] processing zapRunId=${zapRunId} stage=${stage}`);

            const zapRunDetails = await prismaClient.zapRun.findFirst({
                where: { id: zapRunId },
                include: {
                    zap: {
                        include: {
                            actions: {
                                include: { type: true },
                                orderBy: { sortingOrder: "asc" }
                            }
                        }
                    }
                }
            });

            if (!zapRunDetails) {
                console.error(`[worker] zapRun ${zapRunId} not found, skipping`);
                await commitOffset(consumer, TOPIC_NAME, partition, message.offset);
                return;
            }

            const currentAction = zapRunDetails.zap.actions.find(x => x.sortingOrder === stage);

            if (!currentAction) {
                console.log(`[worker] no action at stage ${stage}, skipping`);
                await commitOffset(consumer, TOPIC_NAME, partition, message.offset);
                return;
            }

            const actionId = currentAction.type.id;
            const handler = getActionHandler(actionId);

            if (!handler) {
                console.error(`[worker] no handler registered for action '${actionId}', skipping`);
                await commitOffset(consumer, TOPIC_NAME, partition, message.offset);
                return;
            }

            try {
                await handler(currentAction.metadata as JsonObject, zapRunDetails.metadata);
                console.log(`[worker] action '${actionId}' at stage ${stage} completed`);
            } catch (err) {
                console.error(`[worker] action '${actionId}' at stage ${stage} failed:`, err);
                // Commit offset even on failure to avoid infinite retry loop
                // Phase 4 will add ZapRunLog to persist this failure for the UI
            }

            const lastStage = zapRunDetails.zap.actions.length - 1;

            if (stage < lastStage) {
                console.log(`[worker] advancing to stage ${stage + 1}`);
                await producer.send({
                    topic: TOPIC_NAME,
                    messages: [{
                        value: JSON.stringify({ stage: stage + 1, zapRunId })
                    }]
                });
            }

            await commitOffset(consumer, TOPIC_NAME, partition, message.offset);
        }
    });
}

async function commitOffset(
    consumer: ReturnType<typeof kafka.consumer>,
    topic: string,
    partition: number,
    offset: string
): Promise<void> {
    await consumer.commitOffsets([{
        topic,
        partition,
        offset: (parseInt(offset) + 1).toString()
    }]);
}

main();
