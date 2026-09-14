# ASCIIFY

A browser-based ASCII art converter — drop a photo, get it back as
colored character art, download as PNG or TXT. Pure static HTML/CSS/JS,
same conversion logic as the original `a.py` script (character ramp,
aspect-ratio correction, and brightness mapping), just run client-side
instead of in a terminal.

## Run locally

No build step. Just serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm i -g vercel
cd ascii-tool
vercel
```
Follow the prompts (accept the defaults — it's a static site, no
framework, no build command needed).

**Option B — GitHub**
1. Push this folder to a GitHub repo.
2. Go to vercel.com → **Add New Project** → import the repo.
3. Framework preset: **Other**. Leave build command empty, output
   directory as `.` (root). Deploy.

## Files

- `index.html` — structure
- `styles.css` — design system (dark phosphor/dot-matrix theme)
- `script.js` — image → ASCII conversion + canvas rendering + downloads
- `vercel.json` — clean URLs config
