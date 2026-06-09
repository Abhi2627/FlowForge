import "express-async-errors";
import express from "express";
import cors from "cors";
import { userRouter } from "./router/user";
import { zapRouter } from "./router/zap";
import { triggerRouter } from "./router/trigger";
import { actionRouter } from "./router/action";
import { errorMiddleware } from "./middleware";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/zap", zapRouter);
app.use("/api/v1/trigger", triggerRouter);
app.use("/api/v1/action", actionRouter);

// Global error handler — catches any unhandled async errors from route handlers
// express-async-errors patches Express so async throws reach this middleware
app.use(errorMiddleware);

app.listen(3000, () => {
    console.log("[primary-backend] running on port 3000");
});
