import asyncio, json, websockets

PROMPT = ("If a cat or a dog is detected by YOLO on the camera feed, pass the image to "
          "the VLM to describe what they are doing, then post the VLM's analysis text "
          "directly to Slack, send a popup notification, and play an alert sound.")

async def main():
    async with websockets.connect("ws://localhost:8000/ws", max_size=None) as ws:
        await ws.send(json.dumps({"type": "generate_workflow", "payload": {"description": PROMPT}}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), 180))
            if msg.get("type") == "workflow_generated":
                p = msg["payload"]
                if p.get("error"):
                    print("ERROR:", p["error"]); return
                print("NODES:")
                for n in p["nodes"]:
                    print(f"  {n['id']:4} {n['type']}")
                print("\nEDGES (source[handle] -> target[handle]):")
                for e in p["edges"]:
                    print(f"  {e['source']}[{e.get('sourceHandle')}] -> {e['target']}[{e.get('targetHandle')}]")
                # Diagnose VLM wiring
                vlms = [n['id'] for n in p['nodes'] if n['type'] == 'visualLlm']
                cams = [n['id'] for n in p['nodes'] if n['type'] in ('camera','video','ipCamera')]
                for v in vlms:
                    cam_edge = [e for e in p['edges'] if e['target']==v and e.get('targetHandle')=='camera']
                    trg_edge = [e for e in p['edges'] if e['target']==v and e.get('targetHandle')=='trigger']
                    print(f"\nVLM {v}: camera-edge={cam_edge or 'MISSING'}  trigger-edge={trg_edge or 'MISSING'}")
                return

asyncio.run(main())
