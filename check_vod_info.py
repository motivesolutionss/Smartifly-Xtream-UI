import sys
import json

raw = sys.stdin.read().strip()
if not raw:
    print("Empty response")
    sys.exit(1)

try:
    d = json.loads(raw)
except Exception as e:
    print("JSON error:", e)
    print("Raw:", raw[:500])
    sys.exit(1)

print("Top-level keys:", list(d.keys()))
print()

info = d.get('info', {})
if info:
    print("--- info fields ---")
    for k, v in info.items():
        if v:
            print(f"  {k}: {repr(str(v))[:120]}")
else:
    print("No 'info' key found")
    print("Full response:", json.dumps(d)[:1000])
