import sys
import json
import urllib.request

raw = json.load(sys.stdin)

# Handle wrapped responses
if isinstance(raw, dict):
    print("Raw keys:", list(raw.keys())[:10])
    data = None
    for key in ['data', 'items', 'movies', 'vod_streams', 'streams', 'result']:
        if isinstance(raw.get(key), list):
            data = raw[key]
            print(f"Found list under key: '{key}', count: {len(data)}")
            break
    if data is None:
        print("Full response:", json.dumps(raw)[:500])
        sys.exit(1)
else:
    data = raw

# Show ALL fields available in the first item
print("\n--- ALL FIELDS in first item ---")
if data:
    for k, v in data[0].items():
        print(f"  {k}: {repr(v)[:100]}")

# Check which fields contain http URLs across first 50 items
print("\n--- URL fields across first 50 items ---")
url_fields = {}
for item in data[:50]:
    for k, v in item.items():
        if isinstance(v, str) and v.startswith('http'):
            if k not in url_fields:
                url_fields[k] = []
            url_fields[k].append(v)

for field, urls in url_fields.items():
    working = [u for u in urls if not u.startswith('http://starshare.live')]
    print(f"  {field}: {len(urls)} total, {len(working)} non-starshare URLs")
    if working:
        print(f"    Example: {working[0][:100]}")
