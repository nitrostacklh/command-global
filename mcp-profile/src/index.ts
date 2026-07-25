/**
 * MENTOR · MCP-3 — profile and flashcards.
 *
 * The single owner of the student record. Written by MCP-2's verdicts, read by MCP-1,
 * and the only process in the system that holds a flashcard answer. See
 * `app.module.ts`.
 *
 * Transport:
 * - development: STDIO, which is what NitroStudio spawns
 * - production: dual — STDIO plus HTTP, because the other two services reach this one
 *   over HTTP and a student's client may too
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap().catch((error) => {
  console.error('❌ MCP-3 (profile) failed to start:', error);
  process.exit(1);
});
