/**
 * The widget manifest's example payloads, checked against the tool that produces them.
 *
 * `widget-manifest.json` carries two worked examples so a host can preview the panels
 * without a live server. Both were copied from real `open_lesson` output — and a
 * copied payload is exactly the kind of fact `GAPS.md` Gap 15 is about: something the
 * code owns and a document repeats, free to drift apart silently. A host preview that
 * renders panels the tool no longer returns is a worked example of a lie.
 *
 * So the examples are derived-checked rather than trusted. If `open_lesson`'s response
 * shape changes, or the pricing lesson is re-authored, this fails here instead of
 * looking fine until somebody opens the preview on stage.
 *
 * The second thing asserted is the one that matters more: **the part-1 example must
 * not contain the reveal.** The manifest ships inside the deployed app and is served
 * to hosts, so a careless example payload would leak what the gate exists to withhold
 * — and it would leak it in the one file nobody thinks of as code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RosterTools } from '../roster.module.js';

/** dist/catalog/ → the app root, where src/widgets lives beside dist. */
const MANIFEST = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'widgets',
  'widget-manifest.json',
);

const ctx = () => ({ logger: { info: () => {}, warn: () => {}, error: () => {} } }) as never;

interface Example {
  name: string;
  description: string;
  data: Record<string, unknown>;
}

function manifest(): { widgets: { uri: string; name: string; examples: Example[] }[] } {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

const lessonWidget = () => manifest().widgets.find((w) => w.uri === '/lesson-panels');

test('widget manifest: the lesson widget is declared, with both halves as examples', () => {
  const widget = lessonWidget();
  assert.ok(widget, 'no /lesson-panels widget in the manifest');
  assert.equal(widget.examples.length, 2, 'a host preview needs the gate AND the reveal');
});

test('widget manifest: the part-1 example is byte-identical to what open_lesson returns', async () => {
  const [partOne] = lessonWidget()!.examples;
  const live = await new RosterTools().openLesson({ project: 'pricing', role: 'backend' }, ctx());
  assert.deepEqual(
    partOne.data,
    JSON.parse(JSON.stringify(live)),
    'the manifest example has drifted from open_lesson — re-copy it',
  );
});

test('widget manifest: the part-2 example is byte-identical to the real reveal', async () => {
  const [, partTwo] = lessonWidget()!.examples;
  const live = await new RosterTools().openLesson(
    { project: 'pricing', role: 'backend', chose: 'tax_first' },
    ctx(),
  );
  assert.deepEqual(partTwo.data, JSON.parse(JSON.stringify(live)));
});

test('widget manifest: the part-1 example does not carry the reveal', () => {
  // The manifest is shipped and served to hosts. An example payload that included the
  // witness panel would hand over the discriminating case to anyone who read the file
  // — defeating the gate in the one place nobody looks for it.
  const [partOne] = lessonWidget()!.examples;
  const wire = JSON.stringify(partOne.data);

  assert.deepEqual((partOne.data.panels as { kind: string }[]).map((p) => p.kind), ['setup', 'commit']);
  for (const leak of ['$72.00', '$80.00', 'witness', 'generalise', 'tells you everything']) {
    assert.ok(!wire.includes(leak), `the part-1 example leaks ${JSON.stringify(leak)}`);
  }
});

test('widget manifest: no example anywhere carries a concept answer', () => {
  // MCP-1 has never held one, and a hand-written example is the one way a string from
  // MCP-3 could get into this repo's copy of the service.
  const wire = JSON.stringify(manifest());
  for (const leak of ['after the discount is taken off', 'transfers_to', 'transfersTo']) {
    assert.ok(!wire.includes(leak), `the manifest carries ${JSON.stringify(leak)}`);
  }
});
