/**
 * The bundled lessons — GENERATED, do not edit by hand.
 *
 * Written by `scripts/embed_fixtures.mjs` from the `lesson` block of each brief
 * under `fixtures/`, because this app deploys as a lone folder and cannot read that
 * directory at runtime.
 *
 * **No panel below states the principle it is teaching, and the generator asserts
 * that.** A panel carrying a sentence of `concept.answer`, or a clause of
 * `concept.transfers_to`, fails the build — the answer is what the student earns
 * from MCP-3 against their own green tests, and a lesson that pastes it here would
 * be the flashcard, early, from the one process that has never held one.
 *
 * What the panels do instead: set the problem up, make the student commit to an
 * order before they are shown anything, then show the single case that tells the
 * two answers apart. Deriving the rule is the student's job. That is the difference
 * between a lesson and documentation, and it is the reason this stage exists at all.
 *
 * To change any of these, edit the `lesson` block in the brief JSON under
 * `fixtures/` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parseLesson, type Lesson } from './lesson.js';

/** Keyed `project/role`. */
export const LESSON_JSON: Record<string, string> = {
  "event-ingest/data": `{
  "title": "Two passes over the same stream",
  "panels": [
    {
      "id": "setup",
      "kind": "setup",
      "title": "Both passes have to happen. Neither one announces its turn",
      "body": "Events arrive with duplicates in them, and they arrive in shapes the warehouse cannot query. So there is a dedupe pass and a normalise pass, and both have to run before anything downstream reads a row.",
      "figure": {
        "kind": "unordered",
        "items": [
          "drop the duplicates",
          "normalise the shape"
        ]
      }
    },
    {
      "id": "commit",
      "kind": "commit",
      "title": "Choose, and then read on",
      "body": "Pick the order you would write. There is a genuine argument for each — deduping clean uniform records really is easier — so commit before you look.",
      "choices": [
        {
          "id": "dedupe_first",
          "label": "Dedupe first — on the identity the sender gave you"
        },
        {
          "id": "normalise_first",
          "label": "Normalise first — then dedupe clean, uniform records"
        }
      ]
    },
    {
      "id": "witness",
      "kind": "witness",
      "title": "Two batches, and a row count that does not raise anything",
      "body": "1,000 events in, both orders.",
      "cases": [
        {
          "input": "A batch where every event is genuinely distinct, and normalisation touches no field you compare on",
          "results": {
            "dedupe_first": "1,000 out",
            "normalise_first": "1,000 out"
          },
          "outcome": "agree"
        },
        {
          "input": "A batch where two real events differ only in a field normalisation rounds — a timestamp truncated to the second",
          "results": {
            "dedupe_first": "1,000 out",
            "normalise_first": "999 out — two real events collapsed into one"
          },
          "outcome": "diverge"
        }
      ],
      "note": "There is no error, no warning, and no rejected row. The count is quietly one lower, and the event you dropped was real. Nothing in your pipeline is going to tell you which one it was."
    },
    {
      "id": "generalise",
      "kind": "generalise",
      "title": "Where have you seen this shape before?",
      "body": "Take the pipeline out of it. Something compared two things, and something else had already rewritten them both.",
      "prompt": "Before you open the flashcard: name two other places in your code where a comparison happens after a transformation. For each, ask what the transformation is allowed to change — and whether anyone wrote that down."
    }
  ]
}`,
  "pricing/backend": `{
  "title": "Two lines, and nothing says which runs first",
  "panels": [
    {
      "id": "setup",
      "kind": "setup",
      "title": "The decision hiding inside two lines of arithmetic",
      "body": "A cart total needs two things done to it: a percentage discount comes off, and tax goes on. Each is one line. Neither line mentions the other, and the code compiles either way — so the order is a decision you are making, not one the language is making for you.",
      "figure": {
        "kind": "unordered",
        "items": [
          "take the discount off",
          "add the tax on"
        ]
      }
    },
    {
      "id": "commit",
      "kind": "commit",
      "title": "Choose, and then read on",
      "body": "Pick the order you would write. Say it out loud, or write it down. The next panel only teaches you anything if you have committed to an answer before you see it.",
      "choices": [
        {
          "id": "discount_first",
          "label": "Discount first — tax whatever is left"
        },
        {
          "id": "tax_first",
          "label": "Tax first — then take the discount off"
        }
      ]
    },
    {
      "id": "witness",
      "kind": "witness",
      "title": "The cart that tells you nothing, and the cart that tells you everything",
      "body": "Two carts. Both orders. Four numbers.",
      "cases": [
        {
          "input": "$100 of goods · no discount code · 20% tax",
          "results": {
            "discount_first": "$120.00",
            "tax_first": "$120.00"
          },
          "outcome": "agree"
        },
        {
          "input": "$100 of goods · 40%-off code · 20% tax",
          "results": {
            "discount_first": "$72.00",
            "tax_first": "$80.00"
          },
          "outcome": "diverge"
        }
      ],
      "note": "The first cart cannot tell the two orders apart — and most carts are the first cart. Whichever order you chose, it passed. That is the property worth noticing here, more than the $8."
    },
    {
      "id": "generalise",
      "kind": "generalise",
      "title": "Where have you seen this shape before?",
      "body": "Strip the money out of it. You have just watched one step change the number a later step is a percentage of, and watched that difference stay invisible until one specific input showed up.",
      "prompt": "Before you open the flashcard: name two other calculations you have written where one step reduces the base another step is a percentage of. The card will tell you whether you found the general shape or two more examples of the same one."
    }
  ]
}`,
  "pricing/frontend": `{
  "title": "You own both ends of one arrow",
  "panels": [
    {
      "id": "setup",
      "kind": "setup",
      "title": "Nobody is going to hand you the interface",
      "body": "The cart API produces a payload. The receipt renders one. You own both, which means no other engineer is going to hand you a contract and no other engineer is going to stop you starting at whichever end you like.",
      "figure": {
        "kind": "unordered",
        "items": [
          "the cart API that produces the payload",
          "the receipt that renders it"
        ]
      }
    },
    {
      "id": "commit",
      "kind": "commit",
      "title": "Choose, and then read on",
      "body": "Pick where you would start. Be honest about which one you would actually reach for on a Monday, not which one sounds more disciplined.",
      "choices": [
        {
          "id": "producer_first",
          "label": "Settle what the API returns, then build the receipt against it"
        },
        {
          "id": "consumer_first",
          "label": "Build the receipt, then make the API return what it needs"
        }
      ]
    },
    {
      "id": "witness",
      "kind": "witness",
      "title": "Two carts: one you wrote, one a customer wrote",
      "body": "Same receipt. Same API. Two payloads.",
      "cases": [
        {
          "input": "A cart you hand-wrote as a fixture — every field present, because you typed them all",
          "results": {
            "producer_first": "renders",
            "consumer_first": "renders"
          },
          "outcome": "agree"
        },
        {
          "input": "A production cart from a customer who used no discount code, so \`discount\` was never set",
          "results": {
            "producer_first": "renders — the contract said the field was optional, so the receipt was written to handle it",
            "consumer_first": "renders \`undefined\` — the field was in every fixture, so nothing ever said it was optional"
          },
          "outcome": "diverge"
        }
      ],
      "note": "Every fixture you write yourself is the first cart. You cannot write the second cart, because the whole problem is that you did not think of it."
    },
    {
      "id": "generalise",
      "kind": "generalise",
      "title": "Where have you seen this shape before?",
      "body": "Take the screen out of it. Two components, one arrow between them, and a question about which end you build from.",
      "prompt": "Before you open the flashcard: name two other pairs in your own code where one side produces what the other reads. For each, say which end you built first — and whether you found out the hard way."
    }
  ]
}`,
  "safety-gear/cv": `{
  "title": "An alert is a claim about a condition",
  "panels": [
    {
      "id": "setup",
      "kind": "setup",
      "title": "Two things have to work. Only one of them is visible",
      "body": "The system watches a feed and raises an alert when someone is working without a helmet. That needs something to decide whether a helmet is present, and something to raise the alert. The alert is the part you can demo.",
      "figure": {
        "kind": "unordered",
        "items": [
          "decide whether the helmet is there",
          "raise the alert"
        ]
      }
    },
    {
      "id": "commit",
      "kind": "commit",
      "title": "Choose, and then read on",
      "body": "Pick the order you would build in. The second option is the one most people actually do, because a person detector is already in the box and a helmet classifier is a week of work.",
      "choices": [
        {
          "id": "condition_first",
          "label": "Detect the helmet first — alert on what the detector says"
        },
        {
          "id": "alert_first",
          "label": "Wire the alert on the person detector now, add the helmet check after"
        }
      ]
    },
    {
      "id": "witness",
      "kind": "witness",
      "title": "Your test footage, and a compliant shift",
      "body": "Same site, same camera, two days.",
      "cases": [
        {
          "input": "The test footage you recorded — nobody on it is wearing a helmet",
          "results": {
            "condition_first": "an alert for every worker",
            "alert_first": "an alert for every worker"
          },
          "outcome": "agree"
        },
        {
          "input": "A shift where the crew is compliant and every worker has a helmet on",
          "results": {
            "condition_first": "no alerts",
            "alert_first": "an alert for every worker on site"
          },
          "outcome": "diverge"
        }
      ],
      "note": "Built the second way, the alert is not firing on \\"no helmet\\". It is firing on \\"a person is in frame\\" — the last thing you actually evaluated. Your test footage could never have told you, because on that footage those two are the same set."
    },
    {
      "id": "generalise",
      "kind": "generalise",
      "title": "Where have you seen this shape before?",
      "body": "Take the camera out of it. Something acted on a condition, and the thing that establishes that condition was not built yet.",
      "prompt": "Before you open the flashcard: name two other places in your code that act on a predicate nothing has computed yet. For each, work out what the code is *actually* keying on instead."
    }
  ]
}`,
  "safety-gear/platform": `{
  "title": "One event, two destinations",
  "panels": [
    {
      "id": "setup",
      "kind": "setup",
      "title": "The same incident has to reach a person and reach storage",
      "body": "An incident happens. It has to reach somebody — a notification — and it has to reach durable storage — a record. Two paths off one event, and nothing forces you to build them in a particular order.",
      "figure": {
        "kind": "unordered",
        "items": [
          "write the incident to storage",
          "send the notification"
        ]
      }
    },
    {
      "id": "commit",
      "kind": "commit",
      "title": "Choose, and then read on",
      "body": "Pick which path you would get working first. Notice which one you would be able to show somebody at the end of the day.",
      "choices": [
        {
          "id": "record_first",
          "label": "Record first — notify off the stored incident"
        },
        {
          "id": "notify_first",
          "label": "Notify first — add the record once alerting works"
        }
      ]
    },
    {
      "id": "witness",
      "kind": "witness",
      "title": "The demo, and the question three weeks later",
      "body": "Same system, two moments.",
      "cases": [
        {
          "input": "A demo: an incident happens while somebody is watching the screen",
          "results": {
            "record_first": "the alert appears",
            "notify_first": "the alert appears"
          },
          "outcome": "agree"
        },
        {
          "input": "An auditor asks what happened on the night shift last Tuesday, and when",
          "results": {
            "record_first": "the incident, its timestamp, and the frames it was raised from",
            "notify_first": "a notification nobody kept, and frames that rolled off days ago"
          },
          "outcome": "diverge"
        }
      ],
      "note": "In a demo somebody is always watching the screen, which is exactly the condition under which these two designs are indistinguishable."
    },
    {
      "id": "generalise",
      "kind": "generalise",
      "title": "Where have you seen this shape before?",
      "body": "Take the safety system out of it. A side effect happened, and the trail proving it happened was a separate step somebody sequenced second.",
      "prompt": "Before you open the flashcard: name two other places where a side effect and its audit trail are separate steps. For each, ask whether a retry could tell that the first attempt got through."
    }
  ]
}`,
};

/** The concept each seat's lesson teaches, so a caller can name it without parsing. */
export const LESSON_CONCEPT: Record<string, string> = {
  "event-ingest/data": "deduplicate-before-you-transform",
  "pricing/backend": "order-of-operations-in-money-math",
  "pricing/frontend": "producer-contract-before-consumer",
  "safety-gear/cv": "establish-the-condition-before-acting-on-it",
  "safety-gear/platform": "record-before-you-notify",
};

const cache = new Map<string, Lesson | null>();

/**
 * The lesson for one seat, or `null` when that seat has none written yet.
 *
 * Null is a real answer here, not a failure. Gap 14 is honest that only some of the
 * catalog's roles are playable, and a seat with a brief but no lesson should say so
 * rather than invent one.
 */
export function bundledLesson(project: string, role: string): Lesson | null {
  const seat = `${project}/${role}`;
  if (cache.has(seat)) return cache.get(seat) ?? null;

  const raw = LESSON_JSON[seat];
  if (!raw) {
    cache.set(seat, null);
    return null;
  }
  const parsed = parseLesson({
    ...JSON.parse(raw),
    schema: 'mentor.lesson/v1',
    project,
    role,
    conceptKey: LESSON_CONCEPT[seat] ?? '',
  });
  cache.set(seat, parsed);
  return parsed;
}

/** Every seat that has a lesson, as `project/role`. */
export function lessonSeats(): string[] {
  return Object.keys(LESSON_JSON);
}
