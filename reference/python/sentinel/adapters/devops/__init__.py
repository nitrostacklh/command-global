"""DevOps domain — SENTINEL's flagship adapter.

Heals a live microservice: reads logs, finds the regression in source, patches
it in an isolated sandbox, proves it with the test suite, deploys, and opens a
PR / WeKan card / Slack thread. Wraps the existing sandbox, observability, and
action tooling behind the DomainAdapter interface — no logic is duplicated.
"""
