// generate-news.mjs
// Pulls daily news bullets from NewsAPI.org and writes a static docs/index.html
// that GitHub Pages will serve (and that you embed in Notion).

const API_KEY = process.env.NEWSAPI_KEY;
if (!API_KEY) {
  console.error("Missing NEWSAPI_KEY environment variable/secret.");
  process.exit(1);
}

const BASE = "https://newsapi.org/v2";

// Outlets commonly bucketed as left- or right-leaning by media bias trackers
// (e.g. AllSides, Ad Fontes). Feel free to edit this list to your taste.
const LEFT_DOMAINS = "nytimes.com,washingtonpost.com,cnn.com,theguardian.com,huffpost.com";
const RIGHT_DOMAINS = "foxnews.com,nypost.com,washingtontimes.com,nationalreview.com,dailywire.com";

const CATEGORIES = [
  {
    key: "politics-left",
    label: "Politics — left-leaning outlets",
    url: `${BASE}/everything?q=politics%20OR%20election%20OR%20congress%20OR%20president&domains=${LEFT_DOMAINS}&language=en&sortBy=publishedAt&pageSize=5`
  },
  {
    key: "politics-right",
    label: "Politics — right-leaning outlets",
    url: `${BASE}/everything?q=politics%20OR%20election%20OR%20congress%20OR%20president&domains=${RIGHT_DOMAINS}&language=en&sortBy=publishedAt&pageSize=5`
  },
  {
    key: "tech",
    label: "Tech",
    url: `${BASE}/top-headlines?category=technology&language=en&pageSize=6`
  },
  {
    key: "startups",
    label: "Startups",
    url: `${BASE}/everything?q=startup%20OR%20%22seed%20round%22%20OR%20%22series%20A%22%20OR%20funding&language=en&sortBy=publishedAt&pageSize=6`
  },
  {
    key: "aerospace",
    label: "Aerospace",
    url: `${BASE}/everything?q=aerospace%20OR%20NASA%20OR%20SpaceX%20OR%20rocket%20launch%20OR%20aviation&language=en&sortBy=publishedAt&pageSize=6`
  },
  {
    key: "finance",
    label: "Finance",
    url: `${BASE}/everything?q=markets%20OR%20%22Federal%20Reserve%22%20OR%20stocks%20OR%20earnings&language=en&sortBy=publishedAt&pageSize=6`
  }
];

async function fetchCategory(cat) {
  const response = await fetch(cat.url, {
    headers: { "X-Api-Key": API_KEY }
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`API error for ${cat.label}:`, response.status, errText);
    return [];
  }

  const data = await response.json();
  return (data.articles || []).map((a) => ({
    headline: a.title || "",
    detail: a.description || "",
    source: a.source?.name || "",
    url: a.url || ""
  }));
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCategory(cat, bullets) {
  if (!bullets || bullets.length === 0) {
    return `<section class="category">
      <h2>${cat.label}</h2>
      <p class="empty">No stories retrieved today.</p>
    </section>`;
  }
  const items = bullets
    .map((b) => {
      const headline = escapeHtml(b.headline);
      const detail = escapeHtml(b.detail);
      const source = escapeHtml(b.source);
      const url = b.url ? escapeHtml(b.url) : null;
      return `<li>
        <div class="headline">${headline}</div>
        <div class="detail">${detail}</div>
        <div class="meta">${source}${url ? ` &middot; <a href="${url}" target="_blank" rel="noopener">source</a>` : ""}</div>
      </li>`;
    })
    .join("\n");
  return `<section class="category">
    <h2>${cat.label}</h2>
    <ul>${items}</ul>
  </section>`;
}

function renderPage(sections, generatedAt) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily News Digest</title>
<style>
  :root {
    --bg: #ffffff;
    --text: #1a1a1a;
    --muted: #6b7280;
    --border: #e5e7eb;
    --accent: #2563eb;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .header {
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
  }
  .header h1 {
    margin: 0 0 4px 0;
    font-size: 22px;
  }
  .header .timestamp {
    color: var(--muted);
    font-size: 13px;
  }
  .category {
    margin-bottom: 28px;
  }
  .category h2 {
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    margin-bottom: 10px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  li:last-child { border-bottom: none; }
  .headline {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 3px;
  }
  .detail {
    font-size: 14px;
    color: #374151;
    margin-bottom: 3px;
  }
  .meta {
    font-size: 12px;
    color: var(--muted);
  }
  .meta a { color: var(--accent); text-decoration: none; }
  .empty { color: var(--muted); font-size: 14px; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <h1>Daily News Digest</h1>
    <div class="timestamp">Updated ${generatedAt}</div>
  </div>
  ${sections.join("\n")}
</body>
</html>`;
}

async function main() {
  const sections = [];
  for (const cat of CATEGORIES) {
    console.log(`Fetching ${cat.label}...`);
    const bullets = await fetchCategory(cat);
    sections.push(renderCategory(cat, bullets));
  }
  const generatedAt = new Date().toUTCString();
  const html = renderPage(sections, generatedAt);

  const fs = await import("fs");
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/index.html", html);
  console.log("Wrote docs/index.html");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
