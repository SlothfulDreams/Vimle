import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./server.js";

export const trpc = createTRPCReact<AppRouter>();
