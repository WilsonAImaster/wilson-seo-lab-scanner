# Open SEO Lab Scanner

一個免費開源的 SEO 健檢 MVP，可以部署到 Cloudflare Pages。

**線上 SEO 健檢頁：** https://wilson-ai-lab.pages.dev/tools/lab-scan/

輸入一個公開網站網址後，它會由 Cloudflare Pages Function 實際抓取首頁，檢查常見 SEO 訊號，然後產生一份簡短的 Lab Brief：包含分數、掃描證據、檢查維度與優先修復建議。

這個專案由 Wilson AI Lab 做成開源範本，目標是讓大家看懂一個 SEO 健檢工具如何從 demo UI 變成可以部署、可以 fork、可以改造成自己品牌的 MVP。

## 線上 Demo 與開源核心的差異

這個 GitHub repo 是開源的 scanner core，預設不會儲存掃描紀錄，也不會寄送 email 報告。

Wilson AI Lab 線上 demo 可能會加入 production-only 的 lead capture 功能，例如使用者同意後填寫 email 來解鎖完整報告，並透過寄信服務把報告寄出。這些 production 功能刻意和開源 starter 分開，讓公開 repo 保持簡單、容易 fork，也方便檢查是否有敏感資料。

## MVP 狀態

這個 repo 已經可以作為完整的開源 MVP 分享。

已包含：

- 輸入公開網站網址的靜態前端
- Cloudflare Pages Function 即時掃描首頁
- 分數、掃描證據、檢查維度與優先問題輸出
- 針對本機/私有目標的 URL 防護
- 中文與英文 README
- 架構與安全說明
- Cloudflare Pages 部署設定

預設不包含：

- email 名單收集或寄信
- 資料庫儲存
- 分析追蹤或再行銷像素
- 帳號登入
- Wilson AI Lab production 私有素材

這些功能刻意留在開源核心之外，讓 repo 維持乾淨、容易 fork，也適合公開分享。

## 線上 Demo

目前可先試 Wilson AI Lab 版本：

```text
https://wilson-ai-lab.pages.dev/tools/lab-scan/
```

如果你想改成自己的品牌版，可以 fork 這個 GitHub repo 再自行部署。

## 這個工具會檢查什麼

- HTTP 狀態碼、HTTPS、Content-Type、回應時間
- `title`、`meta description`、`H1`、`canonical`、robots meta
- `robots.txt` 與 `sitemap.xml`
- Open Graph 社群分享訊號
- JSON-LD 結構化資料
- 圖片 alt 覆蓋率
- 內部連結與外部連結數量
- 首頁可讀文字量

## 目前還沒有做什麼

- 不會寄送 email 報告
- 不會儲存掃描紀錄
- 尚未串接 Google Search Console
- 不會修改被掃描的網站
- 不保證 SEO 排名
- 還不是完整技術 SEO 稽核工具

這些功能都可以作為後續擴充方向。

## 專案結構

```text
.
├── index.html
├── assets/
│   ├── app.js
│   ├── lab-grid.svg
│   ├── logo.svg
│   └── styles.css
├── functions/
│   └── api/
│       └── lab-scan.js
├── ARCHITECTURE.md
├── SECURITY.md
├── wrangler.jsonc
└── package.json
```

## 本機執行

先 clone 專案：

```bash
git clone https://github.com/WilsonAImaster/wilson-seo-lab-scanner.git
cd wilson-seo-lab-scanner
```

用 Wrangler 啟動 Cloudflare Pages 本機環境：

```bash
npx wrangler pages dev . --compatibility-date=2026-06-24
```

打開：

```text
http://localhost:8788
```

可以輸入公開網站測試，例如：

```text
https://example.com
```

## 部署到 Cloudflare Pages

用 Wrangler 直接部署：

```bash
npx wrangler pages deploy . --project-name open-seo-lab-scanner
```

也可以在 Cloudflare Pages 後台連接 GitHub repo，輸出目錄使用：

```text
/
```

Cloudflare Pages 會自動偵測：

```text
functions/api/lab-scan.js
```

也就是 `/api/lab-scan` 這個 API route。

## API 範例

```bash
curl -X POST "http://localhost:8788/api/lab-scan" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","language":"zh"}'
```

回傳格式會像這樣：

```json
{
  "reportId": "OSL-123ABC",
  "score": 82,
  "grade": {},
  "dimensions": [],
  "issues": [],
  "summary": {}
}
```

## 隱私說明

這個開源核心不會儲存使用者輸入的網址、email 或掃描結果。網址只會被送到 Cloudflare Pages Function，用於當次掃描。

Wilson AI Lab 線上 demo 若提供「填寫 email 領取完整報告」功能，則會依該線上站的隱私權政策處理 email、掃描網址與報告摘要。

如果你之後加上 email 報告、資料庫、網站分析或會員功能，請記得補正式隱私權政策。

## 適合怎麼改

你可以拿這個專案做：

- 自己品牌的 SEO 健檢頁
- 客戶網站健檢入口
- Cloudflare Pages Function 範例
- AI Agent SEO workflow 的第一步
- WordPress / GSC / Notion / Email 報告整合

## 後續 Roadmap

- Cloudflare Turnstile 防濫用
- 掃描結果儲存
- Email / PDF 報告
- Google Search Console 串接
- 多頁 crawl
- WordPress title/meta/schema patch
- 把掃描結果轉成 AI agent 任務

## 授權

MIT
