import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { Kafka } from "kafkajs";
import { parse } from "./parser";
import { sendEmail } from "./email";
import { sendSol } from "./solana";

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
            const zapRunId = parsedValue.zapRunId;
            const stage: number = parsedValue.stage;

            console.log(`[worker] processing zapRunId=${zapRunId} stage=${stage}`);

            const zapRunDetails = await prismaClient.zapRun.findFirst({
                where: { id: zapRunId },
                include: {
                    zap: {
                        include: {
                            actions: {
                                include: { type: true }
                            }
                        }
                    }
                }
            });

            const currentAction = zapRunDetails?.zap.actions.find(x => x.sortingOrder === stage);

            if (!currentAction) {
                console.log(`[worker] no action found at stage ${stage}, skipping`);
                await consumer.commitOffsets([{
                    topic: TOPIC_NAME,
                    partition,
                    offset: (parseInt(message.offset) + 1).toString()
                }]);
                return;
            }

            const zapRunMetadata = zapRunDetails?.metadata;

            if (currentAction.type.id === "email") {
                const body = parse((currentAction.metadata as JsonObject)?.body as string, zapRunMetadata);
                const to = parse((currentAction.metadata as JsonObject)?.email as string, zapRunMetadata);
                console.log(`[worker] sending email to ${to}`);
                await sendEmail(to, body);
            }

            if (currentAction.type.id === "send-sol") {
                const amount = parse((currentAction.metadata as JsonObject)?.amount as string, zapRunMetadata);
                const address = parse((currentAction.metadata as JsonObject)?.address as string, zapRunMetadata);
                console.log(`[worker] sending ${amount} SOL to ${address}`);
                await sendSol(address, amount);
            }

            await new Promise(r => setTimeout(r, 500));

            const lastStage = (zapRunDetails?.zap.actions?.length || 1) - 1;

            if (lastStage !== stage) {
                console.log(`[worker] advancing to stage ${stage + 1}`);
                await producer.send({
                    topic: TOPIC_NAME,
                    messages: [{
                        value: JSON.stringify({
                            stage: stage + 1,
                            zapRunId
                        })
                    }]
                });
            }

            console.log(`[worker] stage ${stage} complete`);

            await consumer.commitOffsets([{
                topic: TOPIC_NAME,
                partition,
                offset: (parseInt(message.offset) + 1).toString()
            }]);
        }
    });
}

main();
