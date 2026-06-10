import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient();

async function main() {
    // Upsert to make seed idempotent — safe to run multiple times
    await prismaClient.availableTrigger.upsert({
        where: { id: "webhook" },
        update: {},
        create: {
            id: "webhook",
            name: "Webhook",
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIovxkR9l-OlwpjTXV1B4YNh0W_s618ijxAQ&s"
        }
    });

    await prismaClient.availableAction.upsert({
        where: { id: "email" },
        update: {},
        create: {
            id: "email",
            name: "Send Email",
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ4nd82eFk5SaBPRIeCpmwL7A4YSokA-kXSmw&s"
        }
    });

    await prismaClient.availableAction.upsert({
        where: { id: "webhook" },
        update: {},
        create: {
            id: "webhook",
            name: "HTTP Webhook",
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIovxkR9l-OlwpjTXV1B4YNh0W_s618ijxAQ&s"
        }
    });

    await prismaClient.availableAction.upsert({
        where: { id: "slack" },
        update: {},
        create: {
            id: "slack",
            name: "Slack Notification",
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSdnbX3DGQvExiJiJdAjkKEQrZbhqTiEyObA&s"
        }
    });

    await prismaClient.availableAction.upsert({
        where: { id: "send-sol" },
        update: {},
        create: {
            id: "send-sol",
            name: "Send Solana",
            image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT10458YI0Lf1-Zx4fGwhWxI_x4oPCD034xaw&s"
        }
    });

    console.log("Seed complete.");
}

main();
