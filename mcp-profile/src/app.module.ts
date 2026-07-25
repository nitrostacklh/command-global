import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { ProfileModule } from './profile.module.js';
import { CardModule } from './cards.module.js';
import { SystemHealthCheck } from './health/system.health.js';

// ── MCP-3 of three. The plane that outlives the conversation ───────────────────
//
//   MCP-1  roster      role → the projects that role exists on → the checkpoint spec
//   MCP-2  sentinel    verifies each gate against the build, issues the verdict
//   MCP-3  profile   ← this app. The single owner of everything about the student,
//                      and the flashcards made from the drift MCP-2 found.
//
// Nine tools. Six are the record, three are the cards:
//
//   open_profile      open or resume — and start a session (bumps the review clock)
//   read_profile      the whole mentor.profile/v1 document
//   note_role_choice  ← written by MCP-1 when a brief is opened
//   record_verdict    ← written by MCP-2 when a build is judged
//   class_progress    instructor only, incl. which concept the room is failing on
//   profile_status    is the record actually being kept, and what do I own
//   flashcard         may I have the answer? (gated on real test output)
//   review_flashcard  I recalled it, here is how well
//   due_cards         what should I look at right now
//
// ## The architectural fact worth stating up front
//
// **This is the only process in the system that holds a flashcard answer.** MCP-1
// hands out the concept question; MCP-2's verdict carries the concept key. Neither
// has ever held the answer, so no bug in either can leak the thing the student is
// supposed to earn — a stronger guarantee than a `withheld: true` flag, which only
// protects the code paths someone remembered to check.
//
// Enforced by the build, not by review: `scripts/embed_fixtures.mjs` strips the
// answers out of MCP-1's copy of every brief and asserts the removal in both
// directions, and MCP-1's brief parser throws if one ever arrives anyway.
//
// ## No tool here can touch a student's build, and none can query the database
//
// No `query`, no `execute_sql`, no `db_write`. A generic database tool hands the
// client's model arbitrary access to every student's record, and "the model only runs
// safe queries" is not a security model. Every operation is named, with the identity
// check next to the data it guards.

/**
 * Root module — MCP-3 · profile.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'mentor-profile',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
@Module({
  name: 'app',
  description:
    'MENTOR MCP-3 — the whole student record: who you are, the roles you have taken, the projects ' +
    'you finished, every gate you passed, every time your build left your design, and what that ' +
    'says about which ideas you have actually got. Plus the flashcards, made from your own ' +
    'mistakes and released only once you fixed them yourself.',
  imports: [ConfigModule.forRoot(), ProfileModule, CardModule],
  providers: [SystemHealthCheck],
})
export class AppModule {}
