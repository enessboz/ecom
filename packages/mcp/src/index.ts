import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const dataDir = path.resolve(process.env.ECOM_DATA_DIR ?? path.join(import.meta.dirname, "../../../data"));
await createServer(dataDir).connect(new StdioServerTransport());
