const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const CATEGORIES = [
  {
    id: 'sns',
    label: 'SNSマーケティング',
    icon: '📱',
    color: '#6366f1',
    feeds: [
      { name: 'DIGIDAY Japan', url: 'https://digiday.jp/feed/' },
      { name: 'AdverTimes',    url: 'https://www.advertimes.com/feed/' },
      { name: 'LISKUL',        url: 'https://liskul.com/feed' },
      { name: 'HubSpot Japan', url: 'https://blog.hubspot.jp/marketing/rss.xml' },
      { name: 'ミエルカ',      url: 'https://mieru-ca.com/blog/feed/' },
    ],
  },
  {
    id: 'design',
    label: 'WEBデザイン',
    icon: '🎨',
    color: '#ec4899',
    feeds: [
      { name: 'Webクリエイターボックス', url: 'https://www.webcreatorbox.com/feed' },
      { name: 'SeleQt',                  url: 'https://www.seleqt.net/feed/' },
      { name: 'baigie',                  url: 'https://baigie.me/officialblog/feed/' },
      { name: 'Developers.IO',           url: 'https://dev.classmethod.jp/feed/' },
      { name: 'LIG',                     url: 'https://liginc.co.jp/feed' },
    ],
  },
  {
    id: 'writing',
    label: 'ライティング',
    icon: '✍️',
    color: '#f59e0b',
    feeds: [
      { name: 'LISKUL',     url: 'https://liskul.com/feed' },
      { name: 'ミエルカ',   url: 'https://mieru-ca.com/blog/feed/' },
      { name: 'AdverTimes', url: 'https://www.advertimes.com/feed/' },
      { name: 'HubSpot Japan', url: 'https://blog.hubspot.jp/marketing/rss.xml' },
    ],
  },
  {
    id: 'video',
    label: '映像制作',
    icon: '🎬',
    color: '#ef4444',
    feeds: [
      { name: 'VIDEO SALON', url: 'https://videosalon.jp/feed/' },
      { name: 'AV Watch',    url: 'https://av.watch.impress.co.jp/data/rss/1.0/avw/feed.rdf' },
    ],
  },
  {
    id: 'coding',
    label: 'コーディング',
    icon: '💻',
    color: '#10b981',
    feeds: [
      { name: 'Zenn',            url: 'https://zenn.dev/feed' },
      { name: 'Qiita',           url: 'https://qiita.com/popular-items/feed.atom' },
      { name: 'gihyo.jp',        url: 'https://gihyo.jp/feed/atom' },
      { name: 'Developers.IO',   url: 'https://dev.classmethod.jp/feed/' },
    ],
  },
];

// タイトルに日本語文字が含まれるか判定
function hasJapanese(text) {
  return /[぀-ヿ㐀-䶿一-鿿]/.test(text);
}

// カテゴリ関連キーワード（タイトル＋説明文に1つ以上含まれれば通過）
const KEYWORDS = {
  sns: ['SNS', 'Instagram', 'インスタ', 'Twitter', 'TikTok', 'YouTube', 'Facebook', 'LINE',
        'マーケティング', 'ソーシャル', 'フォロワー', '広告', 'インフルエンサー', 'エンゲージメント',
        'リール', 'バズ', '投稿', 'アカウント', 'ブランド', 'X（旧', 'プロモーション'],
  design: ['デザイン', 'UI', 'UX', 'CSS', 'Figma', 'フィグマ', 'レイアウト', 'フォント',
           'カラー', 'Webサイト', 'ウェブサイト', 'ビジュアル', 'グラフィック', 'ロゴ',
           'バナー', 'ワイヤー', 'プロトタイプ', 'アクセシビリティ', 'タイポグラフィ'],
  writing: ['ライティング', 'コピー', '文章', '記事', 'コンテンツ', 'SEO', 'ブログ', '執筆',
            'テキスト', '見出し', '構成', 'キャッチコピー', '読者', '言葉', 'メディア',
            'ターゲット', 'ペルソナ', 'ストーリー'],
  video: ['動画', '映像', '撮影', '編集', 'カメラ', 'After Effects', 'Premiere', 'ショート動画',
          'YouTube', 'リール', 'Vlog', '映画', '照明', '音響', 'エフェクト', 'モーション',
          '配信', 'ライブ', 'プロダクション', '字幕', 'ドローン', 'レンズ', 'シネマ',
          'スタビライザー', 'ジンバル', 'コーデック', 'レンダリング', '収録'],
  coding: ['プログラミング', 'コーディング', 'JavaScript', 'TypeScript', 'Python', 'React',
           'Vue', 'HTML', 'CSS', 'エンジニア', '開発', 'API', 'フレームワーク', 'GitHub',
           'Node', 'AI', 'LLM', 'コード', 'Web開発', 'フロントエンド', 'バックエンド'],
};

function isRelevant(item, categoryId) {
  const text = item.title + ' ' + (item.description || '');
  return KEYWORDS[categoryId].some(kw => text.includes(kw));
}

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
        .slice(0, 200),
      source: source.name,
    }));
  } catch (err) {
    console.warn(`  ⚠  ${source.name}: ${err.message}`);
    return [];
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function enrichBatch(articles, categoryLabel) {
  const articleList = articles.map((a, i) =>
    `【記事${i + 1}】\nタイトル: ${a.title}\n概要: ${a.description || '情報なし'}`
  ).join('\n\n');

  const prompt = `あなたはWEBスクール（SNSマーケティング・WEBデザイン・ライティング・映像制作・コーディングを教える）のコンテンツキュレーターです。
以下の「${categoryLabel}」カテゴリの記事を、スクールの受講生に役立つ形でDiscordに紹介するコンテンツを作成してください。

${articleList}

各記事についてJSON配列で返してください（日本語で、JSONのみ返してください。余分なテキスト不要）：
[
  {
    "catchphrase": "受講生の目を引くキャッチコピー（20〜25文字）",
    "summary": "記事の内容を2文で要約（日本語）",
    "usefulness": "受講生がこの記事から学べること・活用できること（1文、日本語）",
    "discord": "Discordに投稿できる紹介文（絵文字入り・URLを除く・3〜4行・日本語）"
  }
]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('レスポンスにJSONが見つかりません');
  const results = JSON.parse(match[0]);
  return articles.map((a, i) => ({ ...a, ai: results[i] || null }));
}

async function enrichWithAI(items, categoryLabel) {
  if (!GEMINI_KEY) {
    console.log('  (GEMINI_API_KEY未設定 — AI要約をスキップ)');
    return items;
  }
  const BATCH = 5;
  const enriched = [];
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    try {
      const result = await enrichBatch(batch, categoryLabel);
      enriched.push(...result);
      console.log(`  AI処理: ${Math.min(i + BATCH, items.length)}/${items.length}件`);
    } catch (err) {
      console.warn(`  ⚠ AI処理失敗: ${err.message}`);
      enriched.push(...batch);
    }
    if (i + BATCH < items.length) await sleep(4500);
  }
  return enriched;
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
      ${cat.icon} ${cat.label} <span class="count">${cat.items.length}</span>
    </button>`).join('');

  const sectionsHTML = categories.map((cat, i) => {
    const cardsHTML = cat.items.length === 0
      ? '<p class="empty">記事を取得できませんでした。しばらくしてから再試行してください。</p>'
      : cat.items.map(item => {
          const hasAI = item.ai != null;
          const title = hasAI ? escapeHtml(item.ai.catchphrase) : escapeHtml(item.title);
          const summary = hasAI ? escapeHtml(item.ai.summary) : (item.description ? escapeHtml(item.description) + (item.description.length >= 200 ? '…' : '') : '');
          const useful = hasAI ? escapeHtml(item.ai.usefulness) : '';
          const discordEncoded = hasAI
            ? encodeURIComponent(`${item.ai.discord}\n\n🔗 ${item.link}`)
            : '';

          return `
        <article class="card" style="--cat-color:${cat.color}">
          <div class="card-meta">
            <span class="source-badge" style="background:${cat.color}20;color:${cat.color}">${escapeHtml(item.source)}</span>
            <span class="date">${formatDate(item.date)}</span>
          </div>
          <h2 class="card-title">
            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${title}</a>
          </h2>
          ${summary ? `<p class="card-desc">${summary}</p>` : ''}
          ${useful ? `<p class="card-useful"><span class="useful-icon">💡</span>${useful}</p>` : ''}
          <div class="card-actions">
            ${hasAI ? `<button class="copy-btn" data-post="${discordEncoded}" style="--cat-color:${cat.color}">📋 Discordにコピー</button>` : ''}
            <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="read-btn" style="color:${cat.color}">記事を読む →</a>
          </div>
        </article>`;
        }).join('');

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

    header{background:var(--surface);border-bottom:1px solid var(--border);
      padding:1.25rem 1.5rem;position:sticky;top:0;z-index:100}
    .header-inner{max-width:1200px;margin:0 auto;display:flex;
      align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
    .logo{font-size:1.25rem;font-weight:700;letter-spacing:-0.02em}
    .logo span{background:linear-gradient(90deg,#6366f1,#ec4899);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .updated{font-size:.75rem;color:var(--muted)}

    .tabs-wrapper{background:var(--surface);border-bottom:1px solid var(--border);
      position:sticky;top:62px;z-index:90;overflow-x:auto;-webkit-overflow-scrolling:touch}
    .tabs{max-width:1200px;margin:0 auto;display:flex;gap:.375rem;padding:.75rem 1.5rem}
    .tab{background:transparent;border:1px solid var(--border);border-radius:999px;
      color:var(--muted);cursor:pointer;font-size:.82rem;padding:.45rem .9rem;
      white-space:nowrap;display:inline-flex;align-items:center;gap:.35rem;
      transition:all .15s;line-height:1}
    .tab:hover{border-color:var(--cat-color);color:var(--cat-color)}
    .tab.active{background:var(--cat-color);border-color:var(--cat-color);color:#fff}
    .count{background:rgba(255,255,255,.2);border-radius:999px;font-size:.68rem;padding:.1rem .4rem}

    main{max-width:1200px;margin:0 auto;padding:1.5rem}
    .section{display:none}
    .section.active{display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}

    .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
      padding:1.25rem;transition:border-color .15s,transform .15s;
      display:flex;flex-direction:column;gap:.6rem}
    .card:hover{border-color:var(--cat-color);transform:translateY(-2px)}
    .card-meta{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
    .source-badge{font-size:.68rem;font-weight:600;padding:.2rem .55rem;border-radius:999px}
    .date{font-size:.72rem;color:var(--muted)}
    .card-title{font-size:.95rem;font-weight:700;line-height:1.5}
    .card-title a{color:var(--text);text-decoration:none}
    .card-title a:hover{color:var(--cat-color)}
    .card-desc{font-size:.8rem;color:var(--muted);line-height:1.65;flex:1}
    .card-useful{font-size:.78rem;color:var(--muted);line-height:1.5;
      background:rgba(255,255,255,.04);border-radius:8px;padding:.5rem .6rem;
      display:flex;gap:.4rem;align-items:flex-start}
    .useful-icon{flex-shrink:0}
    .card-actions{display:flex;align-items:center;gap:.6rem;margin-top:.2rem;flex-wrap:wrap}
    .copy-btn{background:var(--cat-color);border:none;border-radius:8px;
      color:#fff;cursor:pointer;font-size:.78rem;font-weight:600;
      padding:.45rem .8rem;transition:opacity .15s;white-space:nowrap}
    .copy-btn:hover{opacity:.85}
    .copy-btn.copied{background:#10b981}
    .read-btn{font-size:.78rem;font-weight:600;text-decoration:none;margin-left:auto;white-space:nowrap}
    .empty{color:var(--muted);padding:2rem;text-align:center;grid-column:1/-1}
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
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const text = decodeURIComponent(this.dataset.post);
        navigator.clipboard.writeText(text).then(() => {
          const orig = this.textContent;
          this.textContent = '✅ コピーしました！';
          this.classList.add('copied');
          setTimeout(() => {
            this.textContent = orig;
            this.classList.remove('copied');
          }, 2000);
        });
      });
    });
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

  // RSSフェッチは並列で
  const rawCategories = await Promise.all(
    CATEGORIES.map(async cat => {
      console.log(`[RSS] ${cat.label}`);
      const results = await Promise.all(cat.feeds.map(f => fetchFeed(f)));
      const all = results.flat().filter(item => item.title && item.link);
      const items = all
        .filter(item => hasJapanese(item.title))
        .filter(item => isRelevant(item, cat.id))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 20);
      console.log(`  → ${all.length}件取得 → フィルタ後 ${items.length}件`);
      return { ...cat, items };
    })
  );

  // AI処理はレート制限のため順番に
  console.log('\nAI処理を開始...\n');
  const categories = [];
  for (const cat of rawCategories) {
    console.log(`[AI] ${cat.label}`);
    const enrichedItems = await enrichWithAI(cat.items, cat.label);
    categories.push({ ...cat, items: enrichedItems });
  }

  const html = generateHTML(categories, updatedAt);
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'index.html'), html, 'utf8');

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  console.log(`\n✅ dist/index.html を生成しました（合計 ${total} 件）`);
}

main().catch(err => { console.error(err); process.exit(1); });
