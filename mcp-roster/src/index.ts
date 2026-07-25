/**
 * MENTOR · MCP-1 — roster.
 *
 * Role, then the projects that role exists on, then the brief, then the checkpoint
 * spec that MCP-2 verifies against. See `app.module.ts` for why this is a separate
 * deployment rather than a module of one big server.
 *
 * Transport:
 * - development (NODE_ENV unset or `development`): STDIO, which is what NitroStudio spawns
 * - production: dual — STDIO plus HTTP, so the other two services and a hosted
 *   client can both reach it
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ MCP-1 (roster) failed to start:', error);
  process.exit(1);
});
