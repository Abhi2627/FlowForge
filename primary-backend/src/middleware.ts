import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;

    if (!token) {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }

    try {
        const payload = jwt.verify(token, JWT_PASSWORD) as { id: number };
        req.id = payload.id;
        next();
    } catch (e) {
        return res.status(403).json({
            message: "You are not logged in"
        });
    }
}

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    return res.status(500).json({
        message: "Internal server error"
    });
}
