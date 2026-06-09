// Augments Express's Request type to include the `id` field
// set by authMiddleware after JWT verification.
// This removes the need for @ts-ignore or (req as any) across all route handlers.

declare global {
    namespace Express {
        interface Request {
            id: number;
        }
    }
}

export {};
