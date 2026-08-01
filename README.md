# Daily News Digest → Notion Embed

A small automated pipeline that pulls daily news bullets (Politics — left and
right leaning outlets, Tech, Startups, Aerospace, Finance) from NewsAPI.org
and publishes them as a static page you can embed directly in Notion.

## How it works

1. A GitHub Actions workflow runs once a day on a schedule.
2. It calls NewsAPI.org to pull real, current articles for each category
   (politics is split into two separate calls — one restricted to outlets
   commonly bucketed as left-leaning, one to outlets bucketed as
   right-leaning, so you see both).
3. It writes the results into `docs/index.html`.
4. GitHub Pages serves that file as a public URL.
5. You embed that URL in Notion — Notion re-fetches it each time you view the
   page, so it always shows the latest digest.

## Important: NewsAPI free tier note

NewsAPI.org's free "Developer" plan is officially intended for local
development/testing, not deployed/production use, and it delays articles by
about 24 hours. Running it via GitHub Actions to a public Pages site is
outside that intended use, though this is a common way people use it for
small personal projects. If you ever see requests get blocked, the fix is
swapping in a provider that explicitly allows free production use (e.g.
NewsData.io or Currents API) — the rest of this pipeline (Actions + Pages +
Notion embed) stays the same, you'd just rewrite the `fetchCategory`
function to call the new provider's endpoint.

## One-time setup (~10 minutes)

### 1. Create the repo
- Create a new **public** GitHub repo (private repos work too, but GitHub
  Pages on private repos requires a paid plan).
- Upload all the files in this folder, preserving the structure:
  ```
  .github/workflows/daily-news.yml
  scripts/generate-news.mjs
  docs/index.html
  README.md
  ```

### 2. Add your NewsAPI key as a secret
- In the repo: **Settings → Secrets and variables → Actions → New repository secret**
- Name: `NEWSAPI_KEY`
- Value: your API key from [newsapi.org/account](https://newsapi.org/account)

### 3. Enable GitHub Pages
- **Settings → Pages**
- Source: "Deploy from a branch"
- Branch: `main`, folder: `/docs`
- Save. GitHub will give you a URL like:
  `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### 4. Run it once manually
- Go to the **Actions** tab → "Daily News Digest" workflow → **Run workflow**
- Wait ~1 minute, then check the Pages URL — it should show today's digest.

### 5. Embed it in Notion
- In any Notion page, type `/embed`
- Paste your GitHub Pages URL
- Resize the block as you like

From then on, the workflow runs automatically every day at 11:00 UTC (edit the
`cron` line in `.github/workflows/daily-news.yml` to change the time — cron
times are in UTC).

## Customizing

- **Categories/topics**: edit the `CATEGORIES` array in
  `scripts/generate-news.mjs` — each entry is just a NewsAPI URL, so you can
  change the `q=` search terms, swap `everything` for `top-headlines`, or add
  new categories entirely.
- **Left/right outlet lists**: edit `LEFT_DOMAINS` / `RIGHT_DOMAINS` at the
  top of the script to whichever outlets you consider representative.
- **Number of bullets per category**: change `pageSize` in each category's URL.
- **Styling**: edit the `<style>` block inside `renderPage()`.
- **Run time**: edit the `cron` schedule in the workflow file
  ([crontab.guru](https://crontab.guru) is handy for this).

## Cost note

The free NewsAPI tier allows 100 requests/day; this pipeline uses 6 requests
per run (one per category), so a single daily run fits comfortably within
that limit even if you also run it manually a few extra times while testing.

## Troubleshooting

- **Page stuck on placeholder text**: check the Actions tab for a failed run
  and read the error logs — usually a missing/incorrect API key, or a 426/
  request-blocked error from NewsAPI (see the free tier note above).
- **A category shows "No stories retrieved today"**: the search terms for
  that category didn't match recent articles, or the request was rate
  limited/blocked. Check the Action's logs for the raw response.
- **Rate limit errors (426 or 429)**: you've likely exceeded the 100
  requests/day free cap, or NewsAPI is blocking the request because it's not
  coming from localhost. See the free tier note above for alternatives.
