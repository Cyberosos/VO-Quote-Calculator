# Voiceover Quote Calculator

A one-page tool by **AOVO Services** for voiceover artists. Paste or upload a script and it:

- counts English and Arabic words (text in `[brackets]` is treated as a note and not counted)
- estimates the finished audio length from your reading speed
- prices the job per word, per minute, or at a flat rate, with optional extras
- adds **Arabic tashkeel** (full or light) to the Arabic lines, with Undo and Remove
- builds a branded PDF quote or invoice and a ready-to-paste Fiverr message

Works in English and Arabic.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app. Open it in a browser or host it on GitHub Pages. |
| `worker/worker.js` | The Cloudflare Worker that adds tashkeel through the Claude API and keeps the API key secret. |

## How tashkeel runs

- **Inside Claude (claude.ai artifact):** uses the viewer's own Claude plan. No server or API key needed.
- **Anywhere else (GitHub Pages, opened as a file):** calls the Cloudflare Worker at `https://tashkeel.hamdeen96.workers.dev`, which uses the Claude API and is billed to the Anthropic account.

## Hosting on GitHub Pages

1. Repository **Settings → Pages**.
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
3. After a minute the app is live at `https://<your-username>.github.io/<repo-name>/`.
4. In Cloudflare, set the Worker's `ALLOWED_ORIGIN` variable to `https://<your-username>.github.io` so only your site can use the tashkeel server.

## Updating the server

Open the Worker in Cloudflare → **Edit code**, paste the contents of `worker/worker.js`, and click **Deploy**.

The Worker needs two settings under **Settings → Variables and Secrets**:

- `ANTHROPIC_API_KEY` (Secret): the key from console.anthropic.com
- `ALLOWED_ORIGIN` (Text): your site's address, or `*` while testing

Never put the API key in `index.html` or commit it to this repository.
