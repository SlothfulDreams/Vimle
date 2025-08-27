import { trpcServer } from "@hono/trpc-server";
import { createHandler } from "@universal-middleware/hono";
import { config } from "dotenv";
import { Hono } from "hono";
import { appRouter } from "./trpc/server";
import { vikeHandler } from "./server/vike-handler";

// Load environment variables from .env file
config();

const app = new Hono();

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
  })
);

/**
 * Vike route
 *
 * @link {@see https://vike.dev}
 **/
app.all("*", createHandler(vikeHandler)());

export default app;
