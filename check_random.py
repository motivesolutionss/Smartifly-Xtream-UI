import sys
import json
import random
import subprocess
import urllib.request

BASE = "http://premiumtvs.space:8080/player_api.php"
USER = "93362102729"
PASS = "53620382639"

def curl_fetch(url):
    try:
        result = subprocess.run(
            ["curl", "-sL", "--max-time", "10", url],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        return {"error": str(e), "raw": result.stdout[:200] if result else ""}

def check_url(url):
    if not url or not url.strip():
        return "EMPTY"
    try:
        result = subprocess.run(
            ["curl", "-sL", "-o", "/dev/null", "-w", "%{http_code} %{content_type}", "--max-time", "5", url],
            capture_output=True, text=True
        )
        return f"HTTP {result.stdout.strip()}"
    except Exception as e:
        return f"FAIL {str(e)[:50]}"

def check_items(items, label, icon_field):
    print(f"\n{'='*60}")
    print(f"{label} — 5 random items")
    print('='*60)
    sample = random.sample(items, min(5, len(items)))
    for item in sample:
        name = item.get("name", "Unknown")
        icon = str(item.get(icon_field) or "")
        status = check_url(icon) if icon else "EMPTY"
        print(f"  {name[:45]}")
        print(f"    URL: {icon[:90] or 'NONE'}")
        print(f"    Status: {status}")
        print()

print("Fetching movies...")
movies = curl_fetch(f"{BASE}?username={USER}&password={PASS}&action=get_vod_streams")
if isinstance(movies, list):
    check_items(movies, "MOVIES", "stream_icon")
else:
    print("Movies error:", movies)

print("Fetching series...")
series = curl_fetch(f"{BASE}?username={USER}&password={PASS}&action=get_series")
if isinstance(series, list):
    check_items(series, "SERIES", "cover")
else:
    print("Series error:", series)

print("Fetching live channels...")
live = curl_fetch(f"{BASE}?username={USER}&password={PASS}&action=get_live_streams")
if isinstance(live, list):
    check_items(live, "LIVE CHANNELS", "stream_icon")
else:
    print("Live error:", live)
