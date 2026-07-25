import sqlite3
conn = sqlite3.connect("lumina.db")
print("=== Last 12 events (any type) ===")
for ts, typ, data in conn.execute("SELECT ts,type,data FROM history ORDER BY ts DESC LIMIT 12").fetchall():
    print(f"  {ts[:19]}  {typ:10}  {data[:80]}")
n = conn.execute("SELECT COUNT(*) FROM history WHERE type='whisper'").fetchone()[0]
print(f"\nTotal whisper events ever: {n}")
conn.close()
