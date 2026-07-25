import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { RosterModule } from './roster.module.js';
import { GateModule } from './gates.module.js';
import { SystemHealthCheck } from './health/system.health.js';

// ── MCP-1 of three. What it is, and what it deliberately is not ───────────────
//
// MENTOR is three deployed MCP applications, and the architecture is explicit that
// this one is *not* MENTOR:
//
//   MCP-1  roster    ← this app. Role → the projects that role exists on → the
//                      brief → the checkpoint spec. Then it stops.
//   MCP-2  sentinel    runs alongside the student's build: verifies each gate,
//                      finds where they deviated, issues the build verdict.
//   MCP-3  profile     the whole student record, and the flashcards made from the
//                      drift MCP-2 found.
//
// Seven tools here, in the order a student meets them:
//
//   sign_in            open or resume a record (bridges to MCP-3)
//   list_roles         who do you want to be — the FIRST choice, before any project
//   projects_for_role  the project list, derived from that role and different for
//                      every role
//   open_brief         what you own, what you are given, what is not yours
//   check_scope        did you design your own slice?
//   checkpoint_spec    the gates, in the order you drew — handed to MCP-2
//   roster_status      what this service is and which peers it can reach
//
// ## Why three apps rather than one with three modules
//
// In an MCP app the tool list *is* the interface: the client's model picks from it.
// One server holding the whole loop offers twenty-odd verbs at once, and a model
// asked "help me with this failing test" has no way to tell which of them belongs to
// the stage the student is actually in. Split three ways, each surface tells one
// story, and the story is legible from `tools/list` alone.
//
// The split also buys a real security property that no amount of care inside one
// process could: **this app has never held a flashcard answer.** They live only in
// MCP-3. A verbose tool, a log line, or a widget rendering its own input cannot leak
// what the student is supposed to earn, because the string is not here. See
// `catalog/brief.ts` and `scripts/embed_fixtures.mjs`.
//
// ## No tool here can touch a student's build
//
// Nothing in this app writes source, runs tests, or proposes a patch. That is
// checked over the wire rather than asserted: `npm run verify:live` fails if any
// tool name on any of the three deployments matches /patch|write|fix|apply|heal/.

/**
 * Root module — MCP-1 · roster.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'mentor-roster',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description:
    'MENTOR MCP-1 — pick the role you want on a real project, get the slice of it you would ' +
    'actually own, design that slice, and receive the checkpoint gates derived from your own ' +
    'design. The gates go to the verifier; this service holds no opinion about your code and ' +
    'no answers.',
  imports: [ConfigModule.forRoot(), RosterModule, GateModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
