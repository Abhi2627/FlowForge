import { Router } from "express";
import { authMiddleware } from "../middleware";
import { ZapCreateSchema } from "../types";
import { prismaClient } from "../db";

const router = Router();

router.post("/", authMiddleware, async (req, res) => {
    const id = req.id;
    const parsedData = ZapCreateSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(411).json({ message: "Incorrect inputs" });
    }

    const zapId = await prismaClient.$transaction(async tx => {
        const zap = await tx.zap.create({
            data: {
                userId: id,
                triggerId: "",
                actions: {
                    create: parsedData.data.actions.map((x, index) => ({
                        actionId: x.availableActionId,
                        sortingOrder: index,
                        metadata: x.actionMetadata
                    }))
                }
            }
        });

        const trigger = await tx.trigger.create({
            data: {
                triggerId: parsedData.data.availableTriggerId,
                zapId: zap.id
            }
        });

        await tx.zap.update({
            where: { id: zap.id },
            data: { triggerId: trigger.id }
        });

        return zap.id;
    });

    return res.json({ zapId });
});

router.get("/", authMiddleware, async (req, res) => {
    const id = req.id;

    const zaps = await prismaClient.zap.findMany({
        where: { userId: id },
        include: {
            actions: { include: { type: true } },
            trigger: { include: { type: true } }
        }
    });

    return res.json({ zaps });
});

router.get("/:zapId", authMiddleware, async (req, res) => {
    const id = req.id;
    const zapId = req.params.zapId;

    const zap = await prismaClient.zap.findFirst({
        where: { id: zapId, userId: id },
        include: {
            actions: { include: { type: true } },
            trigger: { include: { type: true } }
        }
    });

    if (!zap) {
        return res.status(404).json({ message: "Zap not found" });
    }

    return res.json({ zap });
});

router.get("/:zapId/runs", authMiddleware, async (req, res) => {
    const id = req.id;
    const zapId = req.params.zapId;

    // Verify zap belongs to the requesting user
    const zap = await prismaClient.zap.findFirst({
        where: { id: zapId, userId: id }
    });

    if (!zap) {
        return res.status(404).json({ message: "Zap not found" });
    }

    const runs = await prismaClient.zapRun.findMany({
        where: { zapId },
        orderBy: { id: "desc" },
        take: 50,
        include: {
            logs: {
                orderBy: { stage: "asc" }
            }
        }
    });

    return res.json({ runs });
});

export const zapRouter = router;
