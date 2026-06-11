# m3u8 Playlist Fetcher

Small helper to fetch `.m3u8` playlists and download referenced media segments.

Usage

1. Install dependencies in the `scripts` folder:

```bash
cd scripts
npm install
```

2. Run the fetcher (defaults to the four provided test URLs):

```bash
node fetch_playlists.js
# or with npm
npm run fetch-playlists
```

3. CLI options:

- `--out=PATH` : output directory (default `./outputs`)
- `--concurrency=N` : number of parallel segment downloads (default 8)
- `--retries=N` : retry attempts per segment (default 3)

You can also pass playlist URLs as arguments:

```bash
node fetch_playlists.js http://example.com/a.m3u8 http://example.com/b.m3u8 --out=myout
```
