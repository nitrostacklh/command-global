"""SENTINEL — Autonomous Incident Commander.

Detects failing services, diagnoses root cause from logs and source, writes a
fix, verifies it in a sandbox until tests pass, gates deployment behind a
confidence score with human-in-the-loop approval, then deploys and reports
(PR + WeKan card + Slack thread) — every step recorded in a replayable,
auditor-legible trace.
"""

__version__ = "1.0.0"
