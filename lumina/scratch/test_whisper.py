import asyncio, json, base64, numpy as np, websockets

async def main():
    # 4 seconds of 16kHz mono float32 — a faint tone (simulates the mic format).
    sr = 16000
    t = np.linspace(0, 4, sr * 4, dtype=np.float32)
    samples = (0.02 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
    b64 = base64.b64encode(samples.tobytes()).decode()

    async with websockets.connect("ws://localhost:8000/ws", max_size=None) as ws:
        await ws.send(json.dumps({"type": "whisper_stt", "payload": {"node_id": "w1", "audio": b64}}))
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), 60))
            if msg.get("type") == "stt_result":
                p = msg["payload"]
                print("RESULT:", json.dumps(p))
                err = "error" in str(p.get("transcript", "")).lower() and "WinError" in str(p.get("transcript", ""))
                print("ffmpeg bypass working:", not err)
                break

asyncio.run(main())
