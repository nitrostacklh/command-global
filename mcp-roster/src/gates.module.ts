/**
 * GATES — MCP‑1's second half: the design check, and the spec MCP‑2 verifies against.
 *
 * Two tools, and the order is not negotiable:
 *
 * - `check_scope` — did you design *your* job? (brief × plan)
 * - `checkpoint_spec` — turn that design into the gates, in the order **you** drew
 *
 * `check_scope` comes first because it is cheap to move a box now and expensive to
 * unpick four components later. It is also a genuinely different failure from the
 * one MCP‑2 finds: scope drift is designing the wrong *set* of components, ordering
 * drift is building your own components in the wrong sequence. Independent
 * mistakes, different conversations, and in a company the first is the more
 * expensive because nobody notices until integration.
 *
 * ## The spec is the handoff, and it can travel either way
 *
 * `checkpoint_spec` returns `mentor.checkpoints/v1`. If `SENTINEL_URL` is set it
 * *also* posts it to MCP‑2 and opens a session, which is the arrow the architecture
 * page draws. If it is not set, the artifact still comes back and the student (or
 * their client) hands it over — it is plain JSON and that path is fully supported.
 *
 * Both paths are real, and the response says which one happened. A distributed
 * system whose demo only works when every service is up is not something a judge
 * can evaluate in the ten minutes they have.
 */

import {
  ToolDecorator as Tool,
  PromptDecorator as Prompt,
  Module,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { checkScope } from './catalog/brief.js';
import { bundledBrief } from './catalog/fixtures.roster.js';
import { bundledPlan, projectsWithBundledPlans } from './catalog/fixtures.plans.js';
import { deriveCheckpointSpec } from './catalog/spec.js';
import { parsePlan, type Plan } from './shared/plan.js';
import { bridgeReport, sentinelPeer } from './shared/peer.js';
import { subjectOf } from './roster.module.js';

const planArg = z
  .union([z.string(), z.record(z.unknown())])
  .optional()
  .describe(
    'The student\'s exported lumina.plan/v1, as a JSON string or an object. Omit to use the ' +
      'bundled design for this project, when it has one.',
  );

const handleArg = z
  .string()
  .optional()
  .describe('The student\'s handle, so the spec is issued to their record.');

type Resolved =
  | { ok: true; brief: NonNullable<ReturnType<typeof bundledBrief>>; plan: Plan; planSource: string }
  | { ok: false; error: string; hint?: unknown; next?: string };

/**
 * Find the brief and the plan.
 *
 * The bundled fallback is what makes the demo one call with nothing uploaded; the
 * explicit argument is the path a real student's project takes. When neither is
 * available the error names the fix rather than describing the problem — a student
 * who has just drawn something and hit an error needs the next action, not a
 * diagnosis.
 */
function resolve(project: string, role: string, planInput: unknown): Resolved {
  const brief = bundledBrief(project, role);
  if (!brief) {
    return {
      ok: false,
      error: `no brief for ${project}/${role}`,
      next: 'Call list_roles, then projects_for_role, to see the seats that have one.',
    };
  }

  if (planInput !== undefined) {
    try {
      return { ok: true, brief, plan: parsePlan(planInput), planSource: 'yours' };
    } catch (err) {
      return {
        ok: false,
        error: `could not read your plan: ${err instanceof Error ? err.message : String(err)}`,
        hint:
          'Export it from the design canvas with the Plan button — that produces lumina.plan/v1. ' +
          'Every node needs an id, and `order` has to list every node exactly once.',
      };
    }
  }

  const bundled = bundledPlan(project);
  if (bundled) return { ok: true, brief, plan: bundled, planSource: 'the bundled worked example' };

  return {
    ok: false,
    error: `${project} has no bundled design, so this call needs your own plan`,
    hint: {
      what_to_pass: 'plan — your exported lumina.plan/v1',
      projects_with_a_bundled_design: projectsWithBundledPlans(),
    },
    next:
      'Draw your slice (one box per component you own, plus the given ones as boundaries, wired ' +
      'in build order), export it, and pass it as `plan`.',
  };
}

export class GateTools {
  @Tool({
    name: 'check_scope',
    description:
      "Compare the architecture a student drew against their role's brief, and report whether they " +
      'designed their own slice. Returns four verdicts per component: covered (yours, and you drew ' +
      'it), boundary (someone else owns it and you correctly drew it as your edge), out_of_scope ' +
      "(you drew someone else's job), missing (you own it and did not design it). This is SCOPE " +
      'drift — a different failure from the ordering drift MCP-2 finds later, and the one that is ' +
      'cheapest to fix right now. Call it before the student writes any code.',
    inputSchema: z.object({
      project: z.string().describe('Project key, e.g. "pricing".'),
      role: z.string().describe('Role key, e.g. "backend".'),
      plan: planArg,
    }),
  })
  async checkScopeTool(
    input: { project: string; role: string; plan?: unknown },
    ctx: ExecutionContext,
  ) {
    const r = resolve(input.project, input.role, input.plan);
    if (!r.ok) return r;

    const report = checkScope(r.brief, r.plan);
    ctx.logger.info('check_scope', {
      project: input.project,
      role: input.role,
      inScope: report.inScope,
      planSource: r.planSource,
    });

    return {
      project: report.project,
      role: report.role,
      design_reviewed: `${r.planSource} — "${r.plan.name}"`,
      in_scope: report.inScope,
      summary: report.summary,
      coverage: report.coverage,
      covered: report.covered,
      boundary: report.boundary,
      out_of_scope: report.outOfScope,
      missing: report.missing,
      per_component: report.entries.map((e) => ({
        component: e.label,
        verdict: e.verdict,
        note: e.note,
      })),
      next: report.inScope
        ? 'Your design covers your slice. Call checkpoint_spec to turn it into your work plan.'
        : 'Fix the design before you write code. Changing a box now costs a drag; changing it ' +
          'after four components depend on it costs an afternoon.',
      warnings: r.plan.warnings,
    };
  }

  @Tool({
    name: 'checkpoint_spec',
    description:
      "Turn a student's brief and their own design into the ordered checkpoint gates, plus the " +
      'definition of done — and hand that spec to the verifier. One gate per component they own, ' +
      'sequenced by the order THEY drew, with dependencies taken from the real edges on their ' +
      'canvas; then one per acceptance criterion. Returns a mentor.checkpoints/v1 document, which ' +
      'is the artifact MCP-2 verifies against. The sequence is theirs, not the tool\'s, which is ' +
      'what makes it fair to hold them to it later.',
    inputSchema: z.object({
      project: z.string(),
      role: z.string(),
      plan: planArg,
      handle: handleArg,
      hand_off: z
        .boolean()
        .optional()
        .describe(
          'Post the spec to MCP-2 and open a verification session (default true when ' +
            'SENTINEL_URL is configured). Set false to get the artifact back and hand it over ' +
            'yourself.',
        ),
    }),
  })
  async checkpointSpec(
    input: {
      project: string;
      role: string;
      plan?: unknown;
      handle?: string;
      hand_off?: boolean;
    },
    ctx: ExecutionContext,
  ) {
    const r = resolve(input.project, input.role, input.plan);
    if (!r.ok) return r;

    const who = subjectOf(ctx, input.handle);
    const spec = deriveCheckpointSpec(r.brief, r.plan, who.student);

    // The plan travels with the spec when we hand off, because MCP-2 needs both and
    // `plan_digest` only proves they match if it can see the plan it is comparing.
    const sentinel = sentinelPeer();
    const wantsHandOff = input.hand_off !== false && sentinel.configured;
    const handOff = wantsHandOff
      ? await sentinel.call('open_session', {
          spec,
          plan: r.plan,
          student: who.student,
        })
      : null;

    ctx.logger.info('checkpoint_spec', {
      project: input.project,
      role: input.role,
      gates: spec.checkpoints.length,
      handedOff: handOff?.ok ?? false,
    });

    const session = handOff?.ok
      ? ((handOff.data as Record<string, unknown> | null)?.session ?? null)
      : null;

    return {
      spec,
      gates: spec.checkpoints.length,
      implement_gates: spec.checkpoints.filter((c) => c.kind === 'implement').length,
      verify_gates: spec.checkpoints.filter((c) => c.kind === 'verify').length,
      derived_from: `${r.planSource} — "${r.plan.name}" (plan digest ${spec.plan_digest})`,
      how_to_use:
        'Work them in any order you like — nothing here stops you going out of sequence. If you ' +
        'do, that is recorded rather than blocked, because the divergence between the order you ' +
        'planned and the order you built is exactly what MCP-2 needs in order to teach you ' +
        'anything.',
      handed_off_to_sentinel: !!session,
      session,
      bridge: handOff
        ? bridgeReport(handOff)
        : {
            peer: 'sentinel',
            called: 'open_session',
            mode: sentinel.configured ? 'skipped' : 'absent',
            reached: false,
            url: sentinel.url,
            note: sentinel.configured
              ? 'hand_off was false — the spec is in this response, pass it to MCP-2 yourself.'
              : sentinelPeer().url === null
                ? 'SENTINEL_URL is unset on this deployment. The spec above is the artifact — pass ' +
                  'it to MCP-2 open_session as the `spec` argument.'
                : '',
          },
      next: session
        ? 'MCP-2 has the spec and a session is open. Start building, and stream your build events ' +
          'to it with build_event — that is what makes deviation detectable.'
        : 'Pass the `spec` above to MCP-2 open_session, then stream build events to it as you work.',
      warnings: spec.warnings,
    };
  }
}

export class GatePrompts {
  @Prompt({
    name: 'review_my_design',
    description:
      "Check a student's design covers their slice, then derive the checkpoint gates from it and hand them to the verifier.",
    arguments: [
      { name: 'project', description: 'Project key, e.g. pricing', required: true },
      { name: 'role', description: 'Role key, e.g. backend', required: true },
      { name: 'plan', description: 'Their exported lumina.plan/v1, if not the demo', required: false },
    ],
  })
  async reviewMyDesign(
    args: { project: string; role: string; plan?: string },
    _ctx: ExecutionContext,
  ) {
    return [
      {
        role: 'user',
        content:
          `A student has designed their slice of ${args.project} as the ${args.role}.\n\n` +
          'In order:\n' +
          '1. check_scope. If anything comes back out_of_scope or missing, stop and deal with that ' +
          'first — it is cheaper to move a box now than to unpick four components later. Read them ' +
          'the per-component verdicts, including the boundary ones, so they can see that drawing ' +
          "someone else's component as an edge is correct practice rather than a mistake.\n" +
          '2. checkpoint_spec. Read them the gates in order and the definition of done, and tell ' +
          'them the sequence is the one THEY drew — that is why it is fair.\n' +
          '3. Tell them what to do next: build, and stream build events to MCP-2 as they go.\n\n' +
          'Two rules you must not break:\n' +
          '- Do not reorder their gates for them, and do not warn them off building out of ' +
          'sequence. That divergence is the material MCP-2 needs, and pre-empting it destroys the ' +
          'lesson.\n' +
          '- Never write their code.' +
          (args.plan
            ? `\n\nTheir plan:\n${args.plan}`
            : '\n\nNo plan passed — the bundled design is used if the project has one.'),
      },
    ];
  }
}

@Module({
  name: 'gates',
  description:
    "Design review and the checkpoint spec — checks the student designed their own slice, then derives the gates from their own ordering and hands them to the verifier.",
  controllers: [GateTools, GatePrompts],
})
export class GateModule {}
