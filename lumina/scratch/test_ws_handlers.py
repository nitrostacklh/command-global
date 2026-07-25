import asyncio, json, websockets, pathlib

async def main():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri, max_size=None) as ws:
        results = {}

        async def recv_until(expected, timeout=15):
            try:
                while True:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout))
                    if msg.get("type") == expected:
                        return msg.get("payload")
            except asyncio.TimeoutError:
                return None

        # 1. file_append
        await ws.send(json.dumps({"type": "file_append",
            "payload": {"node_id": "f1", "path": "logs/ws_test.txt", "content": "hello from ws test"}}))
        results["file_result"] = await recv_until("file_result")

        # 2. gsheets_append
        await ws.send(json.dumps({"type": "gsheets_append",
            "payload": {"node_id": "g1", "spreadsheet_id": "abc", "range": "Sheet1!A1",
                        "values": [["2026", "keyboard"]]}}))
        results["gsheets_result"] = await recv_until("gsheets_result")

        # 3. text_gen -> text_result (name LlmNode now listens for)
        await ws.send(json.dumps({"type": "text_gen",
            "payload": {"node_id": "l1", "prompt": "Say OK", "max_tokens": 5}}))
        results["text_result"] = await recv_until("text_result", timeout=60)

        print(json.dumps(results, indent=2)[:600])

        # confirm file written
        f = pathlib.Path("logs/ws_test.txt")
        print("file exists:", f.exists(), "| content:", f.read_text().strip() if f.exists() else "-")

asyncio.run(main())
