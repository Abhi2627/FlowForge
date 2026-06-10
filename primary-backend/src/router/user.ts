import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authMiddleware } from "../middleware";
import { SigninSchema, SignupSchema } from "../types";
import { prismaClient } from "../db";
import { JWT_PASSWORD } from "../config";
import { sendVerificationEmail } from "../email";

const SALT_ROUNDS = 10;
const router = Router();

router.post("/signup", async (req, res) => {
    const parsedData = SignupSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(411).json({ message: "Incorrect inputs" });
    }

    const userExists = await prismaClient.user.findFirst({
        where: { email: parsedData.data.username }
    });

    if (userExists) {
        return res.status(403).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(parsedData.data.password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prismaClient.user.create({
        data: {
            email: parsedData.data.username,
            password: hashedPassword,
            name: parsedData.data.name,
            verificationToken,
            verificationTokenExpiry
        }
    });

    await sendVerificationEmail(parsedData.data.username, verificationToken);

    return res.json({
        message: "Account created. Please check your email to verify your account."
    });
});

router.get("/verify-email", async (req, res) => {
    const token = req.query.token as string;

    if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await prismaClient.user.findFirst({
        where: {
            verificationToken: token,
            verificationTokenExpiry: { gt: new Date() }
        }
    });

    if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await prismaClient.user.update({
        where: { id: user.id },
        data: {
            isVerified: true,
            verificationToken: null,
            verificationTokenExpiry: null
        }
    });

    return res.json({ message: "Email verified successfully. You can now sign in." });
});

router.post("/signin", async (req, res) => {
    const parsedData = SigninSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(411).json({ message: "Incorrect inputs" });
    }

    const user = await prismaClient.user.findFirst({
        where: { email: parsedData.data.username }
    });

    if (!user) {
        return res.status(403).json({ message: "Sorry, credentials are incorrect" });
    }

    const passwordMatch = await bcrypt.compare(parsedData.data.password, user.password);

    if (!passwordMatch) {
        return res.status(403).json({ message: "Sorry, credentials are incorrect" });
    }

    if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before signing in" });
    }

    const token = jwt.sign({ id: user.id }, JWT_PASSWORD);

    return res.json({ token });
});

router.get("/", authMiddleware, async (req, res) => {
    const user = await prismaClient.user.findFirst({
        where: { id: req.id },
        select: { name: true, email: true }
    });

    return res.json({ user });
});

export const userRouter = router;
