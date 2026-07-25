/**
 * Identity, roles, and the bridge's own trust check.
 *
 * Ported from `sentinel/src/modules/registrar/registrar.test.ts` (deleted by the
 * three-MCP split at `aab534d`; `git show e15810a:`). The identity half moved to
 * `shared/identity.ts` unchanged, so those cases are the originals. The peer-token
 * half is new: the split introduced cross-service writes and nothing tested the
 * check that guards them.
 *
 * The cases worth writing are the ones where a plausible implementation is quietly
 * wrong in a way that costs a real person:
 *
 * - refusing anonymous callers would break the one-click judge demo, which is the
 *   single path this submission most needs to survive;
 * - treating any privileged-sounding scope as `instructor` would let one student
 *   read another's work;
 * - trusting a scope on an *unauthenticated* request would let anyone claim it.
 *
 * The role check is tested as a **refusal**, not just as a permission, because the
 * only reason roles exist here is to stop one student reading another's work.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExecutionContext } from '@nitrostack/core';

import { ANONYMOUS_ID, canReadOthers, peerToken, resolveIdentity } from './identity.js';

const asCtx = (auth?: unknown): Pick<ExecutionContext, 'auth'> =>
  ({ auth } as Pick<ExecutionContext, 'auth'>);

// ── identity ──────────────────────────────────────────────────────────────────

test('identity: no auth is a supported state, not a rejection', () => {
  // The one-click judge path depends on this. If anonymous ever throws or returns
  // null, a judge connecting a client with no account cannot use the product.
  const id = resolveIdentity(asCtx(undefined));
  assert.equal(id.id, ANONYMOUS_ID);
  assert.equal(id.role, 'student');
  assert.equal(id.authenticated, false);
  assert.match(id.how, /not private/, 'must warn that anonymous progress is shared');
});

test('identity: an authenticated subject becomes the storage key', () => {
  const id = resolveIdentity(asCtx({ subject: 'student-42' }));
  assert.equal(id.id, 'student-42');
  assert.equal(id.authenticated, true);
  assert.equal(id.role, 'student', 'no role claim means student, which is the safe default');
});

test('identity: instructor role is read from either scopes or claims', () => {
  // JWT issuers differ; supporting only one convention would work in dev and fail
  // against whatever the organizers actually issue.
  for (const auth of [
    { subject: 'a', scopes: ['instructor'] },
    { subject: 'a', scopes: ['mentor:instructor'] },
    { subject: 'a', scopes: ['MENTOR.INSTRUCTOR'] },
    { subject: 'a', claims: { role: 'instructor' } },
    { subject: 'a', claims: { role: 'Instructor' } },
  ]) {
    assert.equal(resolveIdentity(asCtx(auth)).role, 'instructor', JSON.stringify(auth));
  }
});

test('identity: an unrelated scope does not grant instructor', () => {
  const id = resolveIdentity(asCtx({ subject: 'a', scopes: ['read', 'write', 'admin'] }));
  assert.equal(id.role, 'student', '"admin" is not the instructor scope and must not be treated as one');
});

test('canReadOthers: anonymous can never read other students, whatever it claims', () => {
  // The dangerous case: an unauthenticated caller presenting an instructor scope.
  const forged = resolveIdentity(asCtx({ scopes: ['instructor'] })); // no subject
  assert.equal(forged.authenticated, false);
  assert.equal(canReadOthers(forged), false);

  assert.equal(canReadOthers(resolveIdentity(asCtx({ subject: 'x' }))), false);
  assert.equal(
    canReadOthers(resolveIdentity(asCtx({ subject: 'x', scopes: ['instructor'] }))),
    true,
  );
});

test('identity of an anonymous caller is stable, so their work is findable within a session', () => {
  const a = resolveIdentity(asCtx(undefined));
  const b = resolveIdentity(asCtx({}));
  assert.equal(a.id, b.id, 'both must land in the same drawer or anonymous progress is unreachable');
});

test('identity: a blank or whitespace subject is anonymous, not a student named " "', () => {
  // An issuer sending an empty subject would otherwise mint a real-looking identity
  // that every other empty-subject caller also lands in — anonymous, but without the
  // warning that says so.
  for (const subject of ['', '   ', '\t']) {
    const id = resolveIdentity(asCtx({ subject }));
    assert.equal(id.id, ANONYMOUS_ID, `${JSON.stringify(subject)} became a named identity`);
    assert.equal(id.authenticated, false);
  }
});

// ── the bridge's own trust check ──────────────────────────────────────────────

test('peerToken: unconfigured is a supported state, and it says writes are unattested', () => {
  // Zero-config has to keep working: refusing here would break the offline demo, and
  // claiming the write came from the verifier would be a lie about its provenance.
  const attestation = peerToken({}, {});
  assert.equal(attestation.attested, false);
  assert.equal(attestation.enforced, false, 'nothing is refused when no token is set');
  assert.match(attestation.note, /not configured/);
  assert.match(
    attestation.note,
    /gated on the student's own verbatim test output/,
    'must say why an unattested deployment still cannot leak an answer',
  );
});

test('peerToken: the shared token attests, and a wrong one is refused', () => {
  const env = { MENTOR_PEER_TOKEN: 'shared-secret' };

  const good = peerToken({ peer_token: 'shared-secret' }, env);
  assert.equal(good.attested, true);
  assert.equal(good.enforced, true);

  for (const supplied of [undefined, '', 'wrong', 'shared-secre', 'shared-secrets']) {
    const bad = peerToken({ peer_token: supplied }, env);
    assert.equal(bad.attested, false, `${JSON.stringify(supplied)} was accepted`);
    assert.equal(bad.enforced, true, 'a configured deployment must still report that it enforces');
    assert.match(bad.note, /did not present it/);
  }
});

test('peerToken: a non-object argument cannot crash the check into accepting', () => {
  // The tool layer passes whatever arrived. A string, null or a number must read as
  // "no token supplied" rather than throwing — a throw inside an auth check on a
  // configured deployment is a failure mode that fails open if anyone catches it.
  for (const args of [null, undefined, 'shared-secret', 42, []]) {
    const attestation = peerToken(args, { MENTOR_PEER_TOKEN: 'shared-secret' });
    assert.equal(attestation.attested, false, `${JSON.stringify(args)} attested`);
  }
});
