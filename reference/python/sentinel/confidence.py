"""Explainable confidence scoring — the autonomy gate.

SENTINEL never deploys on gut feeling. Each resolution is scored from
independent, auditable signals; the full breakdown ships with the verdict so
a human (or an auditor, later) can see exactly *why* the agent was allowed —
or not allowed — to act on its own.

The gate is domain-agnostic: the *blast-radius* signal is normalised to [0, 1]
by the domain adapter (files/lines for DevOps, resources/$ for FinOps), so the
same weighted score serves every domain.

Score = weighted sum of component scores in [0, 1]. Resolutions at or above
`settings.confidence_threshold` deploy autonomously; anything below pauses
for human approval.
"""

from __future__ import annotations

from dataclasses import dataclass

from sentinel.config import settings

WEIGHTS = {
    "verification": 0.40,  # did the fix prove out (tests green / simulation clean)?
    "agent": 0.25,         # the agent's own calibrated confidence
    "iterations": 0.20,    # fewer attempts -> more confident diagnosis
    "blast_radius": 0.15,  # smaller changes are safer to auto-deploy
}


@dataclass
class Verdict:
    score: float
    threshold: float
    autonomous: bool
    components: dict[str, dict]

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 3),
            "threshold": self.threshold,
            "autonomous": self.autonomous,
            "components": self.components,
        }


def assess(
    verification_passed: bool,
    agent_confidence: float,
    iterations_used: int,
    blast_score: float,
    blast_reason: str,
) -> Verdict:
    """Combine independent signals into one explainable score.

    `blast_score` is the adapter-normalised risk signal in [0, 1] (1 = safest);
    `blast_reason` is its human-readable justification.
    """
    agent_confidence = min(max(agent_confidence, 0.0), 1.0)
    blast_score = min(max(blast_score, 0.0), 1.0)

    verify_score = 1.0 if verification_passed else 0.0

    # 1 attempt -> 1.0, each extra attempt costs 25%, floor at 0.
    iter_score = max(0.0, 1.0 - 0.25 * max(iterations_used - 1, 0))

    components = {
        "verification": {
            "score": verify_score,
            "weight": WEIGHTS["verification"],
            "reason": "fix verified (all checks green)" if verification_passed else "not verified",
        },
        "agent": {
            "score": agent_confidence,
            "weight": WEIGHTS["agent"],
            "reason": f"agent self-reported confidence {agent_confidence:.2f}",
        },
        "iterations": {
            "score": round(iter_score, 3),
            "weight": WEIGHTS["iterations"],
            "reason": f"converged in {iterations_used} attempt(s)",
        },
        "blast_radius": {
            "score": round(blast_score, 3),
            "weight": WEIGHTS["blast_radius"],
            "reason": blast_reason,
        },
    }

    score = sum(c["score"] * c["weight"] for c in components.values())
    return Verdict(
        score=score,
        threshold=settings.confidence_threshold,
        autonomous=score >= settings.confidence_threshold,
        components=components,
    )
