(() => {
"use strict";
const tg = window.Telegram && window.Telegram.WebApp;
try { if (tg) { tg.ready(); tg.expand(); } } catch (e) {}
// initData also arrives in the URL hash, so downloads still work if telegram-web-app.js fails to load.
const initData = (tg && tg.initData) || new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") || "";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const I18N = {
  fa: { home:"صفحه اصلی", links:"لینک‌ها", search:"جستجو در مطالب…", all:"همه", download:"دانلود", downloads:"دانلودها",
        latest:"تازه‌ترین مطالب", count:"{n} مطلب", more:"نمایش بیشتر", related:"مطالب مرتبط", share:"اشتراک‌گذاری", read:"مشاهده", files:"{n} فایل",
        sent:"فایل در چت ربات برایتان ارسال شد ✅", sentdel:"فایل ارسال شد ✅ (بعد از {t} از چت حذف می‌شود)",
        delnote:"برای جلوگیری از مشکلات کپی‌رایت، فایل‌ها {t} پس از ارسال از چت حذف می‌شوند؛ همان لحظه ذخیره‌شان کنید.",
        err:"ارسال نشد. دوباره تلاش کنید.", start:"اول ربات را استارت کنید تا بتواند فایل را بفرستد", empty:"موردی برای نمایش نیست.",
        loadfail:"بارگذاری ناموفق بود. اینترنت یا VPN را بررسی کنید.", min:"{n} دقیقه", hour:"{n} ساعت",
        joinTitle:"برای دانلود، عضو کانال شوید", joinText:"ابتدا در کانال زیر عضو شوید، بعد روی «عضو شدم» بزنید.", joined:"✅ عضو شدم",
        limit:"سقف دانلود شما ({n} فایل در {h}) پر شده است. حدود {t} دیگر دوباره تلاش کنید.", close:"بستن" },
  en: { home:"Home", links:"Links", search:"Search posts…", all:"All", download:"Download", downloads:"Downloads",
        latest:"Latest posts", count:"{n} posts", more:"Show more", related:"Related posts", share:"Share", read:"View", files:"{n} files",
        sent:"The file was sent to your bot chat ✅", sentdel:"File sent ✅ (it will be removed from the chat in {t})",
        delnote:"To avoid copyright issues, files are removed from the chat {t} after delivery; save them right away.",
        err:"Could not send. Please try again.", start:"Start the bot first so it can send you the file", empty:"Nothing to show yet.",
        loadfail:"Failed to load. Check your internet or VPN.", min:"{n} min", hour:"{n} h",
        joinTitle:"Join to download", joinText:"Join the channel below, then tap “I joined”.", joined:"✅ I joined",
        limit:"Download limit reached ({n} files per {h}). Try again in about {t}.", close:"Close" },
};
const PAGE = 12;
const S = { cfg:null, cats:[], bot:"", lang:"fa", tab:"posts", cat:0, q:"", posts:[], total:0, hasMore:false, busy:false, req:0, details:{}, links:[], open:null, loaded:false, pending:null };
const t = (k, v) => { let s = I18N[S.lang][k] || k; for (const x in (v || {})) s = s.replace("{" + x + "}", v[x]); return s; };
const pick = (o, base) => o[base + "_" + S.lang] || o[base + "_fa"] || o[base + "_en"] || "";

async function api(path, opts = {}) {
  const r = await fetch(path, Object.assign({}, opts, {
    headers: Object.assign({ "Content-Type": "application/json", "X-Init-Data": initData }, opts.headers || {}),
  }));
  if (!r.ok) {
    let d = {}; try { d = await r.json(); } catch (e) {}
    const err = new Error("HTTP " + r.status);
    err.detail = d.detail && typeof d.detail === "object" ? d.detail : {}; err.code = err.detail.code; throw err;
  }
  return r.json();
}

function sizeStr(n) {
  n = Number(n) || 0; const u = ["B","KB","MB","GB"]; let i = 0;
  while (n >= 1024 && i < 3) { n /= 1024; i++; }
  return (i ? n.toFixed(1) : n.toFixed(0)) + " " + u[i];
}
function lum(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return 0;
  const v = parseInt(m[1], 16), f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  return .2126 * f(v >> 16) + .7152 * f((v >> 8) & 255) + .0722 * f(v & 255);
}
const cssUrl = (u) => "url(" + encodeURI(u).replace(/[()'"]/g, (c) => "%" + c.charCodeAt(0).toString(16)) + ")";
const linkify = (escaped) => escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" data-act="link" data-url="$1">$1</a>');
const hoursText = (h) => (h % 24 === 0 && h >= 24 ? (h / 24) + (S.lang === "fa" ? " روز" : " d") : t("hour", { n: h }));
const minText = (m) => (m >= 60 && m % 60 === 0 ? t("hour", { n: m / 60 }) : t("min", { n: m }));
const dateStr = (p) => (p.created_at || "").slice(0, 10);
const delMinutes = () => Math.max(0, parseInt(S.cfg && S.cfg.autodelete_minutes, 10) || 0);
const delText = () => { const m = delMinutes(); return m >= 60 && m % 60 === 0 ? t("hour", { n: m / 60 }) : t("min", { n: m }); };

function initLang() {
  let l = null; try { l = localStorage.getItem("lang"); } catch (e) {}
  if (!l) {
    const d = S.cfg.default_lang;
    if (d === "fa" || d === "en") l = d;
    else {
      const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
      const code = (u && u.language_code) || navigator.language || "";
      l = code.toLowerCase().indexOf("fa") === 0 ? "fa" : "en";
    }
  }
  S.lang = l === "en" ? "en" : "fa";
}

function applyTheme() {
  const c = S.cfg, r = document.documentElement;
  const dark = c.theme_mode === "dark" ||
    (c.theme_mode === "auto" && ((tg && tg.colorScheme === "dark") || (!tg && matchMedia("(prefers-color-scheme: dark)").matches)));
  const bg = dark ? c.dark_bg_color : c.bg_color, set = (k, v) => r.style.setProperty(k, v);
  const light = lum(c.primary_color) > .45;
  set("--primary", c.primary_color);
  set("--on-primary", light ? "#10201c" : "#ffffff");
  set("--hero-mix", light ? "#ffffff" : "#000000");
  set("--bg", bg);
  set("--card", dark ? c.dark_card_color : c.card_color);
  set("--text", dark ? c.dark_text_color : c.text_color);
  set("--muted", c.muted_color);
  set("--radius", (parseInt(c.radius, 10) || 0) + "px");
  set("--font", c.font === "system"
    ? 'system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif'
    : '"Vazirmatn",system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif');
  r.dir = S.lang === "fa" ? "rtl" : "ltr"; r.lang = S.lang;
  document.title = pick(c, "brand_name");
  try { if (tg) { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } } catch (e) {}
}

const catName = (id) => { const c = S.cats.find((x) => x.id === id); return c ? pick(c, "name") : ""; };
const fileIcon = (k) => ({ video:"🎬", audio:"🎵", photo:"🖼️", voice:"🎙️", animation:"🎞️", video_note:"🎬" }[k] || "📦");
const media = (url, extra) => url
  ? `<div class="media ${extra || ""}" style="--bg-img:${cssUrl(url)}"><img src="${esc(url)}" alt="" loading="lazy"></div>`
  : `<div class="media ph ${extra || ""}" aria-hidden="true">📄</div>`;

// ---------- home ----------
function postCard(p) {
  const ex = pick(p, "ex").replace(/\s+/g, " ").slice(0, 140), cat = catName(p.category_id), n = p.file_count || 0;
  return `<article class="pcard" role="button" tabindex="0" data-act="open" data-id="${p.id}">${media(p.image_url)}<div class="in">` +
    `<div class="meta">${cat ? `<span class="tag">${esc(cat)}</span>` : ""}<span>${esc(dateStr(p))}</span></div>` +
    `<h3>${esc(pick(p, "title"))}</h3>${ex ? `<p class="ex">${esc(ex)}</p>` : ""}` +
    `<div class="foot"><span>${n ? "📎 " + t("files", { n }) : ""}</span><span class="rd">${t("read")} ›</span></div></div></article>`;
}
function feedHTML() {
  if (!S.loaded) return `<p class="state">…</p>`;
  if (!S.posts.length) return `<p class="state">${t("empty")}</p>`;
  return `<div class="feed">${S.posts.map(postCard).join("")}</div>` +
    (S.hasMore ? `<button class="more" data-act="more" ${S.busy ? "disabled" : ""}>${S.busy ? "…" : t("more")}</button>` : "");
}
function homeView() {
  const c = S.cfg, hero = c.banner_url ? ` hasimg" style="--hero:${cssUrl(c.banner_url)}` : "";
  const chips = S.cats.length
    ? `<div class="chips"><button class="chip ${S.cat ? "" : "on"}" data-act="cat" data-id="0">${t("all")}</button>` +
      S.cats.map((x) => `<button class="chip ${S.cat === x.id ? "on" : ""}" data-act="cat" data-id="${x.id}">${esc(pick(x, "name"))}</button>`).join("") + `</div>` : "";
  const w = pick(c, "welcome");
  return `<section class="hero${hero}"><h2>${esc(pick(c, "brand_name"))}</h2>${w ? `<p>${esc(w)}</p>` : `<p></p>`}` +
    `<div class="search"><input id="q" type="search" placeholder="${esc(t("search"))}" value="${esc(S.q)}" autocomplete="off" aria-label="${esc(t("search"))}"></div></section>` +
    chips + `<div class="sec-h"><h2>${t("latest")}</h2><span id="cnt">${S.loaded ? t("count", { n: S.total }) : ""}</span></div><div id="list">${feedHTML()}</div>`;
}

// Server-side paging: only one page of light posts is ever transferred; search/category run on the server.
async function fetchPosts(reset) {
  if (S.busy && !reset) return;
  const id = ++S.req;
  if (reset) { S.posts = []; S.total = 0; S.hasMore = false; S.loaded = false; }
  S.busy = true; refreshList();
  const qs = new URLSearchParams({ limit: PAGE, offset: reset ? 0 : S.posts.length });
  if (S.q.trim()) qs.set("q", S.q.trim());
  if (S.cat) qs.set("cat", S.cat);
  try {
    const r = await api("/api/posts?" + qs.toString());
    if (id !== S.req) return;                     // a newer search superseded this one
    S.posts = reset ? r.items : S.posts.concat(r.items); S.total = r.total; S.hasMore = r.has_more; S.loaded = true;
  } catch (e) { if (id !== S.req) return; S.loaded = true; toast(t("err")); }
  S.busy = false; refreshList(); watchMore();
}
let io = null;
function watchMore() {   // auto-load the next page when "Show more" scrolls into view
  if (typeof IntersectionObserver === "undefined") return;
  if (io) io.disconnect();
  const b = document.querySelector('[data-act="more"]'); if (!b) return;
  io = new IntersectionObserver((en) => { if (en[0].isIntersecting) fetchPosts(false); }, { rootMargin: "300px" });
  io.observe(b);
}

// ---------- single post ----------
function postView(d) {
  const p = d.post, cat = catName(p.category_id), files = p.files || [];
  const rows = files.map((f) => {
    const label = pick(f, "label") || pick(f, "title") || f.file_name;
    const size = S.cfg.show_size === "1" && f.size ? `<span>${esc(sizeStr(f.size))}</span>` : "";
    return `<div class="dlrow"><div class="ic" aria-hidden="true">${fileIcon(f.kind)}</div><div class="bd"><b>${esc(label)}</b>${size}</div>` +
      `<button class="btn" data-act="dl" data-id="${f.id}">${t("download")}</button></div>`;
  }).join("");
  const rel = d.related || [];
  return `<nav class="crumbs" aria-label="breadcrumb"><button data-act="home">${t("home")}</button><span class="sep" aria-hidden="true">›</span>` +
    (cat ? `<span>${esc(cat)}</span><span class="sep" aria-hidden="true">›</span>` : "") + `<span class="cur">${esc(pick(p, "title"))}</span></nav>` +
    `<article class="detail">${p.image_url ? media(p.image_url) : ""}<h1>${esc(pick(p, "title"))}</h1>` +
    `<div class="meta">${cat ? `<span class="tag">${esc(cat)}</span>` : ""}<span>${esc(dateStr(p))}</span>${files.length ? `<span>📎 ${t("files", { n: files.length })}</span>` : ""}</div>` +
    `<div class="body">${linkify(esc(pick(p, "body")))}</div>` +
    (rows ? `<section class="dlbox"><h3>${t("downloads")}</h3>${delMinutes() ? `<p class="dlnote">${esc(t("delnote", { t: delText() }))}</p>` : ""}${rows}</section>` : "") +
    (S.bot ? `<div class="actions"><button class="btn ghost" data-act="share" data-id="${p.id}">↗ ${t("share")}</button></div>` : "") + `</article>` +
    (rel.length ? `<section class="related"><h2>${t("related")}</h2><div class="layout-list"><div class="feed">${rel.map(postCard).join("")}</div></div></section>` : "");
}

function linksView() {
  return `<h2 class="pagetitle">${t("links")}</h2>` + (S.links.length
    ? S.links.map((l) => `<button class="link" data-act="link" data-url="${esc(l.url)}"><span>${esc(pick(l, "title"))}</span><span class="go" aria-hidden="true">➜</span></button>`).join("")
    : `<p class="state">${t("empty")}</p>`);
}

function render() {
  const c = S.cfg;
  const sections = (c.sections || []).filter((s) => ["posts", "links"].includes(s));
  if (!sections.includes(S.tab)) S.tab = sections[0] || "posts";
  applyTheme();
  const post = S.open != null; const det = post && S.details[S.open];
  const nav = sections.length > 1
    ? sections.map((s) => `<button class="${!post && s === S.tab ? "on" : ""}" data-act="tab" data-v="${s}">${t(s === "posts" ? "home" : "links")}</button>`).join("") : "";
  let main = post ? (det ? postView(det) : `<p class="state">…</p>`) : S.tab === "links" ? linksView() : homeView();
  const flinks = S.links.slice(0, 4).map((l) => `<button data-act="link" data-url="${esc(l.url)}">${esc(pick(l, "title"))}</button>`).join("");
  $("#app").innerHTML = `<header class="site"><div class="wrap bar"><button class="brandlink" data-act="home" aria-label="${esc(t("home"))}">` +
    `${c.logo_url ? `<img class="logo" src="${esc(c.logo_url)}" alt="">` : ""}<span class="bname">${esc(pick(c, "brand_name"))}</span></button>` +
    `<nav class="nav">${nav}</nav><button class="lang" data-act="lang" aria-label="Language">${S.lang === "fa" ? "EN" : "فا"}</button></div></header>` +
    `<main class="wrap layout-${esc(c.layout)}">${main}<footer class="sitefoot"><span>© ${new Date().getFullYear()} ${esc(pick(c, "brand_name"))}</span><span>${flinks}</span></footer></main>`;
  syncBackButton();
}

function syncBackButton() {
  try { if (tg && tg.BackButton) { if (S.open != null) tg.BackButton.show(); else tg.BackButton.hide(); } } catch (e) {}
}
function go(fn) { fn(); render(); window.scrollTo(0, 0); if (S.open == null && S.tab === "posts") watchMore(); }
async function openPost(id) {
  S.open = id; render(); window.scrollTo(0, 0);
  if (S.details[id]) return;
  try { S.details[id] = await api("/api/posts/" + id); }
  catch (e) { toast(t("err")); if (S.open === id) S.open = null; }
  render();
}
try { if (tg && tg.BackButton) tg.BackButton.onClick(() => go(() => { S.open = null; })); } catch (e) {}

let toastTimer;
function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
function openUrl(url) {
  if (!url) return;
  const tme = /^(https?:\/\/)?(t\.me|telegram\.me)\//i.test(url);
  try {
    if (tg && tme && tg.openTelegramLink) return tg.openTelegramLink(url.startsWith("http") ? url : "https://" + url);
    if (tg && tg.openLink) return tg.openLink(url);
  } catch (e) {}
  window.open(url, "_blank");
}

async function download(id, btn) {
  const d = S.details[S.open], f = d && (d.post.files || []).find((x) => x.id === id); if (!f) return;
  const deep = `https://t.me/${S.bot}?start=f_${f.token}`;
  if (!initData) { if (S.bot) openUrl(deep); return; }
  btn.disabled = true;
  try {
    await api("/api/download", { method: "POST", body: JSON.stringify({ file_id: id }) });
    try { tg && tg.HapticFeedback && tg.HapticFeedback.notificationOccurred("success"); } catch (e) {}
    closeSheet();
    toast(delMinutes() ? t("sentdel", { t: delText() }) : t("sent"));
  } catch (e) {
    const d = e.detail || {};
    if (d.code === "not_member") showJoin(d.channels || [], id);
    else if (d.code === "limit") toast(t("limit", { n: d.limit, h: hoursText(d.hours), t: minText(d.retry_minutes || 1) }));
    else if (e.code === "not_started" && S.bot) { toast(t("start")); setTimeout(() => openUrl(deep), 900); }
    else toast(t("err"));
  } finally { btn.disabled = false; }
}
function showJoin(chs, fileId) {
  const rows = chs.map((c) => c.url
    ? `<button class="link" data-act="link" data-url="${esc(c.url)}"><span>📢 ${esc(c.title || "Channel")}</span><span class="go" aria-hidden="true">➜</span></button>`
    : `<p class="dlnote">📢 ${esc(c.title || "")}</p>`).join("");
  $("#sheet").innerHTML = `<div class="ov" data-act="closesheet"><div class="box" role="dialog" aria-modal="true" aria-label="${esc(t("joinTitle"))}"><h3>${t("joinTitle")}</h3>` +
    `<p class="dlnote">${t("joinText")}</p>${rows}<div class="actions"><button class="btn" data-act="rejoin" data-id="${fileId}">${t("joined")}</button>` +
    `<button class="btn ghost" data-act="closesheet">${t("close")}</button></div></div></div>`;
}
function closeSheet() { const s = $("#sheet"); if (s) s.innerHTML = ""; }

function refreshList() { const l = $("#list"); if (l) l.innerHTML = feedHTML(); const n = $("#cnt"); if (n) n.textContent = S.loaded ? t("count", { n: S.total }) : ""; }

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const a = b.dataset.act;
  if (a === "link") { e.preventDefault(); openUrl(b.dataset.url); }
  else if (a === "tab") go(() => { S.tab = b.dataset.v; S.open = null; });
  else if (a === "home") go(() => { S.tab = "posts"; S.open = null; });
  else if (a === "cat") { S.cat = Number(b.dataset.id); render(); fetchPosts(true); }
  else if (a === "more") fetchPosts(false);
  else if (a === "open") openPost(Number(b.dataset.id));
  else if (a === "closesheet") { if (e.target === b || b.classList.contains("btn")) closeSheet(); }
  else if (a === "rejoin") { closeSheet(); const nb = document.querySelector(`[data-act="dl"][data-id="${b.dataset.id}"]`); if (nb) download(Number(b.dataset.id), nb); }
  else if (a === "dl") download(Number(b.dataset.id), b);
  else if (a === "share") {
    const d = S.details[Number(b.dataset.id)];
    openUrl("https://t.me/share/url?url=" + encodeURIComponent(`https://t.me/${S.bot}?start=p_${b.dataset.id}`) + "&text=" + encodeURIComponent(d ? pick(d.post, "title") : ""));
  }
  else if (a === "retry") load();
  else if (a === "lang") {
    S.lang = S.lang === "fa" ? "en" : "fa";
    try { localStorage.setItem("lang", S.lang); } catch (er) {}
    if (initData) api("/api/lang", { method: "POST", body: JSON.stringify({ lang: S.lang }) }).catch(() => {});
    render();
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.act === "open") { e.preventDefault(); openPost(Number(e.target.dataset.id)); }
});
let qTimer;
document.addEventListener("input", (e) => {
  if (e.target.id !== "q") return;
  S.q = e.target.value; clearTimeout(qTimer); qTimer = setTimeout(() => fetchPosts(true), 300);   // debounce: one request per pause in typing
});
// Live preview from the admin panel (same origin only)
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== "preview") return;
  if (!S.cfg) { S.pending = e.data; return; }
  Object.assign(S.cfg, e.data.settings || {});
  if (e.data.lang) S.lang = e.data.lang;
  render();
});

async function load() {
  try {
    const cfg = await api("/api/config");
    S.cfg = cfg.settings; S.cats = cfg.categories; S.bot = cfg.bot_username;
    initLang();
    if (S.pending) { Object.assign(S.cfg, S.pending.settings || {}); if (S.pending.lang) S.lang = S.pending.lang; }
    render();
    api("/api/links").then((l) => { S.links = l; if (S.tab === "links" || S.open == null) render(); }).catch(() => {});
    await fetchPosts(true);
  } catch (e) {
    $("#app").innerHTML = `<div class="wrap"><p class="state">${esc(I18N.fa.loadfail)}<br>${esc(I18N.en.loadfail)}</p>` +
      `<p style="text-align:center"><button class="btn" data-act="retry">Retry / تلاش دوباره</button></p></div>`;
  }
}
load();
})();
