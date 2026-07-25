"""Test the deterministic parts of auto-wire / workflow generation (no LLM)."""
import sys, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.getcwd())

from brain import _fix_edges, _normalize_node_type, _NODE_HANDLES, Brain

passed = failed = 0
def check(label, ok, detail=""):
    global passed, failed
    mark = "PASS" if ok else "FAIL"
    print(f"  {mark}  {label}  {detail}")
    if ok: passed += 1
    else: failed += 1


print("=== 1. _normalize_node_type ===")
check("exact type passes",      _normalize_node_type("camera") == "camera")
check("capitalised resolves",   _normalize_node_type("Camera") == "camera")
check("alias email",            _normalize_node_type("email") == "emailAction")
check("alias object_detection", _normalize_node_type("object_detection") == "detection")
check("alias face match",       _normalize_node_type("face match") == "faceMatch")
check("alias whisper",          _normalize_node_type("whisper") == "whisperStt")
check("camelCase exact",        _normalize_node_type("visualLlm") == "visualLlm")
check("case-insensitive vlm",   _normalize_node_type("VisualLLM") == "visualLlm")
check("garbage rejected",       _normalize_node_type("flux_capacitor") is None)
check("timer rejected",         _normalize_node_type("timer") is None)

print("\n=== 2. _fix_edges snaps bad handles ===")
types = {"n1": "camera", "n2": "detection", "n3": "logic", "n4": "emailAction"}
# Simulate typical gemma3 output: structure right, handles wrong/missing
bad_edges = [
    {"source": "n1", "target": "n2", "sourceHandle": "output", "targetHandle": "input"},
    {"source": "n2", "target": "n3"},  # no handles at all
    {"source": "n3", "target": "n4", "sourceHandle": "match", "targetHandle": "in"},
]
fixed = _fix_edges(bad_edges, types)
check("3 edges survive", len(fixed) == 3, f"got {len(fixed)}")
e1 = next(e for e in fixed if e["source"] == "n1")
check("camera src snapped to 'camera'",  e1["sourceHandle"] == "camera", e1["sourceHandle"])
check("detection tgt snapped to 'camera'", e1["targetHandle"] == "camera", e1["targetHandle"])
e2 = next(e for e in fixed if e["source"] == "n2")
check("detection out defaults to 'match'", e2["sourceHandle"] == "match", e2["sourceHandle"])
check("logic in snapped to 'input'",       e2["targetHandle"] == "input", e2["targetHandle"])
e3 = next(e for e in fixed if e["source"] == "n3")
check("valid 'match' kept",                e3["sourceHandle"] == "match", e3["sourceHandle"])
check("action tgt snapped to 'trigger'",   e3["targetHandle"] == "trigger", e3["targetHandle"])

print("\n=== 3. _fix_edges drops impossible edges ===")
impossible = [
    {"source": "n4", "target": "n1"},   # action has no outputs, camera no inputs
    {"source": "n1", "target": "n1"},   # self-loop
    {"source": "n1", "target": "nX"},   # unknown node
    {"source": "n1", "target": "n2"},
    {"source": "n1", "target": "n2"},   # duplicate
]
fixed2 = _fix_edges(impossible, types)
check("only 1 valid edge kept", len(fixed2) == 1, f"got {len(fixed2)}")

print("\n=== 4. merge gets inputA then inputB ===")
mtypes = {"a": "detection", "b": "ocr", "m": "merge"}
medges = _fix_edges([{"source": "a", "target": "m"}, {"source": "b", "target": "m"}], mtypes)
handles = sorted(e["targetHandle"] for e in medges)
check("merge uses both ports", handles == ["inputA", "inputB"], str(handles))

print("\n=== 5. every type in _NODE_HANDLES matches frontend registry ===")
# from the component scan
frontend = {
    "camera","video","detection","visualLlm","logic","llm","soundAction","logAction",
    "notifyAction","screenshotAction","webhookAction","emailAction","smsAction","mic",
    "audioDetect","audioLlm","audioFile","script","whisperStt","ipCamera","debounce",
    "merge","fileAction","ocr","pose","mqttAction","faceMatch","speakAction",
    "discordAction","slackAction","googleSheetsAction","geminiLive","toolUse",
}
extra = set(_NODE_HANDLES) - frontend
missing = frontend - set(_NODE_HANDLES)
check("no phantom types", not extra, str(extra))
check("no missing types", not missing, str(missing))

print("\n=== 6. rule-based workflow builder (Brain methods, no LLM) ===")
b = Brain.__new__(Brain)   # skip __init__ — no Ollama/Gemini needed

wf = b._rule_based_workflow("detect a person on camera and send me an email")
nt = [n["type"] for n in wf["nodes"]]
check("camera in pipeline",   "camera" in nt, str(nt))
check("detection in pipeline","detection" in nt)
check("logic from 'person'",  "logic" in nt)
check("emailAction at end",   "emailAction" in nt)
check("edges generated",      len(wf["edges"]) >= 3, f"{len(wf['edges'])} edges")
# Verify chain connectivity: every node except inputs has an incoming edge
tgt_ids = {e["target"] for e in wf["edges"]}
non_input = [n["id"] for n in wf["nodes"] if n["type"] not in ("camera", "mic")]
check("all nodes reachable",  all(i in tgt_ids for i in non_input),
      f"unreached={[i for i in non_input if i not in tgt_ids]}")
# Verify all handles are valid
all_ok = True
type_of = {n["id"]: n["type"] for n in wf["nodes"]}
for e in wf["edges"]:
    outs, _ = _NODE_HANDLES[type_of[e["source"]]]
    _, ins = _NODE_HANDLES[type_of[e["target"]]]
    if e["sourceHandle"] not in outs or e["targetHandle"] not in ins:
        all_ok = False
        print(f"     BAD: {e}")
check("all handles renderable", all_ok)

wf2 = b._rule_based_workflow("listen on the mic, transcribe speech and save to file")
nt2 = [n["type"] for n in wf2["nodes"]]
check("mic for audio intent",   "mic" in nt2, str(nt2))
check("whisperStt added",       "whisperStt" in nt2)
check("fileAction added",       "fileAction" in nt2)

wf3 = b._rule_based_workflow("watch the camera and describe the scene, alert me on slack if you see fire")
nt3 = [n["type"] for n in wf3["nodes"]]
check("visualLlm for describe", "visualLlm" in nt3, str(nt3))
check("logic from 'fire'",      "logic" in nt3)
check("slackAction added",      "slackAction" in nt3)

print("\n=== 7. _parse_workflow_json end-to-end with messy LLM text ===")
messy = '''Here is your pipeline:
```json
{"nodes":[
  {"id":"n1","type":"Camera","data":{}},
  {"id":"n2","type":"object_detection","data":{"confidence":60}},
  {"id":"n3","type":"email","data":{"to":"a@b.c"}}
],
"edges":[
  {"source":"n1","target":"n2","sourceHandle":"video_out","targetHandle":"video_in"},
  {"source":"n2","target":"n3"}
]}
```'''
parsed = b._parse_workflow_json(messy)
pt = [n["type"] for n in parsed["nodes"]]
check("messy types normalised", pt == ["camera", "detection", "emailAction"], str(pt))
check("2 edges fixed",          len(parsed["edges"]) == 2, f"{len(parsed['edges'])}")
ph = [(e["sourceHandle"], e["targetHandle"]) for e in parsed["edges"]]
check("handles corrected",      ph == [("camera", "camera"), ("match", "trigger")], str(ph))

print("\n=== 8. nodes-only output gets rule-wired ===")
nodes_only = '{"nodes":[{"id":"n1","type":"camera"},{"id":"n2","type":"detection"},{"id":"n3","type":"logAction"}],"edges":[]}'
parsed2 = b._parse_workflow_json(nodes_only)
check("edges auto-created", len(parsed2["edges"]) >= 2, f"{len(parsed2['edges'])} edges")

print(f"\n{'='*40}\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
