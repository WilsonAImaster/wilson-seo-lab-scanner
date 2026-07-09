const MAX_HTML_CHARS = 900000;
const USER_AGENT = "OpenSEOLabScanner/0.1";

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const language = body.language === "en" ? "en" : "zh";
    const targetUrl = normalizeTargetUrl(body.url);
    const report = await scanWebsite(targetUrl, language);
    return jsonResponse(report);
  } catch (error) {
    return jsonResponse({ error: error.message || "Scan failed" }, error.status || 500);
  }
}

async function scanWebsite(targetUrl, language) {
  const startedAt = Date.now();
  const inputUrl = targetUrl.href;
  const pageStartedAt = Date.now();
  const response = await fetchWithTimeout(inputUrl, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT
    },
    redirect: "follow"
  }, 12000);
  const responseMs = Date.now() - pageStartedAt;
  const finalUrl = new URL(response.url || inputUrl);

  if (isDeniedHostname(finalUrl.hostname)) {
    throw httpError("Redirected target is not allowed.", 400);
  }

  const contentType = response.headers.get("content-type") || "";
  const rawHtml = await response.text();
  const html = rawHtml.slice(0, MAX_HTML_CHARS);
  const parsed = parseHtmlSignals(html, finalUrl.href);
  const auxiliary = await fetchAuxiliarySignals(finalUrl, parsed.robotsMeta);
  const checks = buildChecks({
    inputUrl,
    finalUrl: finalUrl.href,
    response,
    responseMs,
    contentType,
    rawHtmlLength: rawHtml.length,
    parsed,
    auxiliary
  });
  const score = calculateScore(checks);

  return {
    reportId: `OSL-${hashString(`${finalUrl.href}-${startedAt}`).toString(16).padStart(6, "0").slice(0, 6).toUpperCase()}`,
    scannedAt: new Date(startedAt).toISOString(),
    inputUrl,
    finalUrl: finalUrl.href,
    status: response.status,
    responseMs,
    contentType,
    score,
    grade: buildGrade(score, language),
    dimensions: buildDimensions(checks, language),
    issues: buildIssues(checks, language),
    summary: buildSummary(checks, language)
  };
}

function normalizeTargetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) throw httpError("Please enter a URL.", 400);
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withProtocol);
  } catch (_error) {
    throw httpError("URL format is invalid.", 400);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw httpError("Only HTTP and HTTPS URLs can be scanned.", 400);
  }
  if (url.username || url.password) {
    throw httpError("URLs with embedded credentials are not allowed.", 400);
  }
  if (isDeniedHostname(url.hostname)) {
    throw httpError("This target host is not allowed.", 400);
  }

  url.hash = "";
  return url;
}

function isDeniedHostname(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "metadata.google.internal") return true;
  if (isPrivateIPv4(host)) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return false;
}

function isPrivateIPv4(host) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((part) => part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw httpError("The target website took too long to respond.", 504);
    }
    throw httpError(`Unable to fetch the target website: ${error.message}`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAuxiliarySignals(finalUrl, robotsMeta) {
  const origin = finalUrl.origin;
  const robots = await fetchSmallText(`${origin}/robots.txt`, 5000);
  const sitemapFromRobots = robots.text ? extractSitemapUrl(robots.text, finalUrl) : "";
  const sitemapUrl = sitemapFromRobots || `${origin}/sitemap.xml`;
  const sitemap = await fetchStatus(sitemapUrl, 5000);
  return { robots, sitemap, sitemapUrl, robotsMeta };
}

async function fetchSmallText(url, timeoutMs) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "Accept": "text/plain,*/*;q=0.8",
        "User-Agent": USER_AGENT
      },
      redirect: "follow"
    }, timeoutMs);
    const text = response.ok ? (await response.text()).slice(0, 200000) : "";
    return { ok: response.ok, status: response.status, text, url: response.url || url };
  } catch (error) {
    return { ok: false, status: 0, text: "", url, error: error.message };
  }
}

async function fetchStatus(url, timeoutMs) {
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow"
    }, timeoutMs);
    return { ok: response.ok, status: response.status, url: response.url || url };
  } catch (_headError) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          "Accept": "application/xml,text/xml,text/plain,*/*;q=0.8",
          "Range": "bytes=0-2048",
          "User-Agent": USER_AGENT
        },
        redirect: "follow"
      }, timeoutMs);
      return { ok: response.ok, status: response.status, url: response.url || url };
    } catch (error) {
      return { ok: false, status: 0, url, error: error.message };
    }
  }
}

function extractSitemapUrl(robotsText, baseUrl) {
  const match = robotsText.match(/^sitemap:\s*(\S+)/im);
  if (!match) return "";
  try {
    const url = new URL(match[1], baseUrl.href);
    if (!["http:", "https:"].includes(url.protocol) || isDeniedHostname(url.hostname)) return "";
    return url.href;
  } catch (_error) {
    return "";
  }
}

function parseHtmlSignals(html, baseUrl) {
  const title = cleanText(firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const metaTags = collectTags(html, "meta").map(parseAttrs);
  const linkTags = collectTags(html, "link").map(parseAttrs);
  const imgTags = collectTags(html, "img").map(parseAttrs);
  const anchorTags = collectTags(html, "a").map(parseAttrs);
  const h1s = collectPairedText(html, "h1");
  const description = findMeta(metaTags, "name", "description");
  const robotsMeta = findMeta(metaTags, "name", "robots") || findMeta(metaTags, "name", "googlebot");
  const viewport = findMeta(metaTags, "name", "viewport");
  const ogTitle = findMeta(metaTags, "property", "og:title");
  const ogDescription = findMeta(metaTags, "property", "og:description");
  const ogImage = findMeta(metaTags, "property", "og:image");
  const canonical = findCanonical(linkTags, baseUrl);
  const htmlLang = firstMatch(html, /<html\b[^>]*\blang=["']?([^"'\s>]+)/i);
  const jsonLd = collectJsonLd(html);
  const links = classifyLinks(anchorTags, baseUrl);
  const images = summarizeImages(imgTags);
  const visibleText = getVisibleText(html);

  return {
    title,
    description: cleanText(description),
    robotsMeta: cleanText(robotsMeta).toLowerCase(),
    viewport: cleanText(viewport),
    ogTitle: cleanText(ogTitle),
    ogDescription: cleanText(ogDescription),
    ogImage: cleanText(ogImage),
    canonical,
    htmlLang: cleanText(htmlLang),
    h1s,
    jsonLd,
    links,
    images,
    wordCount: countWords(visibleText),
    textLength: visibleText.length
  };
}

function collectTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) || [];
}

function collectPairedText(html, tagName) {
  const items = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  let match = pattern.exec(html);
  while (match) {
    items.push(cleanText(match[1]));
    match = pattern.exec(html);
  }
  return items.filter(Boolean);
}

function parseAttrs(tag) {
  const attrs = {};
  const body = tag.replace(/^<\s*[\w:-]+/i, "").replace(/\/?>$/i, "");
  body.replace(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_match, name, dq, sq, bare) => {
    attrs[name.toLowerCase()] = decodeEntities(dq || sq || bare || "");
    return "";
  });
  return attrs;
}

function findMeta(metaTags, key, value) {
  const lowerValue = value.toLowerCase();
  const tag = metaTags.find((attrs) => (attrs[key] || "").toLowerCase() === lowerValue);
  return tag?.content || "";
}

function findCanonical(linkTags, baseUrl) {
  const tag = linkTags.find((attrs) => (attrs.rel || "").toLowerCase().split(/\s+/).includes("canonical"));
  if (!tag?.href) return "";
  try {
    return new URL(tag.href, baseUrl).href;
  } catch (_error) {
    return tag.href;
  }
}

function collectJsonLd(html) {
  const items = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match = pattern.exec(html);
  while (match) {
    const attrs = parseAttrs(`<script ${match[1]}>`);
    if ((attrs.type || "").toLowerCase() !== "application/ld+json") {
      match = pattern.exec(html);
      continue;
    }
    const raw = decodeEntities(match[2].trim());
    let types = [];
    try {
      types = extractJsonLdTypes(JSON.parse(raw));
    } catch (_error) {
      types = [];
    }
    items.push({ valid: types.length > 0, types });
    match = pattern.exec(html);
  }
  return items;
}

function extractJsonLdTypes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return [...new Set(value.flatMap(extractJsonLdTypes))];
  if (typeof value !== "object") return [];
  const ownType = value["@type"] ? [String(value["@type"])] : [];
  const graphTypes = Array.isArray(value["@graph"]) ? value["@graph"].flatMap(extractJsonLdTypes) : [];
  return [...new Set([...ownType, ...graphTypes])];
}

function classifyLinks(anchorTags, baseUrl) {
  const base = new URL(baseUrl);
  const links = [];
  anchorTags.forEach((attrs) => {
    const href = attrs.href || "";
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) return;
    try {
      const url = new URL(href, base.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      links.push({
        href: url.href,
        internal: url.hostname === base.hostname,
        nofollow: (attrs.rel || "").toLowerCase().includes("nofollow")
      });
    } catch (_error) {
      // Ignore malformed hrefs.
    }
  });
  return {
    total: links.length,
    internal: links.filter((link) => link.internal).length,
    external: links.filter((link) => !link.internal).length,
    nofollow: links.filter((link) => link.nofollow).length
  };
}

function summarizeImages(imgTags) {
  const total = imgTags.length;
  const missingAlt = imgTags.filter((attrs) => !String(attrs.alt || "").trim()).length;
  return {
    total,
    missingAlt,
    altCoverage: total ? Math.round(((total - missingAlt) / total) * 100) : 100
  };
}

function getVisibleText(html) {
  return cleanText(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
  );
}

function buildChecks(input) {
  const { inputUrl, finalUrl, response, responseMs, contentType, rawHtmlLength, parsed, auxiliary } = input;
  return {
    inputUrl,
    finalUrl,
    redirected: normalizeComparableUrl(inputUrl) !== normalizeComparableUrl(finalUrl),
    status: response.status,
    ok: response.ok,
    https: new URL(finalUrl).protocol === "https:",
    responseMs,
    contentType,
    isHtml: /text\/html|application\/xhtml\+xml/i.test(contentType),
    rawHtmlLength,
    title: parsed.title,
    titleLength: parsed.title.length,
    description: parsed.description,
    descriptionLength: parsed.description.length,
    h1s: parsed.h1s,
    canonical: parsed.canonical,
    canonicalMatches: parsed.canonical ? normalizeComparableUrl(parsed.canonical) === normalizeComparableUrl(finalUrl) : false,
    robotsMeta: parsed.robotsMeta,
    noindex: /\bnoindex\b/i.test(parsed.robotsMeta),
    nofollow: /\bnofollow\b/i.test(parsed.robotsMeta),
    viewport: parsed.viewport,
    htmlLang: parsed.htmlLang,
    ogTitle: parsed.ogTitle,
    ogDescription: parsed.ogDescription,
    ogImage: parsed.ogImage,
    jsonLdCount: parsed.jsonLd.length,
    jsonLdValidCount: parsed.jsonLd.filter((item) => item.valid).length,
    jsonLdTypes: [...new Set(parsed.jsonLd.flatMap((item) => item.types))],
    images: parsed.images,
    links: parsed.links,
    wordCount: parsed.wordCount,
    textLength: parsed.textLength,
    robotsStatus: auxiliary.robots.status,
    robotsOk: auxiliary.robots.ok,
    sitemapStatus: auxiliary.sitemap.status,
    sitemapOk: auxiliary.sitemap.ok,
    sitemapUrl: auxiliary.sitemapUrl
  };
}

function calculateScore(checks) {
  let score = 100;
  if (!checks.ok) score -= 24;
  if (!checks.isHtml) score -= 12;
  if (!checks.https) score -= 12;
  if (!checks.title) score -= 14;
  else if (checks.titleLength < 20 || checks.titleLength > 65) score -= 5;
  if (!checks.description) score -= 12;
  else if (checks.descriptionLength < 70 || checks.descriptionLength > 165) score -= 5;
  if (checks.h1s.length === 0) score -= 10;
  if (checks.h1s.length > 1) score -= 5;
  if (!checks.canonical) score -= 7;
  else if (!checks.canonicalMatches) score -= 4;
  if (checks.noindex) score -= 22;
  if (!checks.viewport) score -= 4;
  if (!checks.htmlLang) score -= 3;
  if (!checks.ogTitle) score -= 3;
  if (!checks.ogDescription) score -= 3;
  if (!checks.ogImage) score -= 2;
  if (checks.jsonLdCount === 0) score -= 6;
  if (checks.images.total > 0 && checks.images.altCoverage < 70) score -= 8;
  else if (checks.images.missingAlt > 0) score -= 3;
  if (checks.wordCount < 250) score -= 8;
  if (checks.links.internal < 3) score -= 5;
  if (!checks.robotsOk) score -= 3;
  if (!checks.sitemapOk) score -= 5;
  if (checks.responseMs > 3000) score -= 8;
  else if (checks.responseMs > 1500) score -= 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildDimensions(checks, language) {
  const zh = language !== "en";
  return [
    {
      label: zh ? "技術可讀性" : "Technical Readability",
      helper: `${checks.status} / ${checks.https ? "HTTPS" : "HTTP"} / ${checks.responseMs}ms`,
      score: clampScore((checks.ok ? 22 : 0) + (checks.https ? 16 : 0) + (checks.robotsOk ? 12 : 0) + (checks.sitemapOk ? 12 : 0) + (!checks.noindex ? 18 : 0) + (checks.canonical ? 10 : 0) + (checks.responseMs <= 1500 ? 10 : checks.responseMs <= 3000 ? 5 : 0))
    },
    {
      label: zh ? "搜尋摘要" : "Search Snippet",
      helper: zh ? `title ${checks.titleLength} 字 / description ${checks.descriptionLength} 字` : `title ${checks.titleLength} chars / description ${checks.descriptionLength} chars`,
      score: clampScore((checks.title ? 22 : 0) + (checks.titleLength >= 20 && checks.titleLength <= 65 ? 8 : 0) + (checks.description ? 22 : 0) + (checks.descriptionLength >= 70 && checks.descriptionLength <= 165 ? 8 : 0) + (checks.h1s.length === 1 ? 18 : checks.h1s.length > 1 ? 9 : 0) + (checks.ogTitle && checks.ogDescription ? 10 : 0) + (checks.wordCount >= 250 ? 12 : 0))
    },
    {
      label: zh ? "內容結構" : "Content Structure",
      helper: `H1 ${checks.h1s.length} / Schema ${checks.jsonLdCount} / alt ${checks.images.altCoverage}%`,
      score: clampScore((checks.jsonLdCount > 0 ? 20 : 0) + (checks.links.internal >= 3 ? 20 : checks.links.internal * 6) + (checks.images.altCoverage >= 90 ? 20 : checks.images.altCoverage >= 70 ? 12 : 4) + (checks.htmlLang ? 10 : 0) + (checks.viewport ? 10 : 0) + (checks.isHtml ? 20 : 0))
    },
    {
      label: zh ? "回測準備" : "Feedback Readiness",
      helper: `robots ${checks.robotsStatus || "-"} / sitemap ${checks.sitemapStatus || "-"}`,
      score: clampScore((checks.sitemapOk ? 24 : 0) + (checks.robotsOk ? 16 : 0) + (checks.canonical ? 18 : 0) + (checks.links.internal >= 5 ? 18 : checks.links.internal * 3) + (checks.ok ? 12 : 0) + (!checks.noindex ? 12 : 0))
    }
  ];
}

function buildIssues(checks, language) {
  const zh = language !== "en";
  const issues = [];
  const add = (impact, titleZh, titleEn, riskZh, riskEn, fixZh, fixEn, evidence) => {
    issues.push({ impact, title: zh ? titleZh : titleEn, risk: zh ? riskZh : riskEn, fix: zh ? fixZh : fixEn, evidence });
  };

  if (!checks.ok) add("high", "頁面 HTTP 狀態不是 2xx", "Page status is not 2xx", `目前回傳 ${checks.status}，搜尋引擎與使用者可能無法穩定讀取。`, `The page returns ${checks.status}, so search engines and users may not read it reliably.`, "先修正主頁狀態碼、轉址與伺服器錯誤。", "Fix the homepage status code, redirects, or server errors first.", `status=${checks.status}`);
  if (!checks.isHtml) add("high", "回應內容不像 HTML 頁面", "Response does not look like HTML", "掃描目標不是標準 HTML，SEO 訊號可能無法被正確解析。", "The target is not standard HTML, so SEO signals may not be parsed correctly.", "確認網址指向公開首頁，而不是檔案、API 或阻擋頁。", "Make sure the URL points to a public homepage, not a file, API, or block page.", checks.contentType || "content-type missing");
  if (!checks.https) add("high", "最終網址不是 HTTPS", "Final URL is not HTTPS", "非 HTTPS 會降低信任與瀏覽器安全訊號。", "Non-HTTPS pages reduce trust and browser security signals.", "將首頁與 canonical 統一到 HTTPS。", "Move the homepage and canonical URL to HTTPS.", checks.finalUrl);
  if (checks.noindex) add("high", "頁面包含 noindex", "Page contains noindex", "這會要求搜尋引擎不要收錄此頁。", "This asks search engines not to index the page.", "若首頁需要曝光，移除 robots noindex。", "Remove robots noindex if the homepage should rank.", checks.robotsMeta || "robots noindex");
  if (!checks.title) add("high", "缺少 title", "Missing title", "搜尋結果最重要的標題訊號缺失。", "The most important search result title signal is missing.", "補上包含品牌、服務與主要意圖的 title。", "Add a title containing brand, service, and primary intent.", "title not found");
  else if (checks.titleLength < 20 || checks.titleLength > 65) add("medium", "title 長度需要調整", "Title length needs adjustment", `目前 title 約 ${checks.titleLength} 字，可能太短或太長。`, `Current title is about ${checks.titleLength} characters, which may be too short or too long.`, "把 title 控制在約 20 到 65 字，並放入核心服務。", "Keep the title around 20 to 65 characters and include the core service.", checks.title);
  if (!checks.description) add("high", "缺少 meta description", "Missing meta description", "搜尋摘要沒有明確行動誘因。", "The search snippet lacks a clear action hook.", "補上 70 到 165 字的描述，說明服務對象、成果與 CTA。", "Add a 70 to 165 character description covering audience, outcome, and CTA.", "description not found");
  else if (checks.descriptionLength < 70 || checks.descriptionLength > 165) add("medium", "meta description 長度需要調整", "Meta description length needs adjustment", `目前 description 約 ${checks.descriptionLength} 字。`, `Current description is about ${checks.descriptionLength} characters.`, "讓描述更接近搜尋摘要可讀長度，並加入轉換誘因。", "Move the description closer to snippet-friendly length and add conversion intent.", checks.description);
  if (checks.h1s.length === 0) add("high", "缺少 H1", "Missing H1", "頁面主題對搜尋引擎與使用者不夠明確。", "The page topic is not clear enough for search engines or users.", "補上一個能描述主要服務/價值的 H1。", "Add one H1 that describes the main service or value.", "h1 not found");
  else if (checks.h1s.length > 1) add("medium", "H1 數量過多", "Too many H1 elements", `目前找到 ${checks.h1s.length} 個 H1，主題層級可能混亂。`, `Found ${checks.h1s.length} H1 elements, which can confuse page hierarchy.`, "保留一個主 H1，其餘改成 H2/H3。", "Keep one primary H1 and move the rest to H2/H3.", checks.h1s.slice(0, 3).join(" | "));
  if (!checks.canonical) add("medium", "缺少 canonical", "Missing canonical", "搜尋引擎較難判斷主要版本。", "Search engines may have less guidance on the primary URL version.", "加入指向最終 HTTPS 首頁的 canonical。", "Add a canonical URL pointing to the final HTTPS homepage.", "canonical not found");
  else if (!checks.canonicalMatches) add("medium", "canonical 與最終網址不同", "Canonical differs from final URL", "索引訊號可能被分散到不同網址。", "Indexing signals may be split across URLs.", "確認 canonical、og:url 與實際最終網址一致。", "Align canonical, og:url, and the final URL.", `canonical=${checks.canonical}`);
  if (!checks.sitemapOk) add("medium", "sitemap 未被穩定找到", "Sitemap was not found reliably", "搜尋引擎少了一個理解站點結構的入口。", "Search engines have one less entry point for understanding site structure.", "在 robots.txt 宣告 Sitemap，並確認 sitemap.xml 回傳 200。", "Declare Sitemap in robots.txt and make sure sitemap.xml returns 200.", `${checks.sitemapUrl} -> ${checks.sitemapStatus || "failed"}`);
  if (!checks.robotsOk) add("low", "robots.txt 未被穩定找到", "robots.txt was not found reliably", "爬蟲規則與 sitemap 入口不夠清楚。", "Crawler rules and sitemap discovery are less clear.", "新增 robots.txt，並放入 Sitemap 位置。", "Add robots.txt and include the Sitemap location.", `robots=${checks.robotsStatus || "failed"}`);
  if (checks.jsonLdCount === 0) add("medium", "缺少 JSON-LD 結構化資料", "Missing JSON-LD structured data", "品牌、組織與服務語意沒有被明確標記。", "Brand, organization, and service meaning are not explicitly marked.", "加入 Organization、WebSite 或 Service schema。", "Add Organization, WebSite, or Service schema.", "schema count=0");
  if (checks.images.total > 0 && checks.images.altCoverage < 90) add(checks.images.altCoverage < 70 ? "medium" : "low", "圖片 alt 覆蓋率不足", "Image alt coverage is incomplete", `目前圖片 alt 覆蓋率約 ${checks.images.altCoverage}%。`, `Current image alt coverage is about ${checks.images.altCoverage}%.`, "為主要圖片補上情境型 alt，描述圖片與頁面主題的關係。", "Add contextual alt text to key images and connect them to the page topic.", `${checks.images.missingAlt}/${checks.images.total} missing alt`);
  if (checks.wordCount < 250) add("medium", "首頁可讀文字偏少", "Homepage readable text is thin", `目前約 ${checks.wordCount} 個可讀詞/字元單位。`, `Current readable text is about ${checks.wordCount} token units.`, "補足服務說明、使用情境、信任證明與下一步 CTA。", "Add service explanation, use cases, trust proof, and next-step CTA.", `wordCount=${checks.wordCount}`);
  if (checks.links.internal < 3) add("low", "內部連結偏少", "Internal links are limited", `目前找到 ${checks.links.internal} 個內部連結。`, `Found ${checks.links.internal} internal links.`, "從首屏與內容區連到核心服務、案例、聯絡或工具頁。", "Link from hero and content sections to core services, cases, contact, or tools.", `internalLinks=${checks.links.internal}`);
  if (checks.responseMs > 1500) add(checks.responseMs > 3000 ? "high" : "medium", "首頁回應時間偏慢", "Homepage response time is slow", `這次從邊緣掃描量到約 ${checks.responseMs}ms。`, `This edge scan measured about ${checks.responseMs}ms.`, "檢查快取、圖片、主機回應與阻塞資源。", "Review caching, images, origin response, and blocking assets.", `responseMs=${checks.responseMs}`);
  if (issues.length === 0) add("low", "基礎 SEO 訊號完整", "Core SEO signals look complete", "這次掃描沒有發現高優先級阻塞。", "This scan did not find high-priority blockers.", "下一步可接 GSC 找高曝光低點擊頁，建立持續回測節奏。", "Next, connect GSC to find high-impression low-CTR pages and create a feedback loop.", "score-ready");
  return issues.sort((a, b) => impactRank(a.impact) - impactRank(b.impact)).slice(0, 8);
}

function buildGrade(score, language) {
  const zh = language !== "en";
  if (score >= 86) return { badge: "Grade A", title: zh ? "可擴張的 Lab 基礎" : "Scalable Lab Foundation", text: zh ? "主要首頁 SEO 訊號完整，可以進一步接 GSC 與 agent 任務回測。" : "Core homepage SEO signals are in place. Next, connect GSC and agent task feedback.", color: "#0f766e" };
  if (score >= 72) return { badge: "Grade B", title: zh ? "適合進入 Lab Sprint" : "Ready for a Lab Sprint", text: zh ? "基礎訊號可被搜尋引擎理解，但仍有幾個會影響摘要、索引或修復節奏的項目。" : "Core signals are readable, but a few items still affect snippets, indexing, or repair rhythm.", color: "#2563eb" };
  return { badge: "Grade C", title: zh ? "需要先建立訊號底座" : "Needs a Signal Foundation", text: zh ? "首頁可讀性、摘要或技術訊號仍有明顯缺口，建議先處理高影響項目。" : "Homepage readability, snippets, or technical signals still have clear gaps. Start with high-impact items.", color: "#b42318" };
}

function buildSummary(checks, language) {
  const zh = language !== "en";
  return {
    title: checks.title || (zh ? "未找到 title" : "No title found"),
    description: checks.description || (zh ? "未找到 description" : "No description found"),
    h1: checks.h1s[0] || (zh ? "未找到 H1" : "No H1 found"),
    canonical: checks.canonical || (zh ? "未找到 canonical" : "No canonical found"),
    robots: checks.robotsOk ? "OK" : zh ? "未找到或無法讀取" : "Missing or unreadable",
    sitemap: checks.sitemapOk ? "OK" : zh ? "未找到或無法讀取" : "Missing or unreadable"
  };
}

function normalizeComparableUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href.replace(/\/$/, "");
  } catch (_error) {
    return value;
  }
}

function impactRank(impact) {
  if (impact === "high") return 0;
  if (impact === "medium") return 1;
  return 2;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstMatch(value, pattern) {
  const match = value.match(pattern);
  return match ? match[1] || "" : "";
}

function cleanText(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, num) => String.fromCodePoint(parseInt(num, 10)));
}

function countWords(value) {
  const matches = value.match(/[A-Za-z0-9\u00C0-\u024F]+|[\u4E00-\u9FFF]/g);
  return matches ? matches.length : 0;
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function jsonResponse(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
