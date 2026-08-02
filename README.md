# Novocaine Training

An installable web app version of the Novocaine Training prescription + tracking engine.
No build step, no npm install — this is plain HTML/CSS/JS and can be served as-is.

## Deploy to GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Push these files to the repo root (or to a `docs/` folder — either works, just point
   Pages at whichever you use). Make sure `.nojekyll` comes along — it's a hidden file,
   so some drag-and-drop upload flows skip it; check it landed at the same level as
   `index.html`.
   ```
   git init
   git add .
   git commit -m "Novocaine Training web app"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   then pick `main` and `/ (root)` (or `/docs`), and save.
4. GitHub gives you a URL like `https://<you>.github.io/<repo>/`. It can take a minute
   to go live the first time — and a minute or two to pick up updates on redeploys too.

That's the whole deployment — there's no CI, no bundler, nothing else to configure.

## Updating an existing install

If you'd already installed this before, the app on your device is running from the
service worker's cache, not fetching fresh files every time. After you push updated
files: close the app fully, reopen it, and it should pick up the new version within a
load or two (the service worker checks for updates on each visit). If it seems stuck
on the old version, removing and reinstalling the app is the reliable fix.

## Installing it as an app

Once it's live on Pages (installability needs a real HTTPS origin — it won't offer to
install from a local file):

- **Android / Chrome / Edge (desktop or mobile):** open the URL, then use the browser's
  "Install app" / "Add to Home screen" prompt (often an icon in the address bar, or
  "Install [name]…" in the ⋮ menu — it doesn't always pop up on its own).
- **iPhone / Safari:** open the URL, tap Share → **Add to Home Screen**. iOS doesn't use
  the manifest's install prompt, but this achieves the same result — a standalone icon
  with no browser chrome.

## What's inside

- `index.html` — loads React 18 and Tailwind from CDN, plus `app.js`
- `app.js` — the entire app, compiled from JSX. No JSX/build tooling needed at runtime.
- `manifest.json` — name, icons, standalone display mode (what makes it "installable")
- `service-worker.js` — caches the app shell so it keeps working with no signal
- `.nojekyll` — tells GitHub Pages not to run its default Jekyll processing, which can
  otherwise interfere with how plain static files get served
- `icons/` — generated from your kettlebell-and-syringe artwork, at every size iOS/
  Android/desktop actually ask for (16/32 favicon, 180 apple-touch, 192/512, plus a
  512 maskable variant padded to the safe zone Android's adaptive-icon mask expects)

## Data & privacy

All training data (setup, session history, training maxes) is stored in the browser's
`localStorage` on the device it's used on — nothing is sent anywhere, there's no backend.
That also means the data is per-browser/per-device; it won't sync between your phone and
a laptop unless you manually recreate the same setup on both.

## Notes on this build

Ported from the interactive Claude artifact. Same three swaps as before, no behavior
changes: icons (`lucide-react`) are inline SVG, the Training Max chart (`recharts`) is a
hand-rolled SVG chart, and storage (the Claude artifact `window.storage` API) is
`localStorage`. This version reflects the full current feature set — the training-max
table lookup, independent Bench/Front Squat progression, the Threshold/Easy-pace VDOT
pathways (including the Category 3 branch), the Settings override gate, and the pull-up
ladder — all ported over from the same source, unchanged.

Before packaging, it was compiled with the TypeScript JSX transpiler (no network needed)
and driven end-to-end in a real offline headless browser: full setup wizard, cycling
through multiple sessions across every base type, a rollover with the independent
Bench/Front Squat breakdown, the Settings override gate, the Progress tab, and a page
reload to confirm `localStorage` persistence. Zero JS errors. The one thing that can't be
tested offline is the live CDN script tags (React/Tailwind) — those only resolve once
this is actually deployed with real internet access, so give it a quick look after your
first deploy.
