/**
 * ROSTER — MCP‑1. Role, then projects, then the assignment.
 *
 * The architecture page is blunt about what this app is: *"MCP‑1 · **not MENTOR** —
 * role, project & checkpoint webapp"*. It resolves who the student is going to be
 * and what that person is on the hook for, mints the spec MCP‑2 will verify
 * against, and then gets out of the way. It has no opinion about the student's
 * code, no drift logic, and no flashcards.
 *
 * That restraint is load-bearing rather than tidy. Three deployments each telling
 * one story means the tool list of each *is* a legible interface — a client's model
 * reading MCP‑1's seven tools can tell it is at the start of something, which it
 * could not do from a flat bag of twenty verbs across the whole loop.
 *
 * ## Role first, and the project list is a function of the role
 *
 * `list_roles` before `projects_for_role`, and the second genuinely depends on the
 * first — see `catalog.ts` for why that ordering is the difference between a job
 * board and a course listing. There is deliberately **no** `list_all_projects`
 * tool: adding one would let a model skip the role, and every downstream artifact
 * (`owns`, `given`, the checkpoint spec, the verdict) is defined in terms of a role.
 * A project without a role attached is not an assignment, it is a topic.
 *
 * ## `sign_in` is a bridge, not a login
 *
 * The architecture has Login/Register as the entry point, with the profile record
 * opened in MCP‑3. So `sign_in` calls MCP‑3 over MCP and reports what came back —
 * including when MCP‑3 is not configured, in which case the student works fine for
 * one sitting and is told plainly that nothing is being kept.
 *
 * It is **not authentication** and it says so in its own response. A handle is a
 * name. Real authentication arrives through the SDK's auth modules as
 * `ctx.auth.subject`, and when it is present it wins over any handle a caller
 * types — otherwise "sign in as someone else" would be a tool argument.
 */

import {
  ToolDecorator as Tool,
  PromptDecorator as Prompt,
  Module,
  Widget,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import {
  catalogCoverage,
  findArchetype,
  findProject,
  findRole,
  projectsForRole,
  roleIndex,
  type CatalogProject,
} from './catalog/catalog.js';
import { bundledBrief, bundledCatalog } from './catalog/fixtures.roster.js';
import { bundledLesson, lessonSeats } from './catalog/fixtures.lessons.js';
import { resolveIdentity } from './shared/identity.js';
import { bridgeReport, profilePeer, sentinelPeer } from './shared/peer.js';
import { ISSUER } from './catalog/spec.js';

/**
 * Who this call is about.
 *
 * SDK auth wins when it is present. Otherwise a handle gives a returning student a
 * stable key without an issuer being configured — which is the difference between a
 * demo where progress accumulates and one where it cannot. The `how` string is
 * carried into every response so nobody has to infer which of the two happened.
 */
export function subjectOf(
  ctx: ExecutionContext,
  handle?: string,
): { student: string; authenticated: boolean; how: string } {
  const identity = resolveIdentity(ctx);
  if (identity.authenticated) {
    return { student: identity.id, authenticated: true, how: identity.how };
  }
  const clean = (handle ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 40);
  if (clean) {
    return {
      student: `handle:${clean}`,
      authenticated: false,
      how:
        `Keyed to the handle ${JSON.stringify(clean)}. This is a name, not a login — anyone who ` +
        'types the same handle on this deployment gets the same record. Fine for a classroom or a ' +
        'demo, and not a security boundary.',
    };
  }
  return { student: 'anonymous', authenticated: false, how: identity.how };
}

const handleArg = z
  .string()
  .optional()
  .describe(
    'The student\'s handle, so a returning student keeps their record. Ignored when the request ' +
      'carries a real authenticated subject. Omit to work anonymously.',
  );

export class RosterTools {
  @Tool({
    name: 'sign_in',
    description:
      'Start or resume a student on this deployment. Opens their record in the profile service ' +
      '(MCP-3) if one does not exist, and returns what they were last working on so they can pick ' +
      'it up. Call this first: everything downstream is filed against the identity it returns. ' +
      'Works with no profile service configured — the student simply starts fresh each session, ' +
      'and the response says so rather than implying their work is safe.',
    inputSchema: z.object({
      handle: handleArg,
      new_account: z
        .boolean()
        .optional()
        .describe(
          'True when the student says they are new. Only changes the wording — the profile ' +
            'service creates a record on first sight either way, so a returning student who ' +
            'clicks Register does not lose anything.',
        ),
    }),
  })
  async signIn(input: { handle?: string; new_account?: boolean }, ctx: ExecutionContext) {
    const who = subjectOf(ctx, input.handle);
    const peer = profilePeer();
    const result = await peer.call<Record<string, unknown>>('open_profile', {
      student: who.student,
      handle: input.handle ?? who.student,
      new_account: input.new_account === true,
    });

    ctx.logger.info('sign_in', {
      student: who.student,
      authenticated: who.authenticated,
      profile: result.mode,
    });

    const profile = result.ok ? (result.data as Record<string, unknown> | null) : null;
    const resuming = profile?.resuming as Record<string, unknown> | undefined;

    return {
      step: 'signed in',
      you: { student: who.student, authenticated: who.authenticated, how: who.how },
      record_kept: result.ok,
      // Named plainly. "Your progress is saved" when it is not is the single most
      // damaging thing a learning tool can say.
      what_that_means: result.ok
        ? 'Your work is filed under this identity and will be here next session.'
        : 'Nothing is being kept between sessions on this deployment. Everything below still ' +
          'works for this sitting.',
      picking_up: resuming ?? null,
      known_projects: profile?.projects ?? [],
      mastery: profile?.mastery ?? [],
      bridge: bridgeReport(result),
      next:
        resuming && Object.keys(resuming).length
          ? 'Call open_brief for what you were working on, or list_roles to start something new.'
          : 'Call list_roles to choose who you want to be on this project.',
    };
  }

  @Tool({
    name: 'list_roles',
    description:
      'The roles a student can take, which is the FIRST choice in this product — before any ' +
      'project. Each role is a job description, not a filter: it says what that person tends to ' +
      'own, how many projects in this catalog contain a job of that shape, and how many of those ' +
      'can be worked today. Pick a role, then call projects_for_role — the project list is ' +
      'derived from the role and changes with it.',
    inputSchema: z.object({
      handle: handleArg,
    }),
  })
  async listRoles(input: { handle?: string }, ctx: ExecutionContext) {
    const catalog = bundledCatalog();
    const coverage = catalogCoverage(catalog);
    const roles = roleIndex(catalog);
    const who = subjectOf(ctx, input.handle);

    // Read the student's history so a returning learner is not shown their role
    // menu as though they had never been here. An unreachable profile service is
    // reported, never guessed at.
    const peer = profilePeer();
    const seen = await peer.call<{ role_history?: { role: string }[] }>('read_profile', {
      student: who.student,
    });
    const played = new Set((seen.data?.role_history ?? []).map((r) => r.role));

    ctx.logger.info('list_roles', { roles: roles.length, student: who.student });

    return {
      step: '1 of 3 — who are you on this team?',
      catalog: catalog.name,
      coverage,
      honesty:
        coverage.playableSeats === coverage.seats
          ? `Every one of the ${coverage.seats} seats in this catalog has a brief written, so any ` +
            `role you pick is playable. ${coverage.demoableSeats} of them also ship a worked ` +
            'example you can watch end to end without designing anything first.'
          : `${coverage.playableSeats} of ${coverage.seats} seats have a brief written and are ` +
            'playable; the rest are listed so you can see the shape of the team.',
      roles: roles.map((r) => ({
        role: r.key,
        title: r.title,
        what_this_job_is: r.blurb,
        you_tend_to_own: r.youTendToOwn,
        projects_with_this_seat: r.projects,
        playable_now: r.playable,
        watchable_end_to_end: r.demoable,
        appears_in: r.domains,
        you_have_played_this: played.has(r.key),
      })),
      product_types: catalog.domains.map((d) => ({
        domain: d.key,
        title: d.title,
        what_its_like: d.blurb,
      })),
      why_role_first:
        'Because that is how you join a team. You do not choose a codebase and then discover what ' +
        'you are responsible for — you are hired into a job, and the work you are shown is the ' +
        'work that exists for that person.',
      bridge: bridgeReport(seen),
      next: 'Call projects_for_role with the role you picked.',
      warnings: catalog.warnings,
    };
  }

  @Tool({
    name: 'projects_for_role',
    description:
      'The projects that contain a real job of the shape the student picked — this list is derived ' +
      'from the role and is different for every role, never a static catalog. For each project it ' +
      'returns why the project is worth an afternoon, every component in the whole system (so the ' +
      'student can see the parts that are NOT theirs), and what this particular seat is on the ' +
      'hook for. Playable seats come first.',
    inputSchema: z.object({
      role: z.string().describe('A role key from list_roles, e.g. "backend".'),
      handle: handleArg,
    }),
  })
  async projectsForRole(input: { role: string; handle?: string }, ctx: ExecutionContext) {
    const catalog = bundledCatalog();
    const archetype = findArchetype(catalog, input.role);
    if (!archetype) {
      return {
        error: `no role ${JSON.stringify(input.role)} in this catalog`,
        available: catalog.roles.map((r) => r.key),
        next: 'Call list_roles.',
      };
    }

    const offers = projectsForRole(catalog, input.role);
    const who = subjectOf(ctx, input.handle);
    const peer = profilePeer();
    const history = await peer.call<{ projects?: { project: string; role: string; status: string }[] }>(
      'read_profile',
      { student: who.student },
    );
    const doneBefore = new Map(
      (history.data?.projects ?? [])
        .filter((p) => p.role === input.role)
        .map((p) => [p.project, p.status]),
    );

    ctx.logger.info('projects_for_role', { role: input.role, offers: offers.length });

    if (offers.length === 0) {
      return {
        role: input.role,
        title: archetype.title,
        projects: [],
        note:
          `${archetype.title} is a real role in this catalog but no project currently has a seat ` +
          'for it. That is a gap in the catalog, not in you.',
        next: 'Call list_roles and pick a role with playable_now above zero.',
      };
    }

    return {
      step: '2 of 3 — pick the project you want that job on',
      role: input.role,
      title: archetype.title,
      what_this_job_is: archetype.blurb,
      list_is_role_derived:
        `These are the ${offers.length} project(s) in the catalog that contain a ` +
        `${archetype.title} seat. Pick a different role and this list changes — it is not the ` +
        'catalog filtered, it is the catalog asked a different question.',
      projects: offers.map((o) => describeSeat(o.project, o.role, doneBefore.get(o.project.key))),
      bridge: bridgeReport(history),
      next:
        'Call open_brief with the project and this role to get the actual assignment — what you ' +
        'own, what other people hand you, and what "done" means.',
    };
  }

  @Tool({
    name: 'open_brief',
    description:
      'Open the assignment for one role on one project. Returns what this role OWNS (their slice — ' +
      'the components they must build), what is GIVEN to them (components other roles own, which ' +
      'they build against but do not implement), what is explicitly NOT theirs, the signed-off ' +
      'acceptance criteria, and the question the project exists to teach. The answer to that ' +
      'question is not here and is not available from this service at all — it is earned from the ' +
      'profile service once the student\'s own tests pass.',
    inputSchema: z.object({
      project: z.string().describe('A project key from projects_for_role, e.g. "pricing".'),
      role: z.string().describe('A role key, e.g. "backend".'),
      handle: handleArg,
    }),
  })
  async openBrief(
    input: { project: string; role: string; handle?: string },
    ctx: ExecutionContext,
  ) {
    const catalog = bundledCatalog();
    const found = findRole(catalog, input.project, input.role);
    if (!found) {
      const project = findProject(catalog, input.project);
      return {
        error: project
          ? `project ${input.project} has no ${JSON.stringify(input.role)} seat`
          : `no project ${JSON.stringify(input.project)} in this catalog`,
        available: project ? project.roles.map((r) => r.key) : catalog.projects.map((p) => p.key),
        next: project ? 'Call projects_for_role for a role that exists here.' : 'Call list_roles.',
      };
    }

    const brief = bundledBrief(input.project, input.role);
    if (!brief) {
      return {
        error:
          `${found.role.title} is in the catalog but has no brief written yet, so there is ` +
          'nothing to hold you to. Pick a seat marked playable.',
        playable: catalog.projects.flatMap((p) =>
          p.roles.filter((r) => r.briefed).map((r) => ({ project: p.key, role: r.key })),
        ),
      };
    }

    const who = subjectOf(ctx, input.handle);
    // Recording the role choice is what makes `list_roles` able to say "you have
    // played this" next time. It is a write, and it happens as a consequence of
    // opening the brief rather than needing a `save` verb of its own.
    const peer = profilePeer();
    const noted = await peer.call('note_role_choice', {
      student: who.student,
      project: input.project,
      role: input.role,
    });

    ctx.logger.info('open_brief', {
      project: input.project,
      role: input.role,
      student: who.student,
      noted: noted.mode,
    });

    return {
      step: '3 of 3 — your assignment',
      project: brief.project,
      role: brief.role,
      title: brief.title,
      you_are: brief.youAre,
      stakes: brief.stakes,
      deliverable: brief.deliverable,
      you_own: brief.owns.map((o) => ({
        component: o.component,
        intent: o.intent,
        why_yours: o.whyYours,
      })),
      given_to_you: brief.given.map((g) => ({
        component: g.component,
        owned_by: g.ownedBy,
        contract: g.contract,
        note: 'Draw it as your boundary. Do not implement it.',
      })),
      not_yours: notYours(
        found.project,
        brief.owns.map((o) => o.component),
        brief.given.map((g) => g.component),
      ),
      acceptance: brief.acceptance.map((a) => ({ id: a.id, given: a.given, must: a.must })),
      concept_you_are_here_to_learn: {
        key: brief.concept.key,
        question: brief.concept.question,
        // Not "withheld: true" next to the string. This service does not have the
        // string. See catalog/brief.ts.
        answer:
          'not held by this service — MCP-3 releases it once your own tests are green, and it is ' +
          'the only process that has it',
      },
      files: { entry: brief.entry, tests: brief.tests },
      bridge: bridgeReport(noted),
      next:
        'Draw your slice: one box per component you own, plus the given ones as your boundary, ' +
        'wired in the order you intend to build them. Then call check_scope with the exported ' +
        'lumina.plan/v1 to confirm you designed your job and not somebody else\'s.',
      warnings: brief.warnings,
    };
  }

  @Tool({
    name: 'open_lesson',
    description:
      'Teach the concept behind a project, as panels the student walks rather than documentation ' +
      'they skim. Call it with no `chose` to get the setup and the question; the student must pick ' +
      'one of the returned choices, and you then call it again with `chose` set to their answer to ' +
      'get the case that tells the two apart. The second half is NOT in the first response — do ' +
      'not describe, guess at, or summarise what the remaining panels might say before the student ' +
      'has committed to an answer, because a reveal read out to somebody who never picked a side ' +
      'teaches them nothing. No panel contains the principle: the student derives it, and the ' +
      'profile service confirms it once their own tests are green.',
    inputSchema: z.object({
      project: z.string().describe('A project key, e.g. "pricing".'),
      role: z.string().describe('A role key, e.g. "backend".'),
      chose: z
        .string()
        .optional()
        .describe(
          'The id of the choice the student committed to, from the first call. Omit on the first ' +
            'call. Sending a made-up value is refused rather than guessed at.',
        ),
      handle: handleArg,
    }),
  })
  // Renders the panels rather than the JSON — `MENTOR-CONCEPT.md` §3 asks for panels,
  // not prose. The widget cannot leak the reveal, because the gate below never sends
  // it: the choice buttons call this tool again and the second half arrives as a fresh
  // result. See `src/widgets/app/lesson-panels/page.tsx`.
  @Widget('lesson-panels')
  async openLesson(
    input: { project: string; role: string; chose?: string; handle?: string },
    ctx: ExecutionContext,
  ) {
    const lesson = bundledLesson(input.project, input.role);
    if (!lesson) {
      const catalog = bundledCatalog();
      return {
        error:
          `no lesson written for ${input.project}/${input.role} yet — the brief still stands, ` +
          'the taught version of the concept is what is missing.',
        seats_with_lessons: lessonSeats(),
        playable: catalog.projects.flatMap((p) =>
          p.roles.filter((r) => r.briefed).map((r) => ({ project: p.key, role: r.key })),
        ),
      };
    }

    const commitAt = lesson.panels.findIndex((p) => p.kind === 'commit');
    const commit = commitAt === -1 ? null : lesson.panels[commitAt];
    const choiceIds = (commit?.choices ?? []).map((c) => c.id);

    // ── the gate ────────────────────────────────────────────────────────────
    //
    // Same construction as the flashcard's answer side, for the same reason: the
    // withheld panels are ABSENT from the response, not present behind a flag. A
    // field a model can read is a field it will read out, and this one read out
    // early costs the student the only part of the lesson that does any work.
    if (!input.chose || !choiceIds.includes(input.chose)) {
      const refused = input.chose && !choiceIds.includes(input.chose);
      ctx.logger.info('open_lesson: awaiting commitment', {
        project: input.project,
        role: input.role,
        rejected: refused ? input.chose : undefined,
      });
      return {
        step: 'lesson · part 1 of 2',
        schema: lesson.schema,
        project: lesson.project,
        role: lesson.role,
        title: lesson.title,
        panels: lesson.panels.slice(0, commitAt === -1 ? undefined : commitAt + 1),
        ...(refused
          ? {
              rejected: `${JSON.stringify(input.chose)} is not one of the choices offered`,
            }
          : {}),
        awaiting: {
          panel: commit?.id ?? null,
          choices: commit?.choices ?? [],
          why: 'The next panel separates these two answers. It only teaches the student something ' +
            'if they have already picked one.',
        },
        withheld: `${lesson.panels.length - (commitAt + 1)} panel(s), until a choice is made`,
        next: 'Ask the student which they would write. Then call open_lesson again with chose set to their answer.',
      };
    }

    const chosen = commit?.choices?.find((c) => c.id === input.chose);
    ctx.logger.info('open_lesson: revealed', {
      project: input.project,
      role: input.role,
      chose: input.chose,
    });

    // Whether they were right is deliberately not computed here. The witness panel
    // shows both columns and lets the student read their own answer off it — which
    // is the difference between being told and noticing.
    return {
      step: 'lesson · part 2 of 2',
      schema: lesson.schema,
      project: lesson.project,
      role: lesson.role,
      title: lesson.title,
      you_chose: { id: chosen?.id ?? input.chose, label: chosen?.label ?? '' },
      panels: lesson.panels.slice(commitAt + 1),
      concept_you_are_here_to_learn: {
        key: lesson.conceptKey,
        answer:
          'not held by this service — the panels above are built so the student can derive it, and ' +
          'MCP-3 confirms it once their own tests are green',
      },
      next:
        'Do not state the principle for them. Ask them to say it in their own words first, then ' +
        'have them draw their slice in Lumina and call check_scope with the exported plan.',
    };
  }

  @Tool({
    name: 'roster_status',
    description:
      'What this service is, what it hands to the other two, and which of them it can currently ' +
      'reach. Use it to orient, and to check the bridges are wired before demoing anything.',
    inputSchema: z.object({}),
  })
  async rosterStatus(_input: unknown, ctx: ExecutionContext) {
    const catalog = bundledCatalog();
    const profile = profilePeer();
    const sentinel = sentinelPeer();

    // Reachability is *probed*, not inferred from the env var being set: a URL that
    // points at a service which is down would otherwise read as "wired".
    const profileProbe = profile.configured
      ? await profile.call('profile_status', {})
      : null;

    ctx.logger.info('roster_status', {
      profile: profile.url ?? '(unset)',
      sentinel: sentinel.url ?? '(unset)',
    });

    return {
      service: 'MCP-1 · roster',
      i_am_not: 'MENTOR. I hold no drift logic, no flashcards, and no opinion about your code.',
      i_own: [
        'the role archetypes a student picks from, before any project',
        'the project list, derived from the role they picked',
        'the role-scoped brief: owns, given, not_yours, acceptance criteria',
        'the checkpoint spec — the per-project, per-role gates MCP-2 verifies against',
      ],
      i_hand_off: {
        to: 'MCP-2 · sentinel',
        artifact: 'mentor.checkpoints/v1',
        how: 'checkpoint_spec returns it; pass it to MCP-2 open_session, or let me post it if SENTINEL_URL is set',
        issued_by: ISSUER,
      },
      i_read: {
        from: 'MCP-3 · profile',
        why: 'so a returning student sees what they already played, and their role choice is kept',
      },
      catalog: { name: catalog.name, ...catalogCoverage(catalog) },
      peers: {
        profile: {
          configured: profile.configured,
          url: profile.url,
          reachable: profileProbe ? profileProbe.ok : null,
          note: profileProbe?.note ?? 'PROFILE_URL is unset — running without a profile plane.',
        },
        sentinel: {
          configured: sentinel.configured,
          url: sentinel.url,
          note: sentinel.configured
            ? 'SENTINEL_URL is set — checkpoint_spec can post the spec directly.'
            : 'SENTINEL_URL is unset — hand the spec to MCP-2 yourself. It is plain JSON.',
        },
      },
      answers_i_hold: 'none, by construction — see catalog/brief.ts',
    };
  }
}

/** Components in the project that this role neither owns nor is handed. */
function notYours(
  project: CatalogProject,
  owns: readonly string[],
  given: readonly string[],
): string[] {
  const mine = new Set([...owns, ...given].map((c) => c.trim().toLowerCase()));
  return project.components.filter((c) => !mine.has(c.trim().toLowerCase()));
}

function describeSeat(
  project: CatalogProject,
  seat: { key: string; title: string; oneLiner: string; briefed: boolean; demo: boolean },
  priorStatus: string | undefined,
) {
  const brief = seat.briefed ? bundledBrief(project.key, seat.key) : null;
  return {
    project: project.key,
    title: project.title,
    product_type: project.domain,
    why_its_worth_your_afternoon: project.whyExemplary,
    your_seat: {
      role: seat.key,
      title: seat.title,
      on_the_hook_for: seat.oneLiner,
      playable: seat.briefed,
      watchable_end_to_end: seat.demo,
      // Derived from the brief at call time, never cached on the catalog — a second
      // copy of `owns` would disagree with the first within a week.
      components_you_would_own: brief?.owns.length ?? null,
      criteria_you_are_held_to: brief?.acceptance.length ?? null,
    },
    // The whole system, so the student can see the parts they are NOT doing. That
    // visibility is the entire point of role-scoping.
    every_component_in_the_system: project.components,
    other_seats: project.roles
      .filter((r) => r.key !== seat.key)
      .map((r) => ({ role: r.key, title: r.title, owns_the: r.oneLiner })),
    you_have_done_this: priorStatus ?? null,
  };
}

export class RosterPrompts {
  @Prompt({
    name: 'pick_a_role',
    description:
      'Walk a student from nothing to an assignment: sign in, choose a role, choose a project for it, open the brief.',
    arguments: [
      {
        name: 'interest',
        description: 'What the student says they want to build, learn, or be',
        required: false,
      },
      { name: 'handle', description: 'Their handle, so progress is kept', required: false },
    ],
  })
  async pickARole(args: { interest?: string; handle?: string }, _ctx: ExecutionContext) {
    return [
      {
        role: 'user',
        content:
          'You are helping a student get their first real assignment. Use these tools in order: ' +
          'sign_in, list_roles, projects_for_role, open_brief.\n\n' +
          (args.handle ? `Their handle is ${args.handle}.\n\n` : '') +
          (args.interest
            ? `They said: ${args.interest}\n\n`
            : 'They have not said what they want yet — ask, briefly.\n\n') +
          'Four things to get right, because they are the product:\n' +
          '1. The ROLE comes first, before any project. Read them the job descriptions. Do not ' +
          'jump to a project because it sounds interesting — the role is what makes this a job ' +
          'instead of an exercise.\n' +
          '2. The project list you get back is derived from their role. Say so. If they want to ' +
          'see other projects, that is a different role, and it is a real choice.\n' +
          '3. They own a SLICE. Read the given_to_you and not_yours lists out loud. Knowing what ' +
          'you are not building is half of knowing what you are.\n' +
          '4. Do NOT answer the concept question. This service does not even have the answer. ' +
          'They earn it from MCP-3 at the end, with green tests.\n\n' +
          'Finish by telling them to draw their slice — one box per component they own, plus the ' +
          'given ones as boundaries, wired in the order they mean to build.',
      },
    ];
  }
}

@Module({
  name: 'roster',
  description:
    'Front door — role archetypes, the project list derived from the role, and the role-scoped brief that says which slice of a project is yours.',
  controllers: [RosterTools, RosterPrompts],
})
export class RosterModule {}
