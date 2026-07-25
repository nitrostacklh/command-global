/**
 * The bundled catalog and briefs — GENERATED, do not edit by hand.
 *
 * Written by `scripts/embed_fixtures.mjs` from the JSON in `fixtures/`, because
 * this app deploys as a lone folder and cannot read that directory at runtime.
 *
 * **The concept answers are not here, and that is the point.** Each brief below has
 * had `concept.answer` and `concept.transfers_to` removed; they live only in
 * MCP-3 (`mcp-profile/src/concepts/`), which releases one against a student's real
 * test output. A bug in this app cannot leak what the student is meant to earn,
 * because the string is not in this process. The generator asserts the removal in
 * both directions and `npm run fixture:check` fails if either side drifts.
 *
 * To change any of these, edit the JSON under `fixtures/` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parseCatalog, type Catalog } from './catalog.js';
import { parseBrief, type Brief } from './brief.js';

export const CATALOG_JSON = `{
  "schema": "mentor.catalog/v1",
  "name": "MENTOR curated catalog",
  "roles": [
    {
      "key": "backend",
      "title": "Backend engineer",
      "blurb": "You own logic other services call and then trust. Nobody reads your code — they read a number on a screen and decide whether to believe the company. Your failures are quiet, which is what makes them expensive.",
      "you_tend_to_own": "validation, business rules, and the figures other teams report off"
    },
    {
      "key": "frontend",
      "title": "Frontend engineer",
      "blurb": "You own the two edges of the system a human actually touches: what they hand you, and what you show them afterwards. Everything you display is a claim, and you are usually not the one who computed it.",
      "you_tend_to_own": "input contracts, and the surfaces that render somebody else's output"
    },
    {
      "key": "cv",
      "title": "Computer-vision engineer",
      "blurb": "You own a decision made from pixels. The model is rarely the hard part — the hard part is deciding what counts as a detection, and what you do when you are not sure.",
      "you_tend_to_own": "detection, the confidence threshold, and when to escalate to a human"
    },
    {
      "key": "platform",
      "title": "Platform engineer",
      "blurb": "You own the parts nobody thanks you for until they are missing: where the data comes in, where it is kept, and whether anyone can reconstruct afterwards what actually happened.",
      "you_tend_to_own": "capture, durable storage, and the audit trail"
    },
    {
      "key": "data",
      "title": "Data engineer",
      "blurb": "You move data and reshape it, and you have to be able to prove later what it looked like on the way through. Ordering and idempotency are not features of the job — they are the job.",
      "you_tend_to_own": "ingest, deduplication, normalisation, and the write path"
    }
  ],
  "domains": [
    {
      "key": "web-service",
      "title": "Web service / API",
      "blurb": "Something other teams call over HTTP and then depend on. The work is mostly correctness under inputs you did not choose, and the failures are quiet — a wrong number ships and nobody notices for a week."
    },
    {
      "key": "vision",
      "title": "Vision system",
      "blurb": "A camera, a model, and a decision. The hard part is almost never the model: it is deciding what counts as a detection, and what you do when you are not sure."
    },
    {
      "key": "data-pipeline",
      "title": "Data pipeline",
      "blurb": "Move data, reshape it, and be able to prove afterwards what it looked like on the way through. Ordering and idempotency are the entire job."
    }
  ],
  "projects": [
    {
      "key": "pricing",
      "domain": "web-service",
      "title": "Checkout pricing service",
      "why_exemplary": "Every commerce company has this exact function, and it is the one place where an off-by-a-little bug turns into refunds and a finance escalation rather than a stack trace. It is also small enough to hold in your head, which is what makes the ordering mistake inside it so instructive.",
      "components": [
        "cart API",
        "validate",
        "discount",
        "tax",
        "total",
        "receipt",
        "payment gateway"
      ],
      "roles": [
        {
          "key": "backend",
          "title": "Backend engineer — pricing",
          "one_liner": "You own the four steps between a cart and a number finance reports off.",
          "briefed": true,
          "demo": true
        },
        {
          "key": "frontend",
          "title": "Frontend engineer — checkout",
          "one_liner": "You own the cart the pricing service is called with, and the receipt the customer reads.",
          "briefed": true,
          "demo": false
        }
      ]
    },
    {
      "key": "safety-gear",
      "domain": "vision",
      "title": "Site safety-gear check",
      "why_exemplary": "A real deployment shape: a camera on a site entrance, a decision per person, and a consequence for being wrong in either direction. False negatives are a safety incident and false positives get the system switched off by the people it is meant to protect — so the interesting engineering is entirely in the ordering of the checks.",
      "components": [
        "camera feed",
        "detect person",
        "check helmet",
        "alert",
        "incident log",
        "dashboard"
      ],
      "roles": [
        {
          "key": "cv",
          "title": "CV engineer — detection and decision",
          "one_liner": "You own who is in frame, whether they are wearing a helmet, and when to raise an alert.",
          "briefed": true,
          "demo": true
        },
        {
          "key": "platform",
          "title": "Platform engineer — capture and audit",
          "one_liner": "You own the camera feed the detector reads, the incident log it writes to, and the screen an auditor opens.",
          "briefed": true,
          "demo": false
        }
      ]
    },
    {
      "key": "event-ingest",
      "domain": "data-pipeline",
      "title": "Idempotent event ingest",
      "why_exemplary": "The canonical distributed-systems lesson in a form small enough to finish: the same event arrives twice and your job is for that to be boring. Almost every candidate can describe idempotency and almost none have implemented it.",
      "components": [
        "receive",
        "deduplicate",
        "normalise",
        "persist",
        "replay"
      ],
      "roles": [
        {
          "key": "data",
          "title": "Data engineer — ingest",
          "one_liner": "You own everything between the webhook handing you an event and the row that lands in the table.",
          "briefed": true,
          "demo": true
        }
      ]
    }
  ]
}`;

/** Keyed `project/role`. Answers stripped — see the header. */
export const BRIEF_JSON: Record<string, string> = {
  "event-ingest/data": `{
  "schema": "mentor.brief/v1",
  "project": "event-ingest",
  "role": "data",
  "title": "Data engineer — ingest",
  "you_are": "You own everything between the webhook handing you an event and the row that lands in the table. The sender will deliver the same event twice — not as an edge case, as normal operation — and your job is for that to be boring.",
  "stakes": "A duplicate that gets through is a double charge, a double email, or a metric that is quietly wrong for a quarter. A genuine event you discarded as a duplicate is worse: nobody ever notices, because the evidence of it is the thing you deleted.",
  "deliverable": "ingest(event) → the row that was written, or the row that already existed. Called twice with the same event, it writes once.",
  "concept": {
    "key": "deduplicate-before-you-transform",
    "question": "Deduplicating and normalising both have to happen. Which one goes first, and how would you find out you had them the wrong way round?"
  },
  "owns": [
    {
      "component": "deduplicate",
      "intent": "Decide whether this event has been seen before, using the id the sender supplied and nothing derived.",
      "why_yours": "You are the only component that sees the event as it arrived, and once anything reshapes it the sender's identity is no longer recoverable."
    },
    {
      "component": "normalise",
      "intent": "Reshape a known-new event into the table's column types, applying defaults for absent optional fields.",
      "why_yours": "The table's shape is yours, so the mapping onto it is yours."
    },
    {
      "component": "persist",
      "intent": "Write exactly one row, and make the write itself idempotent so a crash between dedupe and write cannot lose or duplicate.",
      "why_yours": "You own the write path, and idempotency that is only enforced in memory is not enforced."
    }
  ],
  "given": [
    {
      "component": "receive",
      "owned_by": "platform",
      "contract": "Hands you one event as { id, type, payload, sentAt }. \`id\` is the sender's identifier and is stable across retries. It will call you again on any non-2xx."
    },
    {
      "component": "replay",
      "owned_by": "platform",
      "contract": "Re-delivers historical events through the same entry point you already handle. It assumes your ingest is idempotent; it does not check."
    }
  ],
  "acceptance": [
    {
      "id": "a1",
      "given": "the same event delivered twice",
      "must": "exactly one row"
    },
    {
      "id": "a2",
      "given": "two different events whose payloads are identical but whose ids differ",
      "must": "two rows"
    },
    {
      "id": "a3",
      "given": "an event with its optional fields absent",
      "must": "one row, with defaults applied and the sender's id preserved"
    }
  ],
  "entry": "build/ingest.js",
  "tests": "build/ingest.test.js"
}`,
  "pricing/backend": `{
  "schema": "mentor.brief/v1",
  "project": "pricing",
  "role": "backend",
  "title": "Backend engineer — pricing",
  "you_are": "You own the pricing function. Finance reports off your numbers, support answers tickets about your numbers, and when a customer says \\"you charged me wrong,\\" it is your function they are talking about.",
  "stakes": "You are not doing an exercise. You own a thing other people depend on, and the people who depend on it will not read your code — they will read a total on an invoice and decide whether to trust the company.",
  "deliverable": "computeTotal(items, discountRate, taxRate) → the order total, rounded to 2dp.",
  "concept": {
    "key": "order-of-operations-in-money-math",
    "question": "When a cart has both a discount and a tax, which one has to be applied first, and how would you know if you got it backwards?"
  },
  "owns": [
    {
      "component": "validate",
      "intent": "Reject malformed carts before any money is computed.",
      "why_yours": "Nobody downstream can defend against a cart you already accepted."
    },
    {
      "component": "discount",
      "intent": "Apply the discount code to the subtotal.",
      "why_yours": "The discount rules are pricing policy, and pricing policy lives with the pricing service."
    },
    {
      "component": "tax",
      "intent": "Apply tax to the amount the customer is actually paying.",
      "why_yours": "Tax depends on the discounted figure, so it cannot be computed anywhere that does not already know the discount."
    },
    {
      "component": "total",
      "intent": "Round once, at the end, and return the number the customer is charged.",
      "why_yours": "Rounding in more than one place is how two systems end up a cent apart, so exactly one component may do it — this one."
    }
  ],
  "given": [
    {
      "component": "cart API",
      "owned_by": "frontend",
      "contract": "Gives you items as [{ sku, qty, unitPrice }]. unitPrice is already in minor units and is never null."
    },
    {
      "component": "payment gateway",
      "owned_by": "payments",
      "contract": "Takes the total you return, in minor units. It will not re-derive it, and it will not check it."
    }
  ],
  "acceptance": [
    {
      "id": "a1",
      "given": "$100 cart, 0% discount, 20% tax",
      "must": "120.00"
    },
    {
      "id": "a2",
      "given": "$100 cart, 0% discount, 0% tax",
      "must": "100.00"
    },
    {
      "id": "a3",
      "given": "$100 cart, 40% discount, 20% tax",
      "must": "72.00"
    }
  ],
  "entry": "build/pricing.js",
  "tests": "build/pricing.test.js"
}`,
  "pricing/frontend": `{
  "schema": "mentor.brief/v1",
  "project": "pricing",
  "role": "frontend",
  "title": "Frontend engineer — checkout",
  "you_are": "You own both ends of the checkout: the cart you hand to the pricing service, and the receipt the customer reads afterwards. You do not compute a single number on this project — you produce the input and you present somebody else's output.",
  "stakes": "The receipt is the only artifact of this whole system a customer ever sees. If it disagrees with what their card was charged, they do not file a bug — they file a chargeback, and by the time anyone looks the money has already moved.",
  "deliverable": "buildCart(lineItems) → the cart payload pricing is called with, and renderReceipt(cart, pricedTotal) → the lines the customer reads.",
  "concept": {
    "key": "producer-contract-before-consumer",
    "question": "You own two things: the cart API that produces a payload, and the receipt that consumes one. Which has to exist first, and why does building the screen first feel faster?"
  },
  "owns": [
    {
      "component": "cart API",
      "intent": "Produce the cart payload pricing is called with: items as [{ sku, qty, unitPrice }], unit prices in minor units, never null.",
      "why_yours": "You are the only component that knows what the customer actually put in the basket, so nobody downstream can reconstruct it if you get it wrong."
    },
    {
      "component": "receipt",
      "intent": "Render the priced total and the lines behind it, using only numbers the pricing service returned.",
      "why_yours": "The receipt is a presentation of a decision made elsewhere, and presentation is yours."
    }
  ],
  "given": [
    {
      "component": "total",
      "owned_by": "backend",
      "contract": "Returns the order total in minor units, already rounded once. It is authoritative — you display it, you never re-derive it."
    }
  ],
  "acceptance": [
    {
      "id": "a1",
      "given": "a cart with two line items, quantities 2 and 1",
      "must": "a payload with two items and the quantities preserved"
    },
    {
      "id": "a2",
      "given": "a line item with no discount applied and a priced total of 12000",
      "must": "a receipt showing 120.00, taken from the priced total and not recomputed"
    },
    {
      "id": "a3",
      "given": "an empty cart",
      "must": "a payload with zero items, and a receipt that says so rather than rendering an empty total"
    }
  ],
  "entry": "build/checkout.js",
  "tests": "build/checkout.test.js"
}`,
  "safety-gear/cv": `{
  "schema": "mentor.brief/v1",
  "project": "safety-gear",
  "role": "cv",
  "title": "CV engineer — detection and decision",
  "you_are": "You own the decision. A camera watches a site entrance, and you are the one who decides whether the person walking through it is wearing a helmet — and whether that is worth interrupting somebody over.",
  "stakes": "Both directions of being wrong cost something real. Miss a bare head and you have a safety incident nobody was warned about. Alert on a compliant worker often enough and the site supervisor mutes the system, at which point you have built nothing.",
  "deliverable": "check_frame(frame) → zero or more alerts, one per person who is in frame and not wearing a helmet.",
  "concept": {
    "key": "establish-the-condition-before-acting-on-it",
    "question": "Your system alerts on workers without helmets. What has to be true before the alert can be raised, and why would building the alert first still look like it works?"
  },
  "owns": [
    {
      "component": "detect person",
      "intent": "Find the people in the frame. No people, no decision to make.",
      "why_yours": "Every downstream decision is per-person, so the set of people is the input to all of them."
    },
    {
      "component": "check helmet",
      "intent": "For each person found, decide whether they are wearing a helmet — and admit when the answer is uncertain.",
      "why_yours": "This is the actual judgement the system exists to make. It cannot be delegated to a threshold somebody else owns."
    },
    {
      "component": "alert",
      "intent": "Raise one alert per person who is in frame and established as not wearing a helmet.",
      "why_yours": "The alert is only as trustworthy as the check behind it, so whoever owns the check owns the alert."
    }
  ],
  "given": [
    {
      "component": "camera feed",
      "owned_by": "platform",
      "contract": "Hands you decoded frames as BGR arrays at 5fps. Frames may be dropped; they are never out of order."
    },
    {
      "component": "incident log",
      "owned_by": "platform",
      "contract": "Accepts an alert and stores it durably. It will not deduplicate for you."
    }
  ],
  "acceptance": [
    {
      "id": "a1",
      "given": "a worker wearing a helmet walks through frame",
      "must": "0 alerts"
    },
    {
      "id": "a2",
      "given": "a worker with no helmet walks through frame",
      "must": "exactly 1 alert"
    },
    {
      "id": "a3",
      "given": "an empty frame",
      "must": "0 alerts"
    }
  ],
  "entry": "detect.py",
  "tests": "test_safety.py"
}`,
  "safety-gear/platform": `{
  "schema": "mentor.brief/v1",
  "project": "safety-gear",
  "role": "platform",
  "title": "Platform engineer — capture and audit",
  "you_are": "You own the frames coming in, the incident log everything is written to, and the screen an auditor opens six weeks later. The CV engineer decides whether someone is compliant; you are the reason anybody can check that decision afterwards.",
  "stakes": "This is a safety system on a real site. The question it will eventually be asked is not \\"is it running\\" — it is \\"show me what happened on the fourteenth\\". If the answer is a notification that has already scrolled away, the system was decorative.",
  "deliverable": "A camera feed the detector can read frame by frame, an incident log that is durable before anything is notified, and a dashboard that reads only from that log.",
  "concept": {
    "key": "record-before-you-notify",
    "question": "The alert path and the incident log both handle the same event. Which one has to be working first, and what breaks if you wire the alert first?"
  },
  "owns": [
    {
      "component": "camera feed",
      "intent": "Deliver frames to the detector at a steady rate, and drop rather than queue when it falls behind.",
      "why_yours": "Nothing downstream can recover a frame you never captured, and nothing downstream can survive a queue you let grow without bound."
    },
    {
      "component": "incident log",
      "intent": "Persist one durable record per decision — before anyone is told about it — with the frame reference and the reason.",
      "why_yours": "You own storage, and the audit trail is the only part of this system that has to still exist in six weeks."
    },
    {
      "component": "dashboard",
      "intent": "Show incidents by reading the log, and nothing but the log.",
      "why_yours": "A dashboard that reads from anywhere else is a second source of truth, and the two will disagree exactly when it matters."
    }
  ],
  "given": [
    {
      "component": "detect person",
      "owned_by": "cv",
      "contract": "Given a frame, returns the people found in it. It will not retry, and it will not persist anything."
    },
    {
      "component": "alert",
      "owned_by": "cv",
      "contract": "Called once per established non-compliance. It notifies and returns; it does not write to your log, and it does not know whether you did."
    }
  ],
  "acceptance": [
    {
      "id": "a1",
      "given": "a non-compliance is detected",
      "must": "a durable incident row exists before the alert call is made"
    },
    {
      "id": "a2",
      "given": "the process is killed immediately after an alert fires",
      "must": "the incident is still in the log on restart"
    },
    {
      "id": "a3",
      "given": "the dashboard is opened with the detector stopped",
      "must": "every previously recorded incident still renders"
    }
  ],
  "entry": "capture.py",
  "tests": "test_platform.py"
}`,
};

let catalogCache: Catalog | null = null;
export function bundledCatalog(): Catalog {
  catalogCache ??= parseCatalog(CATALOG_JSON);
  return catalogCache;
}

const briefCache = new Map<string, Brief | null>();

/** The brief for one seat, or `null` when that role has none written yet. */
export function bundledBrief(project: string, role: string): Brief | null {
  const seat = `${project}/${role}`;
  if (briefCache.has(seat)) return briefCache.get(seat) ?? null;
  const raw = BRIEF_JSON[seat];
  const brief = raw ? parseBrief(raw) : null;
  briefCache.set(seat, brief);
  return brief;
}

/** Every seat that has a brief, for the honesty line in `list_roles`. */
export function briefedSeats(): { project: string; role: string }[] {
  return Object.keys(BRIEF_JSON).map((seat) => {
    const [project, role] = seat.split('/');
    return { project, role };
  });
}
