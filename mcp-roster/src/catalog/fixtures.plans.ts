/**
 * The bundled demo plans — GENERATED, do not edit by hand.
 *
 * Written by `scripts/embed_fixtures.mjs` from each project's plan.lumina.json.
 *
 * These are the designs behind the worked examples, so `check_scope` and
 * `checkpoint_spec` run with nothing uploaded. A student's real plan arrives as a
 * tool argument and takes precedence over every one of these.
 *
 * The matching build histories are deliberately **not** here — see the note in
 * `scripts/embed_fixtures.mjs`. What the student actually did belongs to MCP-2.
 */

/* eslint-disable */
import { parsePlan, type Plan } from '../shared/plan.js';

export const DEMO_PLAN_JSON: Record<string, string> = {
  "event-ingest": `{
  "schema": "lumina.plan/v1",
  "name": "Idempotent event ingest",
  "planId": "wf-event-ingest-fixture",
  "nodes": [
    {
      "id": "n-receive",
      "type": "component",
      "label": "receive",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "receive",
        "component": "receive",
        "intent": "The webhook hands me the event as it arrived. Platform owns this — my boundary."
      }
    },
    {
      "id": "n-dedupe",
      "type": "component",
      "label": "deduplicate",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "deduplicate",
        "component": "deduplicate",
        "intent": "Have I seen this id before? Must run on the event AS SENT, before anything reshapes it."
      }
    },
    {
      "id": "n-normalise",
      "type": "component",
      "label": "normalise",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "normalise",
        "component": "normalise",
        "intent": "Map a known-new event onto the table's columns and fill in defaults."
      }
    },
    {
      "id": "n-persist",
      "type": "component",
      "label": "persist",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "persist",
        "component": "persist",
        "intent": "One row, written idempotently so a crash cannot duplicate it."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-receive",
      "target": "n-dedupe",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-dedupe",
      "target": "n-normalise",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-normalise",
      "target": "n-persist",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-receive",
    "n-dedupe",
    "n-normalise",
    "n-persist"
  ],
  "entry": [
    "n-receive"
  ],
  "terminal": [
    "n-persist"
  ],
  "cyclic": false,
  "warnings": []
}`,
  "pricing": `{
  "schema": "lumina.plan/v1",
  "name": "Pricing service",
  "planId": "wf-pricing-fixture",
  "nodes": [
    {
      "id": "n-validate",
      "type": "component",
      "label": "validate",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "validate",
        "component": "validate",
        "intent": "Reject malformed carts before any money is computed."
      }
    },
    {
      "id": "n-discount",
      "type": "component",
      "label": "discount",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "discount",
        "component": "discount",
        "intent": "Apply the discount code to the subtotal."
      }
    },
    {
      "id": "n-tax",
      "type": "component",
      "label": "tax",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "tax",
        "component": "tax",
        "intent": "Tax the DISCOUNTED amount. Must run after discount."
      }
    },
    {
      "id": "n-total",
      "type": "component",
      "label": "total",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "total",
        "component": "total",
        "intent": "Sum and round to 2dp."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-validate",
      "target": "n-discount",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-discount",
      "target": "n-tax",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-tax",
      "target": "n-total",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-validate",
    "n-discount",
    "n-tax",
    "n-total"
  ],
  "entry": [
    "n-validate"
  ],
  "terminal": [
    "n-total"
  ],
  "cyclic": false,
  "warnings": []
}`,
  "safety-gear": `{
  "schema": "lumina.plan/v1",
  "name": "Site safety-gear check",
  "planId": "wf-safety-gear-fixture",
  "nodes": [
    {
      "id": "n-camera",
      "type": "component",
      "label": "camera feed",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "camera feed",
        "component": "camera feed",
        "intent": "Frames arrive here. Platform owns this — I only read it."
      }
    },
    {
      "id": "n-person",
      "type": "component",
      "label": "detect person",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "detect person",
        "component": "detect person",
        "intent": "Find the people in the frame. No people, no decision to make."
      }
    },
    {
      "id": "n-helmet",
      "type": "component",
      "label": "check helmet",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "check helmet",
        "component": "check helmet",
        "intent": "Per person: helmet or no helmet. MUST run before anything alerts."
      }
    },
    {
      "id": "n-alert",
      "type": "component",
      "label": "alert",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "alert",
        "component": "alert",
        "intent": "One alert per person established as not wearing a helmet."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-camera",
      "target": "n-person",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-person",
      "target": "n-helmet",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-helmet",
      "target": "n-alert",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-camera",
    "n-person",
    "n-helmet",
    "n-alert"
  ],
  "entry": [
    "n-camera"
  ],
  "terminal": [
    "n-alert"
  ],
  "cyclic": false,
  "warnings": []
}`,
};

const cache = new Map<string, Plan>();

/** The bundled design for a project, or `null` when there is no worked example. */
export function bundledPlan(project: string): Plan | null {
  if (cache.has(project)) return cache.get(project) ?? null;
  const raw = DEMO_PLAN_JSON[project];
  if (!raw) return null;
  const plan = parsePlan(raw);
  cache.set(project, plan);
  return plan;
}

/** Projects with a bundled design, so a tool can say which ones need no upload. */
export function projectsWithBundledPlans(): string[] {
  return Object.keys(DEMO_PLAN_JSON);
}
