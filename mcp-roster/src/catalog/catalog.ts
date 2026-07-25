/**
 * `mentor.catalog/v1` — and the reason MCP‑1 is role-first rather than menu-first.
 *
 * The architecture is explicit about this: **Role Selection** comes first, and the
 * project list's "contents change with the selected role — never a static catalog."
 * That is not a UI preference. It is the difference between two products:
 *
 * - A static catalog is a course listing. You pick a project, and a role is a
 *   filter you apply afterwards to reduce the work.
 * - A role-first catalog is a job board. You say who you are, and you are shown
 *   the work that *exists for that person* — which is how anyone actually joins a
 *   team, and it is why `owns` / `given` mean anything at all.
 *
 * So this file indexes the catalog the other way round from how it is authored.
 * Projects still declare their roles (that is where the truth lives — a project
 * knows what jobs it contains), and `roleIndex` inverts it at call time. Storing
 * the inverse would be a second copy that disagrees with the first within a week,
 * the same reason `owns_count` is derived from the brief rather than cached here.
 *
 * ## Role archetypes are top-level, project roles are references
 *
 * `catalog.roles` describes what being a backend engineer *is* — the sentence a
 * student reads before they have picked anything. A project's `roles[]` then says
 * "this project has a job of that shape, and here is what it is on the hook for
 * here." One archetype, many projects: that is what makes a role selectable
 * before a project exists in the student's mind.
 *
 * ## Why "curated" is a property of the schema
 *
 * `why_exemplary` is required on every project. A catalog of projects nobody can
 * say anything specific about is a list of homework. If a project cannot justify
 * its place in one sentence, it does not get an entry.
 */

export const CATALOG_SCHEMA = 'mentor.catalog/v1';

/** A role archetype — the first thing a student chooses, before any project. */
export interface CatalogRoleArchetype {
  readonly key: string;
  readonly title: string;
  /** What this job is actually like. Two sentences, second person. */
  readonly blurb: string;
  /** The kind of components this person tends to own, across projects. */
  readonly youTendToOwn: string;
}

/** A product type. Kept as a secondary axis — useful to browse, not the entry. */
export interface CatalogDomain {
  readonly key: string;
  readonly title: string;
  readonly blurb: string;
}

/** A role as it exists *on one project*. Thin — the contract is in the brief. */
export interface CatalogProjectRole {
  readonly key: string;
  readonly title: string;
  /** What this person is on the hook for here, in one line. */
  readonly oneLiner: string;
  /**
   * True when a `mentor.brief/v1` exists for this project×role. A role with no
   * brief is advertised but unplayable, and every tool says which is which rather
   * than letting a student pick it and hit an empty screen.
   */
  readonly briefed: boolean;
  /**
   * True when a plan **and** a build history are also bundled, so this seat runs
   * end to end with nothing uploaded.
   *
   * Separate from `briefed` because they are different promises and conflating
   * them would be an overclaim. `briefed` means *you* can work this seat with your
   * own design. `demo` means a judge can watch the whole loop in one call. Every
   * seat in this catalog is briefed; three of five are demoable, and the tools say
   * so rather than letting someone pick a seat expecting a one-click walkthrough.
   */
  readonly demo: boolean;
}

export interface CatalogProject {
  readonly key: string;
  readonly domain: string;
  readonly title: string;
  readonly whyExemplary: string;
  /**
   * Every component in the whole system — not just one role's. The point of
   * role-scoping is being able to see the parts you are *not* doing.
   */
  readonly components: readonly string[];
  readonly roles: readonly CatalogProjectRole[];
}

export interface Catalog {
  readonly schema: string;
  readonly name: string;
  readonly roles: readonly CatalogRoleArchetype[];
  readonly domains: readonly CatalogDomain[];
  readonly projects: readonly CatalogProject[];
  readonly warnings: readonly string[];
}

export class CatalogParseError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function safeJson(raw: string, what: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new CatalogParseError(
      `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Parse a `mentor.catalog/v1` document (object or JSON string).
 *
 * Strict about the envelope, forgiving about entries. A malformed project is
 * dropped with a warning rather than taking the whole catalog down — one bad entry
 * should not stop a student browsing the others. But a wrong `schema` or a missing
 * `projects` array throws: presenting an empty menu as a real one wastes the only
 * moment the student is deciding whether this is worth their afternoon.
 *
 * @throws CatalogParseError on an unusable envelope.
 */
export function parseCatalog(input: unknown): Catalog {
  const raw: unknown = typeof input === 'string' ? safeJson(input, 'catalog') : input;
  if (!isObj(raw)) throw new CatalogParseError('catalog must be a JSON object');

  const schema = str(raw.schema);
  if (schema !== CATALOG_SCHEMA) {
    throw new CatalogParseError(
      `unsupported catalog schema ${JSON.stringify(schema || '(missing)')} — expected ${CATALOG_SCHEMA}`,
    );
  }
  if (!Array.isArray(raw.domains)) throw new CatalogParseError('catalog.domains must be an array');
  if (!Array.isArray(raw.projects)) throw new CatalogParseError('catalog.projects must be an array');

  const warnings: string[] = [...toStringArray(raw.warnings)];

  const roles: CatalogRoleArchetype[] = [];
  const roleKeys = new Set<string>();
  for (const r of Array.isArray(raw.roles) ? raw.roles : []) {
    if (!isObj(r)) continue;
    const key = str(r.key).trim();
    if (!key || roleKeys.has(key)) continue;
    roleKeys.add(key);
    roles.push({
      key,
      title: str(r.title).trim() || key,
      blurb: str(r.blurb).trim(),
      youTendToOwn: str(r.you_tend_to_own).trim(),
    });
  }
  if (roles.length === 0) {
    // Role selection is the entry point of the whole product. A catalog with no
    // archetypes cannot be entered, so this is an envelope failure rather than a
    // degraded one.
    throw new CatalogParseError(
      'catalog.roles is empty — role selection is the first step of the loop, so there is ' +
        'nothing for a student to enter through',
    );
  }

  const domains: CatalogDomain[] = [];
  const domainKeys = new Set<string>();
  for (const d of raw.domains) {
    if (!isObj(d)) continue;
    const key = str(d.key).trim();
    if (!key || domainKeys.has(key)) continue;
    domainKeys.add(key);
    domains.push({ key, title: str(d.title).trim() || key, blurb: str(d.blurb).trim() });
  }

  const projects: CatalogProject[] = [];
  const projectKeys = new Set<string>();
  for (const p of raw.projects) {
    if (!isObj(p)) continue;
    const key = str(p.key).trim();
    if (!key) {
      warnings.push('dropped a project with no key');
      continue;
    }
    if (projectKeys.has(key)) {
      warnings.push(`dropped duplicate project ${key}`);
      continue;
    }

    const domain = str(p.domain).trim();
    if (!domainKeys.has(domain)) {
      warnings.push(
        `dropped project ${key} — domain ${JSON.stringify(domain)} is not in the catalog`,
      );
      continue;
    }

    if (!str(p.why_exemplary).trim()) {
      warnings.push(`project ${key} has no why_exemplary — it is listed but not justified`);
    }

    const projectRoles: CatalogProjectRole[] = [];
    const seenHere = new Set<string>();
    for (const r of Array.isArray(p.roles) ? p.roles : []) {
      if (!isObj(r)) continue;
      const roleKey = str(r.key).trim();
      if (!roleKey || seenHere.has(roleKey)) continue;
      if (!roleKeys.has(roleKey)) {
        // A project role that references no archetype is unreachable through role
        // selection, so keeping it would advertise a path that dead-ends.
        warnings.push(
          `project ${key} declares role ${JSON.stringify(roleKey)}, which is not one of the ` +
            'catalog.roles archetypes — dropped, because role selection could never reach it',
        );
        continue;
      }
      seenHere.add(roleKey);
      const briefed = r.briefed === true;
      if (r.demo === true && !briefed) {
        // A demoable seat with no brief is incoherent: the bundled plan would have
        // nothing to be scoped against. Downgraded rather than trusted, because the
        // alternative is a one-click demo that dead-ends at open_brief.
        warnings.push(
          `project ${key} marks role ${roleKey} as demoable but not briefed — demo ignored`,
        );
      }
      projectRoles.push({
        key: roleKey,
        title: str(r.title).trim() || roleKey,
        oneLiner: str(r.one_liner).trim(),
        briefed,
        demo: briefed && r.demo === true,
      });
    }
    if (projectRoles.length === 0) {
      warnings.push(`dropped project ${key} — no roles, so there is nothing for a student to be`);
      continue;
    }

    projectKeys.add(key);
    projects.push({
      key,
      domain,
      title: str(p.title).trim() || key,
      whyExemplary: str(p.why_exemplary).trim(),
      components: toStringArray(p.components)
        .map((c) => c.trim())
        .filter(Boolean),
      roles: projectRoles,
    });
  }

  return { schema, name: str(raw.name, 'Untitled catalog'), roles, domains, projects, warnings };
}

// ── the inversion: role ▶ projects ────────────────────────────────────────────

export interface RoleOffer {
  readonly project: CatalogProject;
  readonly role: CatalogProjectRole;
}

/**
 * Every project that has a job of this shape.
 *
 * Playable ones first, then roadmap — a student choosing what to spend an
 * afternoon on should not have to scan past three dead ends to find the live one.
 * Within each group, catalog order is preserved so the list is stable between
 * calls; a list that reshuffles makes a student think something changed.
 */
export function projectsForRole(catalog: Catalog, roleKey: string): RoleOffer[] {
  const offers: RoleOffer[] = [];
  for (const project of catalog.projects) {
    const role = project.roles.find((r) => r.key === roleKey);
    if (role) offers.push({ project, role });
  }
  return [
    ...offers.filter((o) => o.role.briefed),
    ...offers.filter((o) => !o.role.briefed),
  ];
}

export interface RoleSummary {
  readonly key: string;
  readonly title: string;
  readonly blurb: string;
  readonly youTendToOwn: string;
  /** Projects in this catalog that contain a job of this shape. */
  readonly projects: number;
  /** How many of those can actually be worked today — a brief exists. */
  readonly playable: number;
  /** How many run end to end with nothing uploaded. A subset of `playable`. */
  readonly demoable: number;
  /** Distinct product types this role appears in — the breadth of the job. */
  readonly domains: readonly string[];
}

/**
 * The role menu, with the truth about coverage attached to each entry.
 *
 * `playable` is on every row rather than summarised once at the top, because a
 * student picks a *row*. A footnote saying "2 of 5 roles are playable" does not
 * stop anyone clicking the wrong one.
 */
export function roleIndex(catalog: Catalog): RoleSummary[] {
  return catalog.roles.map((archetype) => {
    const offers = projectsForRole(catalog, archetype.key);
    return {
      key: archetype.key,
      title: archetype.title,
      blurb: archetype.blurb,
      youTendToOwn: archetype.youTendToOwn,
      projects: offers.length,
      playable: offers.filter((o) => o.role.briefed).length,
      demoable: offers.filter((o) => o.role.demo).length,
      domains: [...new Set(offers.map((o) => o.project.domain))],
    };
  });
}

export function findProject(catalog: Catalog, projectKey: string): CatalogProject | null {
  return catalog.projects.find((p) => p.key === projectKey) ?? null;
}

export function findRole(
  catalog: Catalog,
  projectKey: string,
  roleKey: string,
): RoleOffer | null {
  const project = findProject(catalog, projectKey);
  const role = project?.roles.find((r) => r.key === roleKey);
  return project && role ? { project, role } : null;
}

export function findArchetype(catalog: Catalog, roleKey: string): CatalogRoleArchetype | null {
  return catalog.roles.find((r) => r.key === roleKey) ?? null;
}

/** Playable-vs-advertised, for the one line that has to be said up front. */
export function catalogCoverage(catalog: Catalog): {
  roles: number;
  domains: number;
  projects: number;
  seats: number;
  playableSeats: number;
  demoableSeats: number;
} {
  const seats = catalog.projects.flatMap((p) => p.roles);
  return {
    roles: catalog.roles.length,
    domains: catalog.domains.length,
    projects: catalog.projects.length,
    seats: seats.length,
    playableSeats: seats.filter((r) => r.briefed).length,
    demoableSeats: seats.filter((r) => r.demo).length,
  };
}
