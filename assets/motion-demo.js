/* motion-demo.js — 单页动效样张引擎（独立，不影响正式页面）
   依赖：works.js、app.js（提供 VISUAL 占位图）、motion-demo.css */
(function () {
  "use strict";

  var q = function (s) { return document.querySelector(s); };
  var qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var stored = null;
  try { stored = localStorage.getItem("wk-motion"); } catch (e) {}

  var enabled = !reduce && !coarse && stored !== "off";
  var target = 0, current = 0, looping = false, rafId = 0;
  var heroH = 0, vh = 0;
  var P = {};  // 各动效当前进度，供 HUD 与验证脚本读取

  // ---------- 场景注册 ----------
  var scenes = [];
  function add(sel, label, fn) {
    var el = q(sel);
    if (el) scenes.push({ el: el, label: label, fn: fn });
  }
  function addAll(sel, label, fn) {
    qa(sel).forEach(function (el, i) { scenes.push({ el: el, label: label, fn: fn, i: i }); });
  }

  // 1 首屏文字退场：滚动 0→1200，缩放 1→0.94、上移 30、透明度 1→0.12
  addAll('[data-m="hero"]', "hero", function (el, p) {
    el.style.opacity = (1 - 0.88 * p).toFixed(3);
    el.style.transform = "translate3d(0," + (-30 * p).toFixed(1) + "px,0) scale(" + (1 - 0.06 * p).toFixed(3) + ")";
  });

  // 2 巨幅图像缩放进入：1.9 倍 → 1 倍
  add('[data-m="zoom"]', "zoom", function (el, p) {
    el.style.transform = "scale(" + (1.9 - 0.9 * p).toFixed(3) + ")";
  });

  // 3 作品图视差：±160px
  addAll('[data-m="shot"]', "parallax", function (el, p) {
    el.style.transform = "translate3d(0," + ((0.5 - p) * 320).toFixed(1) + "px,0)";
  });

  // 4 作品标题逐条点亮：透明度 0.35→1，缩放 0.985→1
  addAll('[data-m="copy"]', "reveal", function (el, p) {
    el.style.opacity = (0.35 + 0.65 * p).toFixed(3);
    el.style.transform = "scale(" + (0.985 + 0.015 * p).toFixed(4) + ")";
  });

  // 5 履历文字逐行渐隐：静态上深下淡，随滚动由下往上逐行推进
  var LT = qa('[data-m="line"]').length || 1;
  addAll('[data-m="line"]', "lines", function (el, p, i) {
    var base = 1 - 0.62 * (i / Math.max(1, LT - 1));
    var pi = clamp(p * 1.25 - (LT - 1 - i) * 0.16, 0, 1);
    el.style.opacity = (base * (1 - 0.35 * pi)).toFixed(3);
  });

  // 6 尾屏联系条上浮：120px → 0
  add('[data-m="cta"]', "cta", function (el, p) {
    el.style.opacity = (0.15 + 0.85 * p).toFixed(3);
    el.style.transform = "translate3d(0," + (120 * (1 - p)).toFixed(1) + "px,0)";
  });

  // ---------- 静态位置缓存 ----------
  // 进度必须基于「未施加 transform 的原始位置」，否则元素自身位移会反过来影响进度，
  // 形成反馈自锁（越位移越走不完）。仅在初始化 / 尺寸变化时测量一次。
  var introTop = 0;
  function measure() {
    scenes.forEach(function (s) {
      var prevT = s.el.style.transform, prevO = s.el.style.opacity;
      s.el.style.transform = "none";
      var r = s.el.getBoundingClientRect();
      s.top = r.top + window.scrollY;
      s.h = r.height;
      s.el.style.transform = prevT;
      s.el.style.opacity = prevO;
    });
    var sec = q("#md-intro");
    if (sec) {
      var sr = sec.getBoundingClientRect();
      introTop = sr.top + window.scrollY;
    }
  }

  // ---------- 进度计算（只读缓存值，不受 transform 影响） ----------
  function progressOf(s) {
    var rel = s.top - current;   // 元素顶部相对视口顶部的「静态」位置
    switch (s.label) {
      case "hero":   return clamp(current / 1200, 0, 1);
      case "zoom":   return clamp((vh * 0.92 - rel) / (vh * 0.92), 0, 1);
      case "parallax": return clamp((vh - rel) / (vh + s.h), 0, 1);
      case "reveal": return clamp((vh * 0.92 - rel) / (vh * 0.55), 0, 1);
      case "lines":  return clamp((vh * 0.35 - (introTop - current)) / (vh * 1.1), 0, 1);
      case "cta":    return clamp((vh * 0.95 - rel) / (vh * 0.41), 0, 1);
      default: return 0;
    }
  }

  // ---------- 渲染 ----------
  var hudRows = null;
  function render() {
    vh = window.innerHeight;
    var groups = {};
    scenes.forEach(function (s) {
      var p = 0;
      if (enabled) { p = progressOf(s); s.fn(s.el, p, s.i || 0); }
      (groups[s.label] = groups[s.label] || []).push(p);
    });
    // HUD 显示每个动效的平均进度
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k], v = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
      P[k] = Math.round(v * 100);
    });
    if (hudRows) Object.keys(P).forEach(function (k) {
      var row = hudRows[k];
      if (row) { row.bar.style.width = P[k] + "%"; row.val.textContent = P[k] + "%"; }
    });
    var yEl = q("#md-y");
    if (yEl) yEl.textContent = String(Math.round(current)).padStart(4, "0") + " px";
  }

  // ---------- 惯性平滑滚动 ----------
  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  function startLoop() {
    if (looping) return;
    looping = true;
    rafId = requestAnimationFrame(frame);
  }
  function frame() {
    rafId = 0;
    var more = false;
    if (enabled) {
      var diff = target - current;
      if (Math.abs(diff) > 0.4) {
        current += diff * 0.09;
        window.scrollTo(0, current);
        more = true;
      } else { current = target; }
    } else {
      current = window.scrollY; target = current;
    }
    render();
    if (more) { rafId = requestAnimationFrame(frame); }
    else { looping = false; }
  }

  window.addEventListener("wheel", function (e) {
    if (!enabled) return;
    if (e.ctrlKey) return;
    e.preventDefault();
    target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 16 : 1), 0, maxScroll());
    startLoop();
  }, { passive: false });

  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if (Math.abs(y - current) < 1.5 && looping) return;   // 自己触发的
    current = y; target = y;
    render();
  }, { passive: true });

  window.addEventListener("resize", function () { vh = window.innerHeight; measure(); render(); });

  // ---------- 开关 ----------
  function applyStatic() {
    scenes.forEach(function (s) { s.el.style.opacity = ""; s.el.style.transform = ""; });
    document.body.classList.add("motion-off");
  }
  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem("wk-motion", enabled ? "on" : "off"); } catch (e) {}
    document.body.classList.toggle("motion-off", !enabled);
    var btn = q("#md-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", enabled ? "true" : "false");
      btn.innerHTML = "MOTION <b>" + (enabled ? "ON" : "OFF") + "</b>";
    }
    if (!enabled) {
      target = current = window.scrollY;
      applyStatic();
      glow.stop();                       // 背景深海层也停下，但保留当前颜色帧
      Object.keys(P).forEach(function (k) { P[k] = 0; });
      if (hudRows) Object.keys(hudRows).forEach(function (k) {
        hudRows[k].bar.style.width = "0%";
        hudRows[k].val.textContent = "—";
      });
    } else {
      document.body.classList.remove("motion-off");
      current = target = window.scrollY;
      render();
      if (!document.hidden) glow.start();
    }
    var note = q("#md-note");
    if (note) note.textContent = enabled
      ? "样张专用监视器 · 正式版移除"
      : (reduce ? "系统「减弱动态效果」已开启，动效自动关闭" : coarse ? "触屏设备自动使用原生滚动" : "动效已关闭 · 内容已归位到静态状态");
  }

  // ---------- 深海动态层：极慢色相流转 + 水下光柱 + 雾团 + 浮游微粒 ----------
  // 30fps 上限、页面不可见时暂停；色相漂移周期约 90s，配合 CSS 48s/71s 两层渐变
  var glow = (function () {
    var cv = q("#md-glow");
    if (!cv) return { start: function () {}, stop: function () {}, resize: function () {}, state: function () { return {}; } };
    var ctx = cv.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, last = 0, timer = 0, running = false, lastHue = 226;

    // 细噪点（比旧版更轻，避免脏）
    var noise = document.createElement("canvas");
    noise.width = noise.height = 128;
    var nctx = noise.getContext("2d");
    var nd = nctx.createImageData(128, 128);
    for (var i = 0; i < nd.data.length; i += 4) {
      var v = 160 + Math.random() * 95;
      nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v;
      nd.data[i + 3] = 8;
    }
    nctx.putImageData(nd, 0, 0);
    var pattern = ctx.createPattern(noise, "repeat");

    // 深蓝 → 幽蓝 → 靛紫的雾团（基准 226，全程 hue 206–258，无绿），各自缓慢漂移、呼吸
    var blobs = [
      { x: 0.28, y: 0.34, r: 0.60, l: 30, s: 70, a: 0.22, sx: 0.00019, sy: 0.00015, ph: 0.0, ho:   0, bs: 0.00034 },
      { x: 0.74, y: 0.28, r: 0.50, l: 27, s: 64, a: 0.19, sx: 0.00016, sy: 0.00021, ph: 1.9, ho:  14, bs: 0.00028 },
      { x: 0.56, y: 0.80, r: 0.54, l: 26, s: 60, a: 0.17, sx: 0.00012, sy: 0.00018, ph: 3.4, ho:  -6, bs: 0.00041 },
      { x: 0.88, y: 0.68, r: 0.40, l: 32, s: 62, a: 0.13, sx: 0.00023, sy: 0.00013, ph: 5.1, ho:  18, bs: 0.00031 },
      { x: 0.12, y: 0.74, r: 0.42, l: 25, s: 72, a: 0.12, sx: 0.00015, sy: 0.00020, ph: 2.5, ho:   6, bs: 0.00046 }
    ];
    // 水中浮游微粒：极慢上浮 + 轻微横向摆动 + 呼吸明暗
    var dust = [];
    for (var d = 0; d < 46; d++) {
      dust.push({
        x: Math.random(), y: Math.random(),
        r: 0.4 + Math.random() * 1.5,
        sp: 0.000006 + Math.random() * 0.000012,
        ph: Math.random() * 6.28,
        a: 0.10 + Math.random() * 0.26
      });
    }

    function size() {
      var r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      if (document.hidden) return;
      if (t - last < 33) return;               // 30fps 上限
      last = t;
      ctx.clearRect(0, 0, W, H);

      // 色相极慢流转：周期 ≈ 90s，幅度 ±14°，深蓝(212)↔靛紫(240)，永不跳变、全程无绿
      var drift = Math.sin(t * 0.00007) * 14;
      lastHue = 226 + drift;

      ctx.globalCompositeOperation = "screen";

      // 1) 水下斜射光柱
      for (var k = 0; k < 3; k++) {
        var bx = (0.16 + k * 0.31 + Math.sin(t * 0.00011 + k * 1.7) * 0.045) * W;
        var bw = W * (0.075 + k * 0.012);
        var lg = ctx.createLinearGradient(bx, 0, bx + W * 0.14, H);
        lg.addColorStop(0,   "hsla(" + (lastHue + 12) + ",70%,62%,0.032)");
        lg.addColorStop(0.5, "hsla(" + (lastHue - 8) + ",62%,48%,0.012)");
        lg.addColorStop(1,   "hsla(" + lastHue + ",60%,40%,0)");
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(bx, 0); ctx.lineTo(bx + bw, 0);
        ctx.lineTo(bx + bw + W * 0.16, H); ctx.lineTo(bx + W * 0.16, H);
        ctx.closePath(); ctx.fill();
      }

      // 2) 深海雾团：每团按自己的周期呼吸（明暗 + 半径涨落）、缓慢游走、色相流转
      blobs.forEach(function (b) {
        var breath = 0.68 + 0.32 * Math.sin(t * b.bs + b.ph);
        var cx = (b.x + Math.sin(t * b.sx + b.ph) * 0.10) * W;
        var cy = (b.y + Math.cos(t * b.sy + b.ph) * 0.085) * H;
        var rr = b.r * Math.max(W, H) * (1 + Math.sin(t * b.sx * 1.7 + b.ph) * 0.06) * breath;
        var aa = b.a * (0.52 + 0.48 * Math.sin(t * b.bs * 0.8 + b.ph));
        var h = lastHue + b.ho;
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0,   "hsla(" + h + "," + b.s + "%," + b.l + "%," + aa.toFixed(3) + ")");
        g.addColorStop(0.5, "hsla(" + h + "," + b.s + "%," + (b.l - 6) + "%," + (aa * 0.45).toFixed(3) + ")");
        g.addColorStop(1,   "hsla(" + h + "," + b.s + "%," + b.l + "%,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
      });

      // 3) 浮游微粒
      dust.forEach(function (p) {
        var y = (p.y - t * p.sp) % 1; if (y < 0) y += 1;
        var x = p.x + Math.sin(t * 0.0002 + p.ph) * 0.012;
        var a = p.a * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.ph));
        ctx.fillStyle = "hsla(" + (lastHue + 18) + ",72%,82%," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(x * W, y * H, p.r, 0, Math.PI * 2); ctx.fill();
      });

      // 4) 细噪点收尾
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
    }

    function tick(t) { if (!running) return; draw(t); timer = requestAnimationFrame(tick); }
    return {
      start: function () { if (running) return; running = true; size(); timer = requestAnimationFrame(tick); },
      stop: function () { running = false; cancelAnimationFrame(timer); },
      resize: size,
      state: function () { return { hue: Math.round(lastHue * 10) / 10, running: running, dust: dust.length }; }
    };
  })();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) glow.stop();
    else if (enabled) glow.start();
  });

  // ---------- 实时时间：照抄参考站底部 ©2025 LONDON, UK 上午11:55 ----------
  function tickClock() {
    var el = q("#md-clock");
    if (!el) return;
    var d = new Date(), h = d.getHours();
    var ap = h < 12 ? "上午" : "下午";
    var hh = h % 12 || 12;
    el.textContent = "©2026 CHINA, " + ap + hh + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  // ---------- 初始化 ----------
  function init() {
    current = target = window.scrollY;
    vh = window.innerHeight;
    tickClock();
    setInterval(tickClock, 10000);
    var hero = q("#md-hero");
    heroH = hero ? hero.offsetHeight : vh;

    // HUD 行
    var wrap = q("#md-bars");
    if (wrap) {
      hudRows = {};
      var names = { hero: "首屏退场", zoom: "巨图缩放", parallax: "图视差", reveal: "标题点亮", lines: "逐行渐隐", cta: "尾屏上浮" };
      Object.keys(names).forEach(function (k) {
        var row = document.createElement("div");
        row.className = "md-bar-row";
        row.innerHTML = "<span>" + names[k] + "</span><span class=\"track\"><i></i></span><span class=\"v\">0%</span>";
        wrap.appendChild(row);
        hudRows[k] = { bar: row.querySelector("i"), val: row.querySelector(".v") };
        P[k] = 0;
      });
    }

    var btn = q("#md-toggle");
    if (btn) btn.addEventListener("click", function () { setEnabled(!enabled); });

    // 样张内作品卡与巨图（沿用正式站的占位图生成器）
    if (typeof VISUAL !== "undefined" && typeof WORKS !== "undefined") {
      var zimg = q("#md-zoom-img");
      if (zimg) zimg.src = VISUAL.url(WORKS.find(function (x) { return x.id === "clay-mixed"; }) || WORKS[3]);
    }
    var cards = q("#md-cards");
    if (cards && typeof VISUAL !== "undefined" && typeof WORKS !== "undefined") {
      var picks = ["park-renewal", "clay-mixed", "poster-city"];
      cards.innerHTML = picks.map(function (id, i) {
        var w = WORKS.find(function (x) { return x.id === id; }) || WORKS[i];
        return '<article class="md-card">' +
          '<div class="md-shot"><img data-m="shot" src="' + VISUAL.url(w) + '" alt="' + w.zh + '"></div>' +
          '<span class="md-ribbon"></span>' +
          '<div class="md-copy" data-m="copy">' +
            '<div class="k">' + w.typeZh + ' — ' + w.year + '</div>' +
            '<h3>' + w.en + '</h3>' +
            '<div class="zh">' + w.zh + '</div>' +
            '<div class="meta"><span>Role<b>' + w.role + '</b></span><span>Tools<b>' + w.tools.slice(0, 2).join(" / ") + '</b></span><span>Year<b>' + w.year + '</b></span></div>' +
          '</div></article>';
      }).join("");
      // 卡片是动态插入的，需要重新注册场景
      scenes.length = 0;
      addAll('[data-m="hero"]', "hero", function (el, p) {
        el.style.opacity = (1 - 0.88 * p).toFixed(3);
        el.style.transform = "translate3d(0," + (-30 * p).toFixed(1) + "px,0) scale(" + (1 - 0.06 * p).toFixed(3) + ")";
      });
      add('[data-m="zoom"]', "zoom", function (el, p) { el.style.transform = "scale(" + (1.9 - 0.9 * p).toFixed(3) + ")"; });
      addAll('[data-m="shot"]', "parallax", function (el, p) { el.style.transform = "translate3d(0," + ((0.5 - p) * 320).toFixed(1) + "px,0)"; });
      addAll('[data-m="copy"]', "reveal", function (el, p) {
        el.style.opacity = (0.35 + 0.65 * p).toFixed(3);
        el.style.transform = "scale(" + (0.985 + 0.015 * p).toFixed(4) + ")";
      });
      var LT2 = qa('[data-m="line"]').length || 1;
      addAll('[data-m="line"]', "lines", function (el, p, i) {
        var base = 1 - 0.62 * (i / Math.max(1, LT2 - 1));
        var pi = clamp(p * 1.25 - (LT2 - 1 - i) * 0.16, 0, 1);
        el.style.opacity = (base * (1 - 0.35 * pi)).toFixed(3);
      });
      add('[data-m="cta"]', "cta", function (el, p) {
        el.style.opacity = (0.15 + 0.85 * p).toFixed(3);
        el.style.transform = "translate3d(0," + (120 * (1 - p)).toFixed(1) + "px,0)";
      });
    }

    measure();
    setEnabled(enabled);
    render();
    if (enabled) glow.start();
    q("#md-note") && (q("#md-note").textContent = "样张专用监视器 · 正式版移除");
    window.addEventListener("resize", glow.resize);
  }

  // 验证脚本接口
  window.__MOTION__ = {
    setScroll: function (y) {
      target = current = clamp(y, 0, maxScroll());
      window.scrollTo(0, current);
      render();
      return current;
    },
    sample: function () {
      return { y: Math.round(current), enabled: enabled, p: JSON.parse(JSON.stringify(P)),
        hero: { opacity: getComputedStyle(q('[data-m="hero"]')).opacity, transform: getComputedStyle(q('[data-m="hero"]')).transform },
        zoom: { transform: getComputedStyle(q('[data-m="zoom"]')).transform },
        shot: { transform: getComputedStyle(q('[data-m="shot"]')).transform } };
    },
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    sea: function () { return glow.state(); },
    clock: function () { return (q("#md-clock") || {}).textContent; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
