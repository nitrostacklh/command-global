import asyncio, json, time, websockets

PROMPT = ("Watch the IP camera feed and listen to the microphone. When a person is "
          "detected on camera AND they say 'hello' or 'help', merge the results, speak "
          "a welcome message out loud, and save the event details to a file")

async def main():
    async with websockets.connect("ws://localhost:8000/ws", max_size=None) as ws:
        t0 = time.perf_counter()
        await ws.send(json.dumps({"type": "generate_workflow", "payload": {"description": PROMPT}}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), 240))
            if msg.get("type") == "workflow_generated":
                dt = time.perf_counter() - t0
                p = msg["payload"]
                print(f"completed in {dt:.1f}s")
                if p.get("error"):
                    print("ERROR:", p["error"]); return
                print("NODES:", ", ".join(f"{n['id']}:{n['type']}" for n in p["nodes"]))
                print("EDGES:")
                for e in p["edges"]:
                    print(f"  {e['source']}[{e.get('sourceHandle')}] -> {e['target']}[{e.get('targetHandle')}]")
                return

asyncio.run(main())
