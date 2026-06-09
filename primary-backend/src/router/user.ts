import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";
import { SigninSchema, SignupSchema } from "../types";
import { prismaClient } from "../db";
import { JWT_PASSWORD } from "../config";

const SALT_ROUNDS = 10;

const router = Router();

router.post("/signup", async (req, res) => {
    const body = req.body;
    const parsedData = SignupSchema.safeParse(body);

    if (!parsedData.success) {
        return res.status(411).json({
            message: "Incorrect inputs"
        });
    }

    const userExists = await prismaClient.user.findFirst({
        where: {
            email: parsedData.data.username
        }
    });

    if (userExists) {
        return res.status(403).json({
            message: "User already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(parsedData.data.password, SALT_ROUNDS);

    await prismaClient.user.create({
        data: {
            email: parsedData.data.username,
            password: hashedPassword,
            name: parsedData.data.name
        }
    });

    return res.json({
        message: "Account created successfully. Please sign in."
    });
});

router.post("/signin", async (req, res) => {
    const body = req.body;
    const parsedData = SigninSchema.safeParse(body);

    if (!parsedData.success) {
        return res.status(411).json({
            message: "Incorrect inputs"
        });
    }

    const user = await prismaClient.user.findFirst({
        where: {
            email: parsedData.data.username
        }
    });

    if (!user) {
        return res.status(403).json({
            message: "Sorry, credentials are incorrect"
        });
    }

    const passwordMatch = await bcrypt.compare(parsedData.data.password, user.password);

    if (!passwordMatch) {
        return res.status(403).json({
            message: "Sorry, credentials are incorrect"
        });
    }

    const token = jwt.sign({
        id: user.id
    }, JWT_PASSWORD);

    return res.json({
        token
    });
});

router.get("/", authMiddleware, async (req, res) => {
    const id = (req as any).id;

    const user = await prismaClient.user.findFirst({
        where: { id },
        select: {
            name: true,
            email: true
        }
    });

    return res.json({ user });
});

export const userRouter = router;
