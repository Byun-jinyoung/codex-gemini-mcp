#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAntigravityServer } from "./antigravity-server.js";

async function main() {
  const server = createAntigravityServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("antigravity-mcp started on stdio");
}

main().catch((error) => {
  console.error("fatal error", error);
  process.exit(1);
});
