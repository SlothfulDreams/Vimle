import { vikeHandler } from "./server/vike-handler";
import { trpcHandler } from "./server/trpc-handler";
import { createHandler } from "@universal-middleware/hono";
import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono();

app.use("/api/trpc/*", createHandler(trpcHandler)("/api/trpc"));

/**
 * Vike route
 *
 * @link {@see https://vike.dev}
 **/
app.all("*", createHandler(vikeHandler)());

export const GET = handle(app);

export const POST = handle(app);

export default process.env.NODE_ENV === "production" ? undefined : app;
