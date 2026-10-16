(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let lang = "fa"; try { lang = localStorage.getItem("alang") || "fa"; } catch (e) {}
const I = () => (lang === "en" ? 1 : 0);

const U = {
  dash:["داشبورد","Dashboard"], files:["فایل‌ها","Files"], categories:["دسته‌بندی‌ها","Categories"], posts:["پست‌ها","Posts"],
  links:["لینک‌ها","Links"], settings:["برند و ظاهر","Brand & look"], logout:["خروج","Log out"], login:["ورود","Log in"],
  username:["نام کاربری","Username"], password:["رمز عبور","Password"], badlogin:["نام کاربری یا رمز اشتباه است","Wrong username or password"],
  add:["افزودن","Add"], edit:["ویرایش","Edit"], del:["حذف","Delete"], save:["ذخیره","Save"], cancel:["انصراف","Cancel"],
  saved:["ذخیره شد ✅","Saved ✅"], confirm:["حذف شود؟","Delete this?"], copied:["لینک کپی شد","Link copied"], copy:["کپی لینک","Copy link"],
  upload:["آپلود تصویر","Upload image"], off:["مخفی","Hidden"], failed:["خطا؛ دوباره تلاش کنید","Something went wrong"],
  users:["کاربران","Users"], started:["استارت‌کرده","Started the bot"], nfiles:["فایل‌ها","Files"], dls:["کل دانلودها","Total downloads"],
  today:["دانلود امروز","Downloads today"], top:["پردانلودترین فایل‌ها","Top files"], dl:["دانلود","downloads"],
  howto:["برای افزودن فایل، آن را از حساب ادمین برای ربات تلگرام بفرستید. ربات فایل را ذخیره می‌کند؛ سپس در بخش «مطالب» یک پست بساز و فایل را به‌عنوان دکمه دانلود به آن وصل کن.",
         "To add a file, send it to your Telegram bot from an admin account. The bot stores it; then create a post under Posts and attach the file as a download button."],
  nofiles:["هنوز فایلی ذخیره نشده.","No files yet."], btns:["دکمه دانلود","download buttons"], dlbtns:["دکمه‌های دانلود","Download buttons"],
  addfile:["افزودن فایل","Add file"], sendfirst:["ابتدا یک فایل برای ربات بفرستید.","Send a file to the bot first."], botlink:["لینک ربات","Bot link"],
  postnote:["هر مطلب شامل کاور، توضیحات و چند دکمه دانلود است. فایل‌ها را اول برای ربات بفرست، بعد اینجا به مطلب وصل کن. کاربران فقط مطالب را می‌بینند و فایل‌ها فقط با زدن دکمه دانلود برایشان ارسال می‌شود.",
            "Each post has a cover, description and any number of download buttons. Send files to the bot first, then attach them here. Users only see posts; files are delivered only when they press a download button."], empty:["موردی وجود ندارد.","Nothing here yet."], nocat:["بدون دسته","No category"],
  g_access:["عضویت اجباری و محدودیت دانلود","Forced join & download limit"],
  fj_note:["هر خط یک کانال: @username یا t.me/username. برای کانال خصوصی: -1001234567890|https://t.me/+لینک‌دعوت. ربات باید در همه این کانال‌ها ادمین باشد. ادمین‌های ربات (ADMIN_IDS) از این محدودیت‌ها معاف‌اند.",
           "One channel per line: @username or t.me/username. Private channel: -1001234567890|https://t.me/+invitelink. The bot must be an admin in every channel. Bot admins (ADMIN_IDS) are exempt from these limits."],
  test_ch:["بررسی کانال‌ها","Test channels"], testing:["در حال بررسی…","Checking…"], noch:["کانالی وارد نشده.","No channels entered."],
  bot_admin:["ربات ادمین است","bot is admin"], bot_not_admin:["ربات ادمین این کانال نیست","bot is not an admin here"], no_link:["لینک عضویت ندارد (برای کانال خصوصی لینک دعوت بگذار)","no join link (add an invite link for private channels)"],
  more:["نمایش بیشتر","Load more"], search_ph:["جستجو…","Search…"],
  g_delivery:["ارسال فایل به کاربر","File delivery"],
  autodel_note:["برای کم کردن ریسک شکایت کپی‌رایت، فایلی که ربات برای کاربر می‌فرستد بعد از این مدت از چت خودِ کاربر حذف می‌شود (فقط پیام ارسال‌شده؛ فایل اصلی در کانال می‌ماند). حداکثر ۱۴۴۰ دقیقه (۲۴ ساعت). صفر یعنی حذف نشود.",
                "To reduce copyright-complaint risk, a file the bot sends is deleted from the user's own chat after this time (only the delivered message; the original stays in your channel). Max 1440 minutes (24 h). 0 = never delete."],
  g_brand:["برند و متن‌ها","Brand & texts"], g_look:["ظاهر کلی","General look"], g_light:["رنگ‌ها (حالت روشن)","Colors (light mode)"],
  g_dark:["رنگ‌ها (حالت تیره)","Colors (dark mode)"], g_sections:["بخش‌های مینی اپ (ترتیب و نمایش)","Mini App sections (order & visibility)"],
  preview:["پیش‌نمایش زنده","Live preview"], up:["بالا","Up"], down:["پایین","Down"],
};
const L = {
  title_fa:["عنوان (فارسی)","Title (Persian)"], title_en:["عنوان (انگلیسی)","Title (English)"],
  desc_fa:["توضیح (فارسی)","Description (Persian)"], desc_en:["توضیح (انگلیسی)","Description (English)"],
  name_fa:["نام (فارسی)","Name (Persian)"], name_en:["نام (انگلیسی)","Name (English)"],
  body_fa:["توضیحات (فارسی)","Description (Persian)"], body_en:["توضیحات (انگلیسی)","Description (English)"],
  label_fa:["عنوان دکمه (فارسی، اختیاری)","Button label (Persian, optional)"], label_en:["عنوان دکمه (انگلیسی، اختیاری)","Button label (English, optional)"],
  image_url:["تصویر کاور","Cover image"], url:["آدرس لینک","URL"], category_id:["دسته‌بندی","Category"], active:["نمایش داده شود","Visible"],
  sort_files:["اولویت (بالاتر = زودتر نمایش)","Priority (higher = shown first)"], sort_order:["ترتیب (کمتر = اول)","Order (lower = first)"],
  brand_name_fa:["نام برند (فارسی)","Brand name (Persian)"], brand_name_en:["نام برند (انگلیسی)","Brand name (English)"],
  logo_url:["لوگو","Logo"], banner_url:["بنر بالای صفحه","Top banner"],
  welcome_fa:["متن خوش‌آمدگویی (فارسی)","Welcome text (Persian)"], welcome_en:["متن خوش‌آمدگویی (انگلیسی)","Welcome text (English)"],
  start_text_fa:["پیام /start ربات (فارسی، اختیاری)","Bot /start message (Persian, optional)"],
  start_text_en:["پیام /start ربات (انگلیسی، اختیاری)","Bot /start message (English, optional)"],
  default_lang:["زبان پیش‌فرض","Default language"], miniapp_url:["آدرس مینی اپ (اختیاری)","Mini App URL (optional)"],
  menu_button_text:["متن دکمه منوی ربات (حداکثر ۱۶ حرف)","Bot menu button text (max 16)"],
  theme_mode:["حالت نمایش","Theme mode"], layout:["چیدمان لیست","List layout"], font:["فونت","Font"], radius:["گردی گوشه‌ها","Corner radius"],
  show_size:["نمایش حجم فایل","Show file size"],
  force_join_enabled:["عضویت اجباری در کانال قبل از دانلود","Require channel membership before download"],
  force_join_channels:["کانال‌ها (هر خط یک کانال)","Channels (one per line)"],
  dl_limit_enabled:["محدودیت دانلود برای هر کاربر","Per-user download limit"],
  dl_limit_count:["حداکثر تعداد فایل","Max files"], dl_limit_hours:["در بازه (ساعت)","Per period (hours)"],
  autodelete_minutes:["حذف خودکار فایل ارسال‌شده بعد از (دقیقه)","Auto-delete delivered files after (minutes)"],
  autodelete_notice:["نمایش پیام هشدار حذف برای کاربر","Show the user a deletion warning"], show_downloads:["نمایش تعداد دانلود","Show download count"],
  primary_color:["رنگ اصلی","Primary"], bg_color:["پس‌زمینه","Background"], card_color:["کارت‌ها","Cards"], text_color:["متن","Text"], muted_color:["متن کم‌رنگ","Muted text"],
  dark_bg_color:["پس‌زمینه","Background"], dark_card_color:["کارت‌ها","Cards"], dark_text_color:["متن","Text"],
};
const OPT = {
  default_lang:[["auto","خودکار","Auto"],["fa","فارسی","Persian"],["en","انگلیسی","English"]],
  theme_mode:[["auto","خودکار (طبق تلگرام)","Auto (follow Telegram)"],["light","همیشه روشن","Always light"],["dark","همیشه تیره","Always dark"]],
  layout:[["cards","کارت بزرگ با کاور","Large cover cards"],["list","فهرست با تصویر کوچک","List with thumbnails"],["grid","شبکه دوستونه","Two-column grid"]],
  font:[["vazirmatn","وزیرمتن","Vazirmatn"],["system","فونت سیستم","System font"]],
};
const u = (k) => (U[k] ? U[k][I()] : k);
const lab = (k) => (L[k] ? L[k][I()] : k);
const pick = (o, base) => o[base + "_" + (I() ? "en" : "fa")] || o[base + "_fa"] || o[base + "_en"] || "";

const S = { tab: "dash", bot: "", cats: [], rows: {}, draft: {}, secs: [], pg: {} };
const ENT = {
  files: { add: false, fields: [["title_fa","text"],["title_en","text"],["desc_fa","area"],["desc_en","area"],["sort","num"],["active","bool"]] },
  categories: { fields: [["name_fa","text"],["name_en","text"],["sort","num"]] },
  posts: { defaults: { active: 1 }, fields: [["title_fa","text"],["title_en","text"],["body_fa","area"],["body_en","area"],["image_url","img"],["category_id","cat"],["active","bool"]] },
  links: { defaults: { active: 1 }, fields: [["title_fa","text"],["title_en","text"],["url","text"],["sort","num"],["active","bool"]] },
};
const TABS = ["dash","files","categories","posts","links","settings"];

let toastT;
function toast(m) { const el = $("#toast"); el.textContent = m; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2200); }
function sizeStr(n) { n = Number(n) || 0; const x = ["B","KB","MB","GB"]; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return (i ? n.toFixed(1) : n.toFixed(0)) + " " + x[i]; }

async function api(path, method, body) {
  const o = { method: method || "GET", headers: {}, credentials: "same-origin" };
  if (body instanceof FormData) o.body = body;
  else if (body !== undefined) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(body); }
  const r = await fetch("/api" + path, o);
  if (r.status === 401) { showLogin(); throw new Error("401"); }
  if (!r.ok) { let d = {}; try { d = await r.json(); } catch (e) {} throw new Error(typeof d.detail === "string" ? d.detail : "HTTP " + r.status); }
  return r.json();
}
async function fail(e) { if (e.message !== "401") toast(u("failed") + (e.message ? " (" + e.message + ")" : "")); }

// ---------------- login / shell ----------------
function showLogin() {
  $("#modal").innerHTML = "";
  $("#root").innerHTML = `<form class="login card" id="lf"><h2>🛠 Admin</h2>
    <label class="f"><span>${u("username")}</span><input type="text" name="username" autocomplete="username" required></label>
    <label class="f"><span>${u("password")}</span><input type="password" name="password" autocomplete="current-password" required></label>
    <p class="err" id="le"></p><button class="btn p" style="width:100%">${u("login")}</button></form>`;
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    if (r.ok) boot(); else $("#le").textContent = r.status === 429 ? "Too many attempts" : u("badlogin");
  };
}

function shell() {
  $("#root").innerHTML = `<div class="top"><div class="bar"><h1>🛠 Admin</h1>
    <button class="btn" id="lg">${lang === "fa" ? "EN" : "فا"}</button><button class="btn" id="lo">${u("logout")}</button></div>
    <nav class="nav">${TABS.map((t) => `<button data-t="${t}" class="${t === S.tab ? "on" : ""}">${u(t)}</button>`).join("")}</nav></div><main id="main"></main>`;
  document.documentElement.dir = lang === "fa" ? "rtl" : "ltr"; document.documentElement.lang = lang;
  $("#lg").onclick = () => { lang = lang === "fa" ? "en" : "fa"; try { localStorage.setItem("alang", lang); } catch (e) {} shell(); go(S.tab); };
  $("#lo").onclick = async () => { try { await api("/admin/logout", "POST"); } catch (e) {} showLogin(); };
  document.querySelectorAll(".nav button").forEach((b) => (b.onclick = () => go(b.dataset.t)));
}

function go(tab) {
  S.tab = tab; $("#modal").innerHTML = "";
  document.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  const p = tab === "dash" ? dash : tab === "settings" ? settingsPage : () => listPage(tab);
  p().catch(fail);
}

// ---------------- dashboard ----------------
async function dash() {
  const s = await api("/admin/stats");
  const stat = (n, k) => `<div class="stat"><b>${n}</b><span>${u(k)}</span></div>`;
  $("#main").innerHTML = `<div class="note">${u("howto")}${S.bot ? ` <a href="https://t.me/${esc(S.bot)}" target="_blank" rel="noopener">@${esc(S.bot)}</a>` : ""}</div>
    <div class="stats">${stat(s.users, "users")}${stat(s.started, "started")}${stat(s.files, "nfiles")}${stat(s.downloads, "dls")}${stat(s.today, "today")}</div>
    <div class="card"><h2>${u("top")}</h2>${s.top.length ? s.top.map((f) => `<div class="row"><div class="tx"><b>${esc(pick(f, "title") || f.file_name)}</b></div><span class="badge">${f.downloads} ${u("dl")}</span></div>`).join("") : `<p>${u("nofiles")}</p>`}</div>`;
}

// ---------------- generic list pages ----------------
function rowHTML(tab, r) {
  let title, sub = "";
  if (tab === "files") {
    title = pick(r, "title") || r.file_name;
    sub = [sizeStr(r.size), r.downloads + " " + u("dl")].join(" · ");
  } else if (tab === "categories") title = pick(r, "name");
  else if (tab === "posts") { title = pick(r, "title"); sub = [(r.created_at || "").slice(0, 10), (r.file_count || 0) + " " + u("btns")].join(" · "); }
  else { title = pick(r, "title"); sub = r.url; }
  const off = "active" in r && !r.active;
  return `<div class="row ${off ? "off" : ""}"><div class="tx"><b>${esc(title) || "—"}</b><small>${esc(sub)}</small></div>${off ? `<span class="badge">${u("off")}</span>` : ""}
    ${tab === "files" && S.bot ? `<button class="btn" data-cl="https://t.me/${esc(S.bot)}?start=f_${esc(r.token)}">${u("copy")}</button>` : ""}
    ${tab === "posts" && S.bot ? `<button class="btn" data-cl="https://t.me/${esc(S.bot)}?start=p_${r.id}">${u("botlink")}</button>` : ""}
    <button class="btn" data-e="${r.id}">${u("edit")}</button><button class="btn d" data-d="${r.id}">${u("del")}</button></div>`;
}

const PG = 40, PAGED = { posts: true, files: true };
async function listPage(tab) {
  if (tab === "posts" && !S.cats.length) S.cats = await api("/admin/categories");
  const E = ENT[tab], paged = !!PAGED[tab], m = $("#main"), st = (S.pg[tab] = { q: "", rows: [], more: false });
  m.innerHTML = `<div class="head"><h2>${u(tab)}</h2>${E.add === false ? "" : `<button class="btn p" id="add">+ ${u("add")}</button>`}</div>
    ${tab === "files" ? `<div class="note">${u("howto")}</div>` : tab === "posts" ? `<div class="note">${u("postnote")}</div>` : ""}
    ${paged ? `<input type="text" id="sq" class="sq" placeholder="${u("search_ph")}" aria-label="${u("search_ph")}">` : ""}
    <div class="card" id="rows"></div><div id="moreWrap"></div>`;
  if ($("#add")) $("#add").onclick = () => openForm(tab, null).catch(fail);
  const paint = () => {
    $("#rows").innerHTML = st.rows.length ? st.rows.map((r) => rowHTML(tab, r)).join("") : `<p>${u(tab === "files" ? "nofiles" : "empty")}</p>`;
    $("#moreWrap").innerHTML = st.more ? `<button class="btn" id="moreBtn" style="width:100%">${u("more")}</button>` : "";
    const rows = $("#rows");
    rows.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => openForm(tab, st.rows.find((r) => r.id === +b.dataset.e)).catch(fail)));
    rows.querySelectorAll("[data-d]").forEach((b) => (b.onclick = async () => {
      if (!confirm(u("confirm"))) return;
      try { await api(`/admin/${tab}/${b.dataset.d}`, "DELETE"); go(tab); } catch (e) { fail(e); }
    }));
    rows.querySelectorAll("[data-cl]").forEach((b) => (b.onclick = () => copyText(b.dataset.cl)));
    if ($("#moreBtn")) $("#moreBtn").onclick = () => fetchRows(true).catch(fail);
  };
  const fetchRows = async (append) => {
    let url = "/admin/" + tab;
    if (paged) url += `?limit=${PG}&offset=${append ? st.rows.length : 0}&q=${encodeURIComponent(st.q)}`;
    const rows = await api(url);
    st.rows = append ? st.rows.concat(rows) : rows; st.more = paged && rows.length === PG;
    if (tab === "categories") S.cats = rows;
    paint();
  };
  if (paged) { let tm; $("#sq").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { st.q = e.target.value.trim(); fetchRows(false).catch(fail); }, 300); }; }
  await fetchRows(false);
}

async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast(u("copied")); } catch (e) { prompt(u("copy"), txt); }
}

function imgField(k, v, attr) {
  return `<div class="inl"><input type="text" ${attr} value="${esc(v)}" dir="ltr"><button type="button" class="btn" data-up="${k}">${u("upload")}</button><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden data-file="${k}"></div>`;
}
function wireUploads(root, onChange) {
  root.querySelectorAll("[data-up]").forEach((b) => {
    const wrap = b.parentElement, file = wrap.querySelector("[data-file]"), inp = wrap.querySelector("input[type=text]");
    b.onclick = () => file.click();
    file.onchange = async () => {
      if (!file.files[0]) return;
      const fd = new FormData(); fd.append("file", file.files[0]); b.disabled = true;
      try { const r = await api("/admin/upload", "POST", fd); inp.value = r.url; onChange && onChange(inp); } catch (e) { fail(e); }
      b.disabled = false; file.value = "";
    };
  });
}

const dlRowHTML = (files, a) => `<div class="dlr"><select data-f>${files.map((f) => `<option value="${f.id}" ${f.id === +a.file_id ? "selected" : ""}>${esc((pick(f, "title") || f.file_name) + " · " + sizeStr(f.size))}</option>`).join("")}</select>
  <div class="grid2"><input type="text" data-lf placeholder="${lab("label_fa")}" value="${esc(a.label_fa || "")}"><input type="text" data-le placeholder="${lab("label_en")}" value="${esc(a.label_en || "")}" dir="ltr"></div>
  <div class="inl"><button type="button" class="btn" data-rmv="-1" aria-label="${u("up")}">↑</button><button type="button" class="btn" data-rmv="1" aria-label="${u("down")}">↓</button><button type="button" class="btn d" data-rm>${u("del")}</button></div></div>`;

async function openForm(tab, row) {
  const E = ENT[tab], v = row || E.defaults || {};
  let allFiles = [], attached = [];
  if (tab === "posts") [allFiles, attached] = await Promise.all([api("/admin/files"), row ? api(`/admin/posts/${row.id}/files`) : []]);
  const sortKey = tab === "files" ? "sort_files" : "sort_order";
  const html = E.fields.map(([k, type]) => {
    const label = lab(k === "sort" ? sortKey : k), val = v[k] == null ? "" : v[k], at = `data-k="${k}" data-t="${type}"`;
    if (type === "bool") return `<label class="chk"><input type="checkbox" ${at} ${val ? "checked" : ""}> ${label}</label>`;
    let inner;
    if (type === "area") inner = `<textarea ${at}>${esc(val)}</textarea>`;
    else if (type === "num") inner = `<input type="number" ${at} value="${esc(val || 0)}">`;
    else if (type === "img") inner = imgField(k, val, at);
    else if (type === "cat") inner = `<select ${at}><option value="0">${u("nocat")}</option>${S.cats.map((c) => `<option value="${c.id}" ${c.id === +val ? "selected" : ""}>${esc(pick(c, "name"))}</option>`).join("")}</select>`;
    else inner = `<input type="text" ${at} value="${esc(val)}" ${k === "url" ? 'dir="ltr"' : ""}>`;
    return `<label class="f"><span>${label}</span>${inner}</label>`;
  }).join("");
  const dlEditor = tab !== "posts" ? "" : `<div class="dlh"><b>${u("dlbtns")}</b><button type="button" class="btn" id="addrow">+ ${u("addfile")}</button></div><div id="dlrows">${attached.map((a) => dlRowHTML(allFiles, a)).join("")}</div>`;
  $("#modal").innerHTML = `<div class="ov"><div class="box"><h3>${row ? u("edit") : u("add")}</h3>${html}${dlEditor}<div class="act"><button class="btn" id="mc">${u("cancel")}</button><button class="btn p" id="ms">${u("save")}</button></div></div></div>`;
  const box = $("#modal .box"); wireUploads(box);
  if (tab === "posts") {
    $("#addrow").onclick = () => {
      if (!allFiles.length) return toast(u("sendfirst"));
      $("#dlrows").insertAdjacentHTML("beforeend", dlRowHTML(allFiles, { file_id: allFiles[0].id }));
    };
    $("#dlrows").addEventListener("click", (e) => {
      const r = e.target.closest(".dlr"); if (!r) return;
      if (e.target.closest("[data-rm]")) r.remove();
      const mv = e.target.closest("[data-rmv]");
      if (mv) { const d = +mv.dataset.rmv; if (d < 0 && r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling); else if (d > 0 && r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling, r); }
    });
  }
  $("#mc").onclick = () => ($("#modal").innerHTML = "");
  $("#modal .ov").onclick = (e) => { if (e.target.classList.contains("ov")) $("#modal").innerHTML = ""; };
  $("#ms").onclick = async () => {
    const o = {};
    box.querySelectorAll("[data-k]").forEach((el) => {
      const ty = el.dataset.t;
      o[el.dataset.k] = ty === "bool" ? (el.checked ? 1 : 0) : ty === "num" || ty === "cat" ? parseInt(el.value, 10) || 0 : el.value;
    });
    try {
      let id = row ? row.id : null;
      if (row) await api(`/admin/${tab}/${row.id}`, "PATCH", o); else id = (await api(`/admin/${tab}`, "POST", o)).id;
      if (tab === "posts") {
        const items = [...box.querySelectorAll(".dlr")].map((r) => ({ file_id: +r.querySelector("[data-f]").value,
          label_fa: r.querySelector("[data-lf]").value, label_en: r.querySelector("[data-le]").value }));
        await api(`/admin/posts/${id}/files`, "PUT", items);
      }
      $("#modal").innerHTML = ""; toast(u("saved")); go(tab);
    } catch (e) { fail(e); }
  };
}

// ---------------- settings (brand & look) ----------------
const GROUPS = [
  ["g_access", [["force_join_enabled","bool"],["force_join_channels","chan"],["dl_limit_enabled","bool"],["dl_limit_count","num1"],["dl_limit_hours","num1"]]],
  ["g_delivery", [["autodelete_minutes","delmin"],["autodelete_notice","bool"]]],
  ["g_brand", [["brand_name_fa","text"],["brand_name_en","text"],["logo_url","img"],["banner_url","img"],["welcome_fa","area"],["welcome_en","area"],
               ["start_text_fa","area"],["start_text_en","area"],["default_lang","sel"],["miniapp_url","ltr"],["menu_button_text","text"]]],
  ["g_look", [["theme_mode","sel"],["layout","sel"],["font","sel"],["radius","range"],["show_size","bool"]]],
];
const LIGHT = ["primary_color","bg_color","card_color","text_color","muted_color"], DARK = ["dark_bg_color","dark_card_color","dark_text_color"];

function sField(k, type) {
  const v = S.draft[k] == null ? "" : S.draft[k], at = `data-s="${k}"`, label = lab(k);
  if (type === "bool") return `<label class="chk"><input type="checkbox" ${at} ${v === "1" ? "checked" : ""}> ${label}</label>`;
  let inner;
  if (type === "area") inner = `<textarea ${at}>${esc(v)}</textarea>`;
  else if (type === "img") inner = imgField(k, v, at);
  else if (type === "sel") inner = `<select ${at}>${OPT[k].map((o) => `<option value="${o[0]}" ${o[0] === v ? "selected" : ""}>${o[I() + 1]}</option>`).join("")}</select>`;
  else if (type === "range") inner = `<input type="range" min="0" max="28" ${at} value="${esc(v)}">`;
  else if (type === "chan") inner = `<textarea ${at} dir="ltr" rows="3" placeholder="@mychannel&#10;t.me/otherchannel&#10;-1001234567890|https://t.me/+AbCd...">${esc(v)}</textarea>`;
  else if (type === "num1") inner = `<input type="number" min="1" step="1" ${at} value="${esc(v)}" dir="ltr">`;
  else if (type === "delmin") inner = `<input type="number" min="0" max="1440" step="1" ${at} value="${esc(v)}" dir="ltr">`;
  else inner = `<input type="text" ${at} value="${esc(v)}" ${type === "ltr" ? 'dir="ltr" placeholder="https://"' : ""}>`;
  return `<label class="f"><span>${label}</span>${inner}</label>`;
}
const colorsHTML = (keys) => `<div class="colors">${keys.map((k) => `<label class="inl"><input type="color" data-s="${k}" value="${esc(S.draft[k])}"><span>${lab(k)}</span></label>`).join("")}</div>`;
const secsHTML = () => S.secs.map((s, i) => `<div class="sec"><input type="checkbox" data-sec="${i}" ${s.on ? "checked" : ""}><span>${u(s.id)}</span>
  <button class="btn" data-mv="${i}:-1" ${i === 0 ? "disabled" : ""} aria-label="${u("up")}">↑</button><button class="btn" data-mv="${i}:1" ${i === S.secs.length - 1 ? "disabled" : ""} aria-label="${u("down")}">↓</button></div>`).join("");

function pushPreview() {
  const f = $("#pv"); if (!f || !f.contentWindow) return;
  try { f.contentWindow.postMessage({ type: "preview", settings: S.draft, lang: lang }, location.origin); } catch (e) {}
}

async function settingsPage() {
  S.draft = await api("/admin/settings");
  const en = (S.draft.sections || []).filter((x) => x === "posts" || x === "links");
  S.secs = en.map((id) => ({ id, on: true })).concat(["posts","links"].filter((x) => !en.includes(x)).map((id) => ({ id, on: false })));
  const m = $("#main");
  m.innerHTML = `<div class="settings"><div id="sf">
    ${GROUPS.map(([g, fs]) => `<div class="card"><h2>${u(g)}</h2>${g === "g_delivery" ? `<p class="hint">${u("autodel_note")}</p>` : g === "g_access" ? `<p class="hint">${u("fj_note")}</p>` : ""}${fs.map(([k, t]) => sField(k, t)).join("")}${g === "g_access" ? `<button type="button" class="btn" id="testch">${u("test_ch")}</button><div id="chres" class="hint"></div>` : ""}</div>`).join("")}
    <div class="card"><h2>${u("g_light")}</h2>${colorsHTML(LIGHT)}</div>
    <div class="card"><h2>${u("g_dark")}</h2>${colorsHTML(DARK)}</div>
    <div class="card"><h2>${u("g_sections")}</h2><div id="secs">${secsHTML()}</div></div>
    <button class="btn p" id="sv">${u("save")}</button></div>
    <div class="preview card"><h2>${u("preview")}</h2><iframe id="pv" src="/app/" title="preview"></iframe></div></div>`;
  const sf = $("#sf");
  wireUploads(sf, (inp) => { S.draft[inp.dataset.s] = inp.value; pushPreview(); });
  const onEdit = (e) => {
    const el = e.target, k = el.dataset.s; if (!k) return;
    S.draft[k] = el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value; pushPreview();
  };
  sf.addEventListener("input", onEdit); sf.addEventListener("change", onEdit);
  const syncSecs = () => { S.draft.sections = S.secs.filter((s) => s.on).map((s) => s.id); $("#secs").innerHTML = secsHTML(); pushPreview(); };
  $("#secs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mv]"); if (!b) return;
    const [i, d] = b.dataset.mv.split(":").map(Number); const j = i + d;
    if (j < 0 || j >= S.secs.length) return;
    [S.secs[i], S.secs[j]] = [S.secs[j], S.secs[i]]; syncSecs();
  });
  $("#secs").addEventListener("change", (e) => { const i = e.target.dataset.sec; if (i == null) return; S.secs[+i].on = e.target.checked; syncSecs(); });
  $("#pv").onload = pushPreview;
  $("#testch").onclick = async () => {
    const out = $("#chres"); out.textContent = u("testing");
    try {
      const r = await api("/admin/force-join/check", "POST", { channels: S.draft.force_join_channels || "" });
      out.innerHTML = r.length ? r.map((c) => `<div>${c.ok ? "✅" : "❌"} <b>${esc(c.title || c.chat)}</b> — ${c.ok ? u("bot_admin") : esc(c.error || u("bot_not_admin"))}${c.has_link ? "" : ` ⚠️ ${u("no_link")}`}</div>`).join("") : u("noch");
    } catch (e) { out.textContent = e.message; }
  };
  $("#sv").onclick = async () => {
    S.draft.sections = S.secs.filter((s) => s.on).map((s) => s.id);
    try { await api("/admin/settings", "PUT", S.draft); toast(u("saved")); } catch (e) { fail(e); }
  };
}

// ---------------- boot ----------------
async function boot() {
  try { await api("/admin/me"); } catch (e) { return; }
  try { const c = await (await fetch("/api/config")).json(); S.bot = c.bot_username || ""; S.cats = c.categories || []; } catch (e) {}
  shell(); go(S.tab);
}
boot();
})();
