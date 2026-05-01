const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
});

const CATEGORIES = [
  {
    id: 'sns',
    label: 'SNSマーケティング',
    icon: '📱',
    color: '#6366f1',
    feeds: [
      { name: 'Hootsuite Blog',    url: 'https://blog.hootsuite.com/feed/' },
      { name: 'Sprout Social',     url: 'https://sproutsocial.com/insights/feed/' },
      { name: 'HubSpot Marketing', url: 'https://blog.hubspot.com/marketing/rss.xml' },
      { name: 'Marketing Week',    url: 'https://www.marketingweek.com/feed/' },
      { name: 'Social Media Examiner', url: 'https://www.socialmediaexaminer.com/feed/' },
    ],
  },
  {
    id: 'design',
    label: 'WEBデザイン',
    icon: '🎨',
    color: '#ec4899',
    feeds: [
      { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
      { name: 'CSS-Tricks',        url: 'https://css-tricks.com/feed/' },
      { name: 'Web Designer News', url: 'https://www.webdesignernews.com/feed' },
      { name: 'Codrops',           url: 'https://feeds.feedburner.com/tympanus' },
      { name: 'UX Collective',     url: 'https://uxdesign.cc/feed' },
    ],
  },
  {
    id: 'writing',
    label: 'ライティング',
    icon: '✍️',
    color: '#f59e0b',
    feeds: [
      { name: 'Content Marketing Institute', url: 'https://contentmarketinginstitute.com/blog/feed/' },
      { name: 'Copyblogger',                 url: 'https://copyblogger.com/feed/' },
      { name: 'Ann Handley',                 url: 'https://annhandley.com/feed/' },
    ],
  },
  {
    id: 'video',
    label: '映像制作',
    icon: '🎬',
    color: '#ef4444',
    feeds: [
      { name: 'No Film School',  url: 'https://nofilmschool.com/feed' },
      { name: 'PremiumBeat',     url: 'https://www.premiumbeat.com/blog/feed/' },
      { name: 'Motionographer',  url: 'https://motionographer.com/feed/' },
    ],
  },
  {
    id: 'coding',
    label: 'コーディング',
    icon: '💻',
    color: '#10b981',
    feeds: [
      { name: 'Dev.to',   url: 'https://dev.to/feed' },
      { name: 'Zenn',     url: 'https://zenn.dev/feed' },
      { name: 'Qiita',    url: 'https://qiita.com/popular-items/feed.atom' },
      { name: 'CSS-Tricks Dev', url: 'https://css-tricks.com/feed/' },
    ],
  },
];

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, 10).map(item => ({
      title: (item.title || '').trim(),
      link: item.link || item.guid || '',
      date: item.pubDate || item.isoDate || '',
      description: (item.contentSnippet || item.summary || '')
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 160),
      source: source.name,
    }));
  } catch (err) {
    console.warn(`  ⚠  ${source.name}: ${err.message}`);
    return [];
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function generateHTML(categories, updatedAt) {
  const tabsHTML = categories.map((cat, i) => `
    <button class="tab${i === 0 ? ' active' : ''}" data-target="${cat.id}"
      style="--cat-color:${cat.color}" onclick="switchTab('${cat.id}',this)">
      ${cat.icon} ${cat.label}
      <span class="count">${cat.items.length}</span>
    </button>`).join('');

  const sectionsHTML = categories.map((cat, i) => {
    const cardsHTML = cat.items.length === 0
      ? '<p class="empty">記事を取得できませんでした。しばらくしてから再試行してください。</p>'
      : cat.items.map(item => `
      <article class="card" style="--cat-color:${cat.color}">
        <div class="card-meta">
          <span class="source-badge" style="background:${cat.color}20;color:${cat.color}">${escapeHtml(item.source)}</span>
          <span class="date">${formatDate(item.date)}</span>
        </div>
        <h2 class="card-title">
          <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
        </h2>
        ${item.description ? `<p class="card-desc">${escapeHtml(item.description)}${item.description.length >= 160 ? '…' : ''}</p>` : ''}
        <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="read-btn" style="color:${cat.color}">記事を読む →</a>
      </article>`).join('');

    return `<section id="${cat.id}" class="section${i === 0 ? ' active' : ''}">${cardsHTML}</section>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>トレンドポータル</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0f0f1a;--surface:#1a1a2e;--border:#2d2d52;
      --text:#e2e8f0;--muted:#94a3b8;--radius:12px;
    }
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif;
      background:var(--bg);color:var(--text);min-height:100vh}

    /* ---- header ---- */
    header{background:var(--surface);border-bottom:1px solid var(--border);
      padding:1.25rem 1.5rem;position:sticky;top:0;z-index:100}
    .header-inner{max-width:1200px;margin:0 auto;display:flex;
      align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
    .logo{font-size:1.25rem;font-weight:700;letter-spacing:-0.02em}
    .logo span{background:linear-gradient(90deg,#6366f1,#ec4899);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .updated{font-size:.75rem;color:var(--muted)}

    /* ---- tabs ---- */
    .tabs-wrapper{background:var(--surface);border-bottom:1px solid var(--border);
      position:sticky;top:62px;z-index:90;overflow-x:auto;-webkit-overflow-scrolling:touch}
    .tabs{max-width:1200px;margin:0 auto;display:flex;gap:.375rem;padding:.75rem 1.5rem}
    .tab{background:transparent;border:1px solid var(--border);border-radius:999px;
      color:var(--muted);cursor:pointer;font-size:.82rem;padding:.45rem .9rem;
      white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;
      transition:all .15s;line-height:1}
    .tab:hover{border-color:var(--cat-color);color:var(--cat-color)}
    .tab.active{background:var(--cat-color);border-color:var(--cat-color);color:#fff}
    .count{background:rgba(255,255,255,.2);border-radius:999px;
      font-size:.68rem;padding:.1rem .4rem}

    /* ---- main grid ---- */
    main{max-width:1200px;margin:0 auto;padding:1.5rem}
    .section{display:none}
    .section.active{display:grid;gap:1rem;
      grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}

    /* ---- card ---- */
    .card{background:var(--surface);border:1px solid var(--border);
      border-radius:var(--radius);padding:1.25rem;
      transition:border-color .15s,transform .15s;
      display:flex;flex-direction:column;gap:.55rem}
    .card:hover{border-color:var(--cat-color);transform:translateY(-2px)}
    .card-meta{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    .source-badge{font-size:.68rem;font-weight:600;padding:.2rem .55rem;border-radius:999px}
    .date{font-size:.72rem;color:var(--muted)}
    .card-title{font-size:.93rem;font-weight:600;line-height:1.5}
    .card-title a{color:var(--text);text-decoration:none}
    .card-title a:hover{color:var(--cat-color)}
    .card-desc{font-size:.78rem;color:var(--muted);line-height:1.65;flex:1}
    .read-btn{font-size:.78rem;font-weight:600;text-decoration:none;margin-top:.2rem}
    .empty{color:var(--muted);padding:2rem;text-align:center;grid-column:1/-1}

    /* ---- footer ---- */
    footer{text-align:center;color:var(--muted);font-size:.72rem;padding:2rem 1rem}

    @media(max-width:600px){
      .section.active{grid-template-columns:1fr}
      header{padding:1rem}
      .tabs{padding:.6rem 1rem}
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <div class="logo">🔥 <span>トレンドポータル</span></div>
      <div class="updated">最終更新: ${updatedAt}</div>
    </div>
  </header>
  <div class="tabs-wrapper">
    <div class="tabs">${tabsHTML}</div>
  </div>
  <main>${sectionsHTML}</main>
  <footer>毎朝9時 JST に自動更新 — サポーター向けトレンド情報ポータル</footer>
  <script>
    function switchTab(id, btn) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(id).classList.add('active');
    }
  </script>
</body>
</html>`;
}

async function main() {
  console.log('フィードを取得中...\n');

  const updatedAt = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' JST';

  const categories = await Promise.all(
    CATEGORIES.map(async cat => {
      console.log(`[${cat.label}]`);
      const results = await Promise.all(cat.feeds.map(f => fetchFeed(f)));
      const items = results
        .flat()
        .filter(item => item.title && item.link)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);
      console.log(`  → ${items.length} 件取得\n`);
      return { ...cat, items };
    })
  );

  const html = generateHTML(categories, updatedAt);

  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`✅ dist/index.html を生成しました（合計 ${total} 件）`);
}

main().catch(err => { console.error(err); process.exit(1); });
