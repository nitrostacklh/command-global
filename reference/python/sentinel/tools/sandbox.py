"""Isolated verification sandbox.

Each incident gets a full copy of the watched service. The agent's patches
are applied to the copy, the copy's test suite is run there, and only a
green sandbox is ever promoted back to the live service directory.
"""

from __future__ import annotations

import difflib
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from sentinel.config import settings

_IGNORE = shutil.ignore_patterns(
    "__pycache__", ".pytest_cache", "logs", "*.pyc", ".git", ".venv"
)


@dataclass
class TestResult:
    passed: bool
    exit_code: int
    summary: str
    output: str


@dataclass
class Sandbox:
    incident_id: str
    path: Path = field(init=False)
    touched_files: set[str] = field(default_factory=set)

    def __post_init__(self) -> None:
        self.path = settings.sandbox_root / self.incident_id
        if self.path.exists():
            shutil.rmtree(self.path)
        shutil.copytree(settings.service_dir, self.path, ignore=_IGNORE)

    # ── file ops (all paths relative to the sandbox root) ────────────────
    def _resolve(self, rel_path: str) -> Path:
        p = (self.path / rel_path).resolve()
        if not p.is_relative_to(self.path):
            raise ValueError(f"path escapes sandbox: {rel_path}")
        return p

    def list_files(self) -> list[str]:
        skip = {"__pycache__", ".pytest_cache", "logs", ".git", ".venv"}
        out = []
        for p in sorted(self.path.rglob("*")):
            if p.is_file() and not (set(p.relative_to(self.path).parts) & skip):
                out.append(p.relative_to(self.path).as_posix())
        return out

    def read_file(self, rel_path: str) -> str:
        text = self._resolve(rel_path).read_text(encoding="utf-8")
        lines = text.splitlines()
        width = len(str(len(lines)))
        return "\n".join(f"{i + 1:>{width}}| {line}" for i, line in enumerate(lines))

    def search(self, pattern: str) -> list[dict]:
        rx = re.compile(pattern)
        hits = []
        for rel in self.list_files():
            if not rel.endswith((".py", ".ini", ".txt", ".toml", ".cfg", ".md")):
                continue
            try:
                for n, line in enumerate(self._resolve(rel).read_text(encoding="utf-8").splitlines(), 1):
                    if rx.search(line):
                        hits.append({"file": rel, "line": n, "text": line.strip()})
            except (UnicodeDecodeError, re.error):
                continue
        return hits[:100]

    def apply_patch(self, rel_path: str, old: str, new: str) -> str:
        """Exact, unique string replacement — same contract as an editor tool."""
        target = self._resolve(rel_path)
        text = target.read_text(encoding="utf-8")
        count = text.count(old)
        if count == 0:
            raise ValueError(f"old string not found in {rel_path}")
        if count > 1:
            raise ValueError(f"old string matches {count} locations in {rel_path}; make it unique")
        target.write_text(text.replace(old, new, 1), encoding="utf-8")
        self.touched_files.add(rel_path)
        return self.diff_for(rel_path)

    # ── verification ─────────────────────────────────────────────────────
    def run_tests(self) -> TestResult:
        proc = subprocess.run(
            [sys.executable, "-m", "pytest", "tests", "-q", "--no-header"],
            cwd=self.path,
            capture_output=True,
            text=True,
            timeout=180,
        )
        output = (proc.stdout + "\n" + proc.stderr).strip()
        tail = "\n".join(output.splitlines()[-40:])
        summary_line = next(
            (ln for ln in reversed(output.splitlines()) if "passed" in ln or "failed" in ln or "error" in ln),
            f"exit code {proc.returncode}",
        )
        return TestResult(
            passed=proc.returncode == 0,
            exit_code=proc.returncode,
            summary=summary_line.strip(),
            output=tail,
        )

    # ── diffing & promotion ──────────────────────────────────────────────
    def diff_for(self, rel_path: str) -> str:
        live = (settings.service_dir / rel_path)
        original = live.read_text(encoding="utf-8").splitlines(keepends=True) if live.exists() else []
        patched = self._resolve(rel_path).read_text(encoding="utf-8").splitlines(keepends=True)
        return "".join(
            difflib.unified_diff(original, patched, fromfile=f"a/{rel_path}", tofile=f"b/{rel_path}")
        )

    def full_diff(self) -> str:
        return "\n".join(filter(None, (self.diff_for(f) for f in sorted(self.touched_files))))

    def lines_changed(self) -> int:
        return sum(
            1
            for line in self.full_diff().splitlines()
            if (line.startswith("+") or line.startswith("-"))
            and not line.startswith(("+++", "---"))
        )

    def promote(self) -> list[str]:
        """Copy verified patched files back onto the live service."""
        promoted = []
        for rel in sorted(self.touched_files):
            src = self._resolve(rel)
            dst = settings.service_dir / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            promoted.append(rel)
        return promoted

    def cleanup(self) -> None:
        shutil.rmtree(self.path, ignore_errors=True)
