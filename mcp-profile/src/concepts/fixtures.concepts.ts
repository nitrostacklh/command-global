/**
 * The concept bank — GENERATED, do not edit by hand.
 *
 * Written by `scripts/embed_fixtures.mjs` from the `concept` block of each brief
 * under `fixtures/`.
 *
 * **This is the only process in the system that holds a flashcard answer.** MCP-1
 * hands out the question and the key; MCP-2's verdict carries the key. Neither has
 * ever had the answer, so neither can leak it. Releasing one is gated here, in
 * `../cards/card.ts`, on the student's own test output — and while the tests are
 * red the `back` field is *absent from the response object* rather than present
 * with a flag, because a field a model can read is a field it will read out.
 *
 * To change any of these, edit the brief JSON under `fixtures/` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */

export interface ConceptEntry {
  readonly key: string;
  readonly project: string;
  readonly role: string;
  /** The card front. Also held by MCP-1, which is fine — a question gives nothing away. */
  readonly question: string;
  /** The card back. The principle, never the corrected line. */
  readonly answer: string;
  /** Where else this shows up, so the lesson outlives the project. */
  readonly transfersTo: string;
}

export const CONCEPTS: Record<string, ConceptEntry> = {
  "deduplicate-before-you-transform": {
    key: "deduplicate-before-you-transform",
    project: "event-ingest",
    role: "data",
    question: "Deduplicating and normalising both have to happen. Which one goes first, and how would you find out you had them the wrong way round?",
    answer: "Deduplicate on the identity the sender gave you, before you reshape anything. Normalising first changes what \"the same event\" means: two genuinely different events can collapse into one once the only field distinguishing them is a field normalisation dropped, and a retry of an event whose payload you rewrote no longer matches the copy you stored. It stays invisible while every event happens to be unique and while your normalisation happens to be lossless, which is exactly why it survives the first round of tests and ships.",
    transfersTo: "Any comparison that happens after a transformation: cache keys computed post-serialisation, diffing after formatting, signature verification after a proxy has rewritten headers, deduplicating log lines after the timestamps were truncated to the second.",
  },
  "order-of-operations-in-money-math": {
    key: "order-of-operations-in-money-math",
    project: "pricing",
    role: "backend",
    question: "When a cart has both a discount and a tax, which one has to be applied first, and how would you know if you got it backwards?",
    answer: "Tax is charged on what the customer actually pays, so it has to be computed after the discount is taken off. Getting it backwards is invisible whenever the discount is zero, because taxing the subtotal and taxing the discounted amount are then the same number — which is exactly why this class of bug survives the first few tests and ships.",
    transfersTo: "Any calculation where one step reduces the base another step is a percentage of: refunds and partial credits, commission on a net figure, tips after a voucher, interest on a balance after a payment posts.",
  },
  "producer-contract-before-consumer": {
    key: "producer-contract-before-consumer",
    project: "pricing",
    role: "frontend",
    question: "You own two things: the cart API that produces a payload, and the receipt that consumes one. Which has to exist first, and why does building the screen first feel faster?",
    answer: "The producer's contract has to be settled before the consumer that reads it. If you build the receipt first, you invent the fields you wish existed, and the cart API then gets shaped to fit a screen rather than to fit the domain — so a field that is present in every fixture you hand-wrote turns out to be optional in production, and the receipt renders undefined for the customers whose carts took the other branch. It feels faster because the screen is the part you can see, and it is the part someone will ask you to demo.",
    transfersTo: "Any two components where one produces what the other reads: an API and its client, a migration and the query that assumes it ran, an event schema and its consumer, a config file and the code that requires a key from it.",
  },
  "establish-the-condition-before-acting-on-it": {
    key: "establish-the-condition-before-acting-on-it",
    project: "safety-gear",
    role: "cv",
    question: "Your system alerts on workers without helmets. What has to be true before the alert can be raised, and why would building the alert first still look like it works?",
    answer: "An alert is a claim about a condition, so the condition has to be established before the alert exists — otherwise the alert is really firing on the last thing you did evaluate, which here is just \"a person is in frame\". It looks correct for as long as everyone in your test footage happens to be non-compliant, and the first compliant worker is the first time you find out.",
    transfersTo: "Anything that acts on a predicate you have not computed yet: authorising before checking a permission, retrying before classifying the error, sending a notification before confirming the state change it describes.",
  },
  "record-before-you-notify": {
    key: "record-before-you-notify",
    project: "safety-gear",
    role: "platform",
    question: "The alert path and the incident log both handle the same event. Which one has to be working first, and what breaks if you wire the alert first?",
    answer: "Record before you notify. An alert fired for an incident with no durable record is unauditable, and being able to say afterwards what happened and when is the entire purpose of a safety system — a notification is not a record. Wiring the alert first works flawlessly in a demo, because in a demo somebody is watching the screen; it fails the first time anyone asks about last Tuesday, and by then the frames are gone.",
    transfersTo: "Any system where a side effect and its audit trail are separate steps: charge then receipt, send then outbox row, deploy then changelog, delete then tombstone, and every case where a retry has to be able to tell whether the first attempt got through.",
  },
};

/** Look up a concept by the key that travelled in the spec and the verdict. */
export function findConcept(key: string): ConceptEntry | null {
  return CONCEPTS[key] ?? null;
}

/**
 * The concept a seat teaches.
 *
 * Used when a student asks for their card before any verdict has been filed — the
 * key would normally arrive in the verdict, and this is how the tool can still name
 * the right lesson (and then withhold it for the right reason) instead of failing
 * with "unknown concept".
 */
export function conceptForSeat(project: string, role?: string): ConceptEntry | null {
  const matches = Object.values(CONCEPTS).filter(
    (c) => c.project === project && (!role || c.role === role),
  );
  return matches[0] ?? null;
}

export function conceptKeys(): string[] {
  return Object.keys(CONCEPTS);
}
