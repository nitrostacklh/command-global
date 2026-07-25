"""Integration test: gen_workflow + auto_connect with the REAL local model (gemma3).
Forces Ollama path by clearing Gemini config."""
import sys, os, json, time
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.getcwd())

# Force pure-local: no Gemini even if key is in .env
os.environ.pop("GOOGLE_API_KEY", None)
os.environ["LUMINA_USE_OLLAMA_FOR_TEXT"] = "true"
os.environ["LUMINA_USE_OLLAMA_FOR_VISION"] = "true"

from dotenv import load_dotenv
load_dotenv()
os.environ.pop("GOOGLE_API_KEY", None)  # again after load_dotenv

from brain import Brain, _NODE_HANDLES

b = Brain()
print(f"use_gemini_text={b.use_gt}  use_ollama={b.use_ol}  models={b.ol_mdls}")
assert not b.use_gt, "Gemini must be OFF for this test"
assert b.use_ol, "Ollama must be available"

passed = failed = 0
def check(label, ok, detail=""):
    global passed, failed
    print(f"  {'PASS' if ok else 'FAIL'}  {label}  {detail}")
    if ok: passed += 1
    else: failed += 1

def validate_edges(nodes, edges):
    """Every edge must use handles that exist on its endpoints."""
    type_of = {n["id"]: n["type"] for n in nodes}
    bad = []
    for e in edges:
        st, tt = type_of.get(e["source"]), type_of.get(e["target"])
        if not st or not tt:
            bad.append(("dangling", e)); continue
        outs, _ = _NODE_HANDLES[st]
        _, ins = _NODE_HANDLES[tt]
        if e.get("sourceHandle") not in outs or e.get("targetHandle") not in ins:
            bad.append(("handle", e))
    return bad

# â”€â”€ Test 1: gen_workflow with local gemma3 â”€â”€
print("\n=== gen_workflow (gemma3) â€” may take ~2 min on cold load ===")
t0 = time.time()
wf = b.gen_workflow("detect a person on the camera and send an email alert")
dt = time.time() - t0
print(f"  took {dt:.1f}s")
print(f"  nodes: {[n['type'] for n in wf.get('nodes', [])]}")
print(f"  edges: {len(wf.get('edges', []))}")
check("nodes generated", len(wf.get("nodes", [])) >= 3)
check("edges generated", len(wf.get("edges", [])) >= 2)
bad = validate_edges(wf.get("nodes", []), wf.get("edges", []))
check("ALL handles valid (renderable)", not bad, str(bad[:2]))
has_input = any(n["type"] in ("camera", "video", "ipCamera", "mic", "audioFile") for n in wf.get("nodes", []))
has_action = any(not _NODE_HANDLES[n["type"]][0] for n in wf.get("nodes", []))
check("starts with input node", has_input)
check("ends with action node", has_action)

# â”€â”€ Test 2: auto_connect with local gemma3 â”€â”€
print("\n=== auto_connect (gemma3) ===")
loose_nodes = [
    {"id": "a1", "type": "camera"},
    {"id": "a2", "type": "faceMatch"},
    {"id": "a3", "type": "logic"},
    {"id": "a4", "type": "notifyAction"},
]
t0 = time.time()
edges = b.auto_connect(loose_nodes, [], "camera feeds face match, alert when a face is found")
dt = time.time() - t0
print(f"  took {dt:.1f}s")
print(f"  edges: {json.dumps(edges, indent=2)[:600]}")
check("edges suggested", len(edges) >= 2, f"{len(edges)} edges")
bad2 = validate_edges(loose_nodes, edges)
check("ALL auto-wire handles valid", not bad2, str(bad2[:2]))
# the chain must connect cameraâ†’faceMatch at minimum
pairs = {(e["source"], e["target"]) for e in edges}
check("cameraâ†’faceMatch wired", ("a1", "a2") in pairs, str(pairs))

# â”€â”€ Test 3: gen_workflow with a weirder description â”€â”€
print("\n=== gen_workflow #2: audio pipeline (gemma3) ===")
t0 = time.time()
wf2 = b.gen_workflow("transcribe my speech from the microphone and log it")
dt = time.time() - t0
print(f"  took {dt:.1f}s")
print(f"  nodes: {[n['type'] for n in wf2.get('nodes', [])]}")
check("audio nodes generated", len(wf2.get("nodes", [])) >= 2)
bad3 = validate_edges(wf2.get("nodes", []), wf2.get("edges", []))
check("handles valid", not bad3, str(bad3[:2]))

print(f"\n{'='*40}\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)

