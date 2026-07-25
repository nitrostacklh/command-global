/* SENTINEL dashboard — live glass-box view over the incident commander. */
"use strict";

const $ = (sel) => document.querySelector(sel);

const state = {
  incidents: {},          // id -> incident summary
  traces: {},             // id -> [events]
  selected: null,         // selected incident id
  pendingApproval: null,  // incident id awaiting approval
};

/* ── helpers ─────────────────────────────────────────── */
const fmtTime = (ts) => new Date(ts * 1000).toLocaleTimeString([], { hour12: false });
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderDiff(diff) {
  return diff
    .split("\n")
    .map((line) => {
      const cls =
        line.startsWith("+") && !line.startsWith("+++") ? "add"
        : line.startsWith("-") && !line.startsWith("---") ? "del"
        : line.startsWith("@@") ? "hunk" : "";
      return `<span class="${cls}">${esc(line)}</span>`;
    })
    .join("\n");
}

function confidenceHTML(verdict) {
  if (!verdict) return '<div class="empty small">No verdict yet.</div>';
  const cls = verdict.autonomous ? "pass" : "fail";
  const comps = Object.entries(verdict.components || {})
    .map(
      ([name, c]) => `
      <div class="comp">
        <div class="comp-head"><span>${esc(name)}</span><span>${(c.score * 100).toFixed(0)}% × w${c.weight}</span></div>
        <div class="bar"><div style="width:${Math.round(c.score * 100)}%"></div></div>
        <div class="comp-reason">${esc(c.reason)}</div>
      </div>`
    )
    .join("");
  return `
    <div class="score-line">
      <span class="score-big ${cls}">${verdict.score.toFixed(2)}</span>
      <span class="score-thresh">threshold ${verdict.threshold.toFixed(2)} →
        ${verdict.autonomous ? "autonomous" : "needs human"}</span>
    </div>${comps}`;
}

/* ── rendering ───────────────────────────────────────── */
function renderIncidents() {
  const list = $("#incident-list");
  const items = Object.values(state.incidents).sort((a, b) => b.opened_at - a.opened_at);
  if (!items.length) {
    list.innerHTML = '<div class="empty">No incidents yet.<br/>All systems nominal.</div>';
    return;
  }
  list.innerHTML = items
    .map(
      (i) => `
      <div class="incident-card ${i.id === state.selected ? "selected" : ""}" data-id="${i.id}">
        <div class="iid">${i.id}</div>
        <div class="isym">${esc((i.fix_summary || i.symptom || "").split("\n")[0].slice(0, 90))}</div>
        <span class="status-badge status-${i.status}">${i.status.replace("_", " ")}</span>
      </div>`
    )
    .join("");
  list.querySelectorAll(".incident-card").forEach((el) =>
    el.addEventListener("click", () => selectIncident(el.dataset.id))
  );
}

function eventBody(ev) {
  const d = ev.detail || {};
  if (ev.type === "agent.thinking" || ev.type === "agent.message")
    return `<pre>${esc(d.text || "")}</pre>`;
  if (ev.type === "patch.applied" || ev.type === "approval.requested")
    return d.diff ? `<pre class="diff">${renderDiff(d.diff)}</pre>` : "";
  if (ev.type === "tests.result") return `<pre>${esc(d.output || d.summary || "")}</pre>`;
  if (ev.type === "tool.call") return "";
  if (ev.type === "confidence.verdict") return "";
  if (d.log) return `<pre>${esc(d.log)}</pre>`;
  return "";
}

function appendTraceEvent(ev, scroll = true) {
  const container = $("#trace");
  if (container.querySelector(".empty")) container.innerHTML = "";
  const cls = ev.type.replace(/\./g, "-");
  const extra = ev.type === "tests.result" ? (ev.detail?.passed ? " pass" : " fail") : "";
  const el = document.createElement("div");
  el.className = `ev ${cls}${extra}`;
  el.innerHTML = `
    <div class="ev-head">
      <span class="ev-type">${esc(ev.type)}</span>
      <span class="ev-title">${esc(ev.title)}</span>
      <span class="ev-time">${fmtTime(ev.ts)}</span>
    </div>${eventBody(ev)}`;
  container.appendChild(el);
  if (scroll) container.scrollTop = container.scrollHeight;
}

function renderTrace(incidentId) {
  $("#trace-incident-id").textContent = incidentId || "";
  const container = $("#trace");
  container.innerHTML = "";
  (state.traces[incidentId] || []).forEach((ev) => appendTraceEvent(ev, false));
  container.scrollTop = container.scrollHeight;
}

function selectIncident(id) {
  state.selected = id;
  renderIncidents();
  if (!state.traces[id]) {
    fetch(`/api/incidents/${id}/trace`)
      .then((r) => r.json())
      .then((data) => {
        state.traces[id] = data.events || [];
        renderTrace(id);
      });
  } else {
    renderTrace(id);
  }
  const inc = state.incidents[id];
  $("#confidence-panel").innerHTML = confidenceHTML(inc && inc.verdict);
}

/* ── approval modal ──────────────────────────────────── */
function showApproval(ev) {
  state.pendingApproval = ev.incident_id;
  $("#modal-diff").innerHTML = renderDiff(ev.detail?.diff || "");
  $("#modal-confidence").innerHTML = confidenceHTML(ev.detail?.verdict);
  $("#modal-note").value = "";
  $("#approval-modal").classList.remove("hidden");
}

function hideApproval() {
  state.pendingApproval = null;
  $("#approval-modal").classList.add("hidden");
}

async function sendApproval(approved) {
  if (!state.pendingApproval) return;
  await fetch(`/api/incidents/${state.pendingApproval}/${approved ? "approve" : "reject"}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: $("#modal-note").value }),
  });
  hideApproval();
}

$("#btn-approve").addEventListener("click", () => sendApproval(true));
$("#btn-reject").addEventListener("click", () => sendApproval(false));

/* ── chaos console ───────────────────────────────────── */
document.querySelectorAll("button.chaos[data-bug]").forEach((btn) =>
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await fetch(`/api/demo/inject/${btn.dataset.bug}`, { method: "POST" });
    } finally {
      setTimeout(() => (btn.disabled = false), 4000);
    }
  })
);
$("#btn-restore").addEventListener("click", () => fetch("/api/demo/restore", { method: "POST" }));

/* ── data flow ───────────────────────────────────────── */
async function refreshState() {
  try {
    const data = await (await fetch("/api/state")).json();
    $("#pill-model").textContent = `model: ${data.config.model}`;
    if (data.config.domain)
      $("#pill-domain").textContent = `domain: ${data.config.domain_name || data.config.domain}`;
    const conn = data.config.connectors;
    $("#pill-connectors").textContent =
      `slack:${conn.slack} · wekan:${conn.wekan} · pr:${conn.github_pr}`;
    const health = data.service_health || {};
    const dot = $("#health-dot");
    dot.className = "dot " + (health.healthy ? "ok" : health.reachable ? "bad" : "");
    $("#health-text").textContent = health.healthy
      ? "service healthy"
      : health.reachable ? `UNHEALTHY (${health.status_code})` : "service offline";
    data.incidents.forEach((i) => (state.incidents[i.id] = i));
    renderIncidents();
    if (state.selected && state.incidents[state.selected]) {
      $("#confidence-panel").innerHTML = confidenceHTML(state.incidents[state.selected].verdict);
    }
  } catch {
    /* server restarting — keep polling */
  }
}

function connectWS() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (msg) => {
    const ev = JSON.parse(msg.data);
    (state.traces[ev.incident_id] ??= []).push(ev);
    if (ev.type === "incident.opened") {
      state.incidents[ev.incident_id] = {
        id: ev.incident_id, symptom: ev.detail.symptom || ev.title,
        status: "DETECTED", opened_at: ev.ts,
      };
      selectIncident(ev.incident_id);
    }
    if (ev.incident_id === state.selected) appendTraceEvent(ev);
    if (ev.type === "approval.requested") showApproval(ev);
    if (ev.type === "approval.granted" || ev.type === "approval.rejected") hideApproval();
    if (ev.type === "incident.status" || ev.type === "confidence.verdict"
        || ev.type === "incident.resolved" || ev.type === "incident.escalated") {
      refreshState();
    }
  };
  ws.onclose = () => {
    $("#live-badge").textContent = "○ RECONNECTING";
    setTimeout(connectWS, 1500);
  };
  ws.onopen = () => ($("#live-badge").textContent = "● LIVE");
}

connectWS();
refreshState();
setInterval(refreshState, 3000);
