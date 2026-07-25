"""Central, environment-driven configuration for SENTINEL."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parents[1]


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True)
class Settings:
    # LLM
    model: str = _env("SENTINEL_MODEL", "claude-opus-4-8")

    # Which domain adapter the web commander runs (devops | finops).
    # The engine is domain-agnostic; this only picks the default for the server.
    domain: str = _env("SENTINEL_DOMAIN", "devops")

    # Watched service
    service_url: str = _env("SENTINEL_SERVICE_URL", "http://127.0.0.1:8000")
    service_dir: Path = field(
        default_factory=lambda: (ROOT / _env("SENTINEL_SERVICE_DIR", "service")).resolve()
    )

    # Autonomy policy
    confidence_threshold: float = float(_env("SENTINEL_CONFIDENCE_THRESHOLD", "0.80"))
    max_fix_iterations: int = int(_env("SENTINEL_MAX_FIX_ITERATIONS", "4"))
    max_agent_turns: int = int(_env("SENTINEL_MAX_AGENT_TURNS", "30"))
    poll_interval: float = float(_env("SENTINEL_POLL_INTERVAL_SECONDS", "2.0"))
    approval_timeout: float = float(_env("SENTINEL_APPROVAL_TIMEOUT_SECONDS", "900"))

    # Server
    port: int = int(_env("SENTINEL_PORT", "8100"))

    # Connectors (empty -> mock mode)
    slack_webhook_url: str = _env("SLACK_WEBHOOK_URL")
    wekan_url: str = _env("WEKAN_URL")
    wekan_username: str = _env("WEKAN_USERNAME")
    wekan_password: str = _env("WEKAN_PASSWORD")
    wekan_board_id: str = _env("WEKAN_BOARD_ID")
    wekan_list_id: str = _env("WEKAN_LIST_ID")
    github_pr_enabled: bool = _env("SENTINEL_GITHUB_PR", "0") == "1"

    # Storage
    logs_dir: Path = field(default_factory=lambda: ROOT / "logs")
    sandbox_root: Path = field(default_factory=lambda: ROOT / ".sentinel_sandbox")

    def ensure_dirs(self) -> None:
        (self.logs_dir / "audit").mkdir(parents=True, exist_ok=True)
        self.sandbox_root.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
