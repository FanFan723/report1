const VISUAL = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const seedOf = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 11);
  const rnd = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function defs(extra) {
    return `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1420"/><stop offset="0.55" stop-color="#18263a"/><stop offset="1" stop-color="#0a101a"/></linearGradient>
      <radialGradient id="glow" cx="0.7" cy="0.32" r="0.7"><stop offset="0" stop-color="#3a5c82" stop-opacity="0.55"/><stop offset="1" stop-color="#3a5c82" stop-opacity="0"/></radialGradient>
      <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f7f4"/><stop offset="1" stop-color="#e6e7e3"/></linearGradient>
      <linearGradient id="clay" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9e8e3"/><stop offset="1" stop-color="#b6b8b7"/></linearGradient>
      ${extra || ""}
    </defs>`;
  }

  function frame(w, h, inner) {
    const svg = `<svg xmlns="${NS}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function board(work) {
    const w = 1000, h = 1280, r = rnd(seedOf(work.id));
    const cols = ["#2d3e50", "#7d9aa8", "#c9a87c", "#6b7d99", "#b4695c"];
    let g = defs();
    g += `<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#glow)"/>`;
    g += `<rect x="90" y="76" width="820" height="1128" rx="6" fill="url(#plate)"/>`;
    g += `<rect x="90" y="76" width="820" height="86" fill="#151a22"/>`;
    g += `<text x="122" y="130" font-family="Helvetica,Arial,sans-serif" font-size="19" letter-spacing="5" fill="#f0f1ef">${esc(work.en.toUpperCase())}</text>`;
    g += `<text x="878" y="130" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="13" letter-spacing="3" fill="#9aa4b0">${work.year}</text>`;
    g += `<text x="122" y="222" font-family="Georgia,serif" font-size="88" fill="#c9ccd0">01</text>`;
    g += `<line x1="122" y1="248" x2="878" y2="248" stroke="#c2c5c5" stroke-width="1"/>`;
    let y = 276;
    while (y < 1000) {
      const bh = 46 + r() * 70;
      const c = cols[Math.floor(r() * cols.length)];
      if (r() > 0.45) g += `<rect x="122" y="${y}" width="${220 + r() * 440}" height="${bh}" fill="${c}" opacity="0.85"/>`;
      else {
        g += `<circle cx="190" cy="${y + bh / 2}" r="${Math.min(bh / 2, 30)}" fill="none" stroke="#9fa6aa" stroke-width="1"/>`;
        for (let k = 0; k < 4; k++) g += `<rect x="250" y="${y + k * (bh / 5)}" width="${280 + r() * 280}" height="6" fill="#b9bdbe"/>`;
      }
      y += bh + 22;
    }
    g += `<line x1="122" y1="1050" x2="878" y2="1050" stroke="#c2c5c5" stroke-width="1"/>`;
    for (let k = 0; k < 5; k++) g += `<rect x="${122 + k * 156}" y="1082" width="120" height="7" fill="#3a4048" opacity="0.7"/>`;
    g += `<text x="122" y="1160" font-family="Helvetica,Arial,sans-serif" font-size="12" letter-spacing="3" fill="#7c8288">SITE / CONCEPT / PLAN / SECTION / STRATEGY</text>`;
    g += `<rect x="90" y="76" width="820" height="1128" rx="6" fill="none" stroke="#ffffff" stroke-opacity="0.5"/>`;
    return frame(w, h, g);
  }

  function render(work) {
    const w = 1600, h = 900, r = rnd(seedOf(work.id));
    let g = defs(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2c42"/><stop offset="0.6" stop-color="#2c4663"/><stop offset="1" stop-color="#111c2b"/></linearGradient>`);
    g += `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
    g += `<circle cx="1180" cy="190" r="92" fill="#c9d6e2" opacity="0.18"/>`;
    g += `<circle cx="1180" cy="190" r="52" fill="#dfe8ee" opacity="0.3"/>`;
    const base = h * 0.82;
    let x = 40;
    while (x < w - 40) {
      const bw = 70 + r() * 130;
      const bh = 130 + r() * 380;
      const top = base - bh;
      g += `<rect x="${x}" y="${top}" width="${bw}" height="${bh}" fill="url(#clay)" opacity="0.95"/>`;
      g += `<rect x="${x}" y="${top}" width="${bw * 0.3}" height="${bh}" fill="#f0efeb" opacity="0.5"/>`;
      for (let fy = top + 22; fy < base - 12; fy += 30) {
        g += `<line x1="${x + 6}" y1="${fy}" x2="${x + bw - 6}" y2="${fy}" stroke="#8b9093" stroke-width="1" opacity="0.55"/>`;
      }
      g += `<rect x="${x}" y="${top}" width="${bw}" height="${bh}" fill="none" stroke="#7d848a" stroke-width="1"/>`;
      x += bw + 10 + r() * 24;
    }
    g += `<rect x="0" y="${base}" width="${w}" height="${h - base}" fill="#1b2531"/>`;
    g += `<rect x="0" y="${base}" width="${w}" height="2" fill="#5b6773"/>`;
    g += `<ellipse cx="800" cy="${base + 24}" rx="700" ry="20" fill="#0a121c" opacity="0.4"/>`;
    g += `<rect x="70" y="70" width="6" height="46" fill="#e04a3c"/>`;
    g += `<text x="92" y="102" font-family="Helvetica,Arial,sans-serif" font-size="15" letter-spacing="6" fill="#e8edf1">${esc(work.en.toUpperCase())}</text>`;
    g += `<text x="70" y="${h - 46}" font-family="Helvetica,Arial,sans-serif" font-size="12" letter-spacing="4" fill="#aeb9c4">CLAY MODEL STUDY / ${work.year}</text>`;
    return frame(w, h, g);
  }

  function poster(work) {
    const w = 1000, h = 1280, r = rnd(seedOf(work.id));
    const fields = [["#b8503f", "#efece4"], ["#2b3d53", "#d9b45e"], ["#4a5d80", "#f1ece0"], ["#7a4c56", "#e8dcc8"]];
    const f = fields[Math.floor(r() * fields.length)];
    let g = defs();
    g += `<rect width="${w}" height="${h}" fill="#0d1420"/>`;
    g += `<rect x="70" y="70" width="860" height="1140" fill="${f[0]}"/>`;
    const mode = Math.floor(r() * 3);
    if (mode === 0) for (let i = 0; i < 6; i++) g += `<circle cx="${200 + r() * 600}" cy="${240 + r() * 700}" r="${60 + r() * 150}" fill="${i % 2 ? f[1] : "#1d2430"}" opacity="0.9"/>`;
    else if (mode === 1) for (let i = 0; i < 12; i++) g += `<rect x="${130 + r() * 500}" y="${180 + r() * 760}" width="${90 + r() * 260}" height="${30 + r() * 150}" fill="${i % 3 ? f[1] : "#1d2430"}" opacity="0.9" transform="rotate(${(r() * 26 - 13).toFixed(1)} 500 640)"/>`;
    else for (let i = 0; i < 26; i++) g += `<line x1="120" y1="${180 + i * 38}" x2="${520 + r() * 350}" y2="${180 + i * 38}" stroke="${i % 4 ? f[1] : "#1d2430"}" stroke-width="${(3 + r() * 12).toFixed(1)}" opacity="0.9"/>`;
    g += `<text x="110" y="1120" font-family="Helvetica,Arial,sans-serif" font-weight="bold" font-size="62" letter-spacing="-2" fill="${f[1]}">${esc(work.en.toUpperCase())}</text>`;
    g += `<text x="112" y="1160" font-family="Helvetica,Arial,sans-serif" font-size="13" letter-spacing="5" fill="${f[1]}" opacity="0.8">POSTER / ${work.year}</text>`;
    return frame(w, h, g);
  }

  return { url: (w) => (w.type === "board" ? board(w) : w.type === "render" ? render(w) : poster(w)) };
})();

function stillHTML(work, cls) {
  return `<div class="${cls}"><img data-m="shot" src="${VISUAL.url(work)}" alt="${work.zh}"></div>`;
}

function projectHTML(work) {
  return `<a class="project" href="work.html?id=${work.id}">
    ${stillHTML(work, "still")}
    <span class="ribbon"></span>
    <div class="client">${work.client} — ${work.year}</div>
    <h3 data-m="copy">${work.en}</h3>
    <div class="meta">
      <span>Client<b>${work.typeZh}</b></span>
      <span>Role<b>${work.role}</b></span>
      <span>Year<b>${work.year}</b></span>
    </div>
    <div class="desc">${work.short}</div>
  </a>`;
}

function tileHTML(work) {
  return `<a class="work-tile ${work.type === "render" ? "" : "tall"}" href="work.html?id=${work.id}">
    <div class="shot"><img data-m="shot" src="${VISUAL.url(work)}" alt="${work.zh}"></div>
    <div class="cap">
      <div class="k">${work.client} · ${work.year}</div>
      <h3 data-m="copy">${work.en}</h3>
      <div class="zh">${work.zh}</div>
      <div class="tools">${work.tools.slice(0, 3).map((t) => `<i>${t}</i>`).join("")}</div>
    </div>
  </a>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const path = (location.pathname.split("/").pop() || "index.html");
  const navKey = { "": "index", "index.html": "index", "works.html": "works", "work.html": "works", "about.html": "about", "contact.html": "contact" }[path] || "index";

  /* 全站统一顶部：参考站首屏的「两侧极小导航 + 中央黑色半椭圆缺口」
     样张自带 .md-topbar，注入会重叠，跳过 */
  const firstSheet = document.querySelector(".sheet");
  if (firstSheet && !document.querySelector(".md-topbar")) {
    const onLight = firstSheet.classList.contains("light");
    const ink = INFO.initials.split("").join(" ");
    const mk = (label, href, key) => `<a href="${href}"${key && key === navKey ? ' class="on"' : ""}>${label}</a>`;
    firstSheet.insertAdjacentHTML("afterbegin",
      `<header class="topbar${onLight ? " on-light" : ""}">
        <nav class="top-nav">${mk("Home", "index.html", "index")}${mk("Work", "works.html", "works")}${mk("About", "about.html", "about")}</nav>
        <div class="top-notch">${ink}</div>
        <nav class="top-nav">${mk("Skills", "about.html#skills")}${mk("Process", "index.html#process")}${mk("Contact", "contact.html", "contact")}</nav>
      </header>`);
  }

  const clock = document.querySelector("#clock");
  if (clock) {
    // 照参考站首屏格式：©2025 LONDON, UK 上午11:55（中文 12 小时制、无前导零）
    const tick = () => {
      const d = new Date(), h = d.getHours();
      const ap = h < 12 ? "上午" : "下午";
      const hh = h % 12 || 12;
      clock.textContent = `©2026 CHINA, ${ap}${hh}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    tick(); setInterval(tick, 10000);
  }

  const io = ("IntersectionObserver" in window) ? new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.1 }) : null;
  const observe = () => {
    if (!io) { document.querySelectorAll(".rv").forEach((el) => el.classList.add("in")); return; }
    document.querySelectorAll(".rv:not(.in)").forEach((el) => io.observe(el));
  };

  const featured = document.querySelector("#featured");
  if (featured) featured.innerHTML = WORKS.filter((w) => w.featured).map(projectHTML).join("");

  const grid = document.querySelector("#works-grid");
  if (grid) {
    const render = (cat) => {
      const list = cat === "all" ? WORKS : WORKS.filter((w) => w.type === cat);
      grid.innerHTML = list.map(tileHTML).join("");
      /* 筛选会重建 DOM，通知动效引擎重新扫描 [data-m]（初始渲染时引擎尚未加载，会自动跳过） */
      if (window.__MOTION__) window.__MOTION__.refresh();
      observe(); requestAnimationFrame(observe);
    };
    document.querySelectorAll(".filters button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".filters button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); render(b.dataset.cat);
    }));
    render("all");
  }

  const detail = document.querySelector("#detail");
  if (detail) {
    const id = new URLSearchParams(location.search).get("id");
    const i = WORKS.findIndex((w) => w.id === id);
    const w = WORKS[i] || WORKS[0];
    const prev = WORKS[(i - 1 + WORKS.length) % WORKS.length];
    const next = WORKS[(i + 1) % WORKS.length];
    document.title = `${w.en} — Wang Ke`;
    detail.innerHTML = `
      <div class="detail-grid">
        <div class="detail-figure rv"><img data-m="shot" src="${VISUAL.url(w)}" alt="${w.zh}"></div>
        <div class="detail-card rv">
          <div class="eyebrow light" style="margin-bottom:16px">${w.typeZh} / ${w.year}</div>
          <h1 data-m="copy">${w.en}</h1>
          <div class="zh">${w.zh}</div>
          <p>${w.desc}</p>
          <div class="rows light" style="margin-top:30px">
            <div class="row"><b>Role</b><span>${w.role}</span><em>${w.year}</em></div>
            <div class="row"><b>Category</b><span>${w.typeZh}</span><em>${w.year}</em></div>
          </div>
          <div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:26px">${w.tools.map((t) => `<span style="font-size:10px;letter-spacing:0.1em;border:1px solid rgba(255,255,255,0.2);padding:6px 12px;border-radius:999px;color:rgba(232,233,234,0.65)">${t}</span>`).join("")}</div>
        </div>
      </div>
      <div class="detail-nav">
        <a class="pill" href="work.html?id=${prev.id}">← ${prev.en}</a>
        <a class="pill" href="works.html">All work</a>
        <a class="pill" href="work.html?id=${next.id}">${next.en} →</a>
      </div>
      <div class="section-label" style="margin-top:90px"><h2>More work</h2><span class="tiny">更多作品</span></div>
      <div class="work-grid">${WORKS.filter((x) => x.id !== w.id).slice(0, 2).map(tileHTML).join("")}</div>`;
    observe(); requestAnimationFrame(observe);
  }

  const skillGrid = document.querySelector("#skill-grid");
  if (skillGrid) skillGrid.innerHTML = SKILLS.map((s) => `
    <div class="skill"><div class="r"><b>${s.name}</b><span>${s.note} · ${s.level}%</span></div><div class="bar"><i data-v="${s.level}"></i></div></div>`).join("");

  const processRows = document.querySelector("#process-rows");
  if (processRows) processRows.innerHTML = PROCESS.map(([step, name, note]) => `<div class="row"><b>${name}</b><span>${note}</span><em>${step}</em></div>`).join("");

  const bars = document.querySelectorAll(".skill .bar i");
  if (bars.length) {
    const show = () => bars.forEach((b, i) => setTimeout(() => (b.style.width = b.dataset.v + "%"), i * 90));
    if (!("IntersectionObserver" in window)) show();
    else {
      const bo = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(); bo.disconnect(); } }), { threshold: 0.2 });
      bo.observe(document.querySelector(".skill-grid") || document.body);
    }
  }

  observe();
});
