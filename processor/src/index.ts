import { PrismaClient } from "@prisma/client";
import { Kafka } from "kafkajs";

const TOPIC_NAME = "zap-events";
const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";

const client = new PrismaClient();

const kafka = new Kafka({
    clientId: "outbox-processor",
    brokers: [KAFKA_BROKER]
});

async function main() {
    const producer = kafka.producer();
    await producer.connect();
    console.log("[processor] connected to Kafka, polling outbox...");

    while (true) {
        const pendingRows = await client.zapRunOutbox.findMany({
            where: {},
            take: 10
        });

        if (pendingRows.length > 0) {
            console.log(`[processor] found ${pendingRows.length} pending rows`);

            await producer.send({
                topic: TOPIC_NAME,
                messages: pendingRows.map(r => ({
                    value: JSON.stringify({ zapRunId: r.zapRunId, stage: 0 })
                }))
            });

            await client.zapRunOutbox.deleteMany({
                where: {
                    id: {
                        in: pendingRows.map(x => x.id)
                    }
                }
            });
        }

        await new Promise(r => setTimeout(r, 3000));
    }
}

main();
