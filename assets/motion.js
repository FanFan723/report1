/* motion.js — 全站滚动动效引擎（公共模块，5 个正式页面共用）
   从 motion-demo.js 提炼：去掉样张监视器 / 样张画布 / 时钟 / 卡片注入，
   保留 6 类滚动联动、惯性平滑滚动、静态兜底、MOTION 开关。
   幅度已按约定收敛 30–40%；触屏 / 系统「减弱动态效果」自动退回原生滚动。
   依赖：app.js 先渲染 DOM（脚本顺序：works.js → app.js → sea-glow.js → motion.js） */
(function () {
  "use strict";

  var q = function (s) { return document.querySelector(s); };
  var qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var stored = null;
  /* 正式站用独立 key，避免与同源的动效样张（wk-motion）互相污染开关状态 */
  try { stored = localStorage.getItem("wk-motion-site"); } catch (e) {}

  var enabled = !reduce && !coarse && stored !== "off";
  var target = 0, current = 0, looping = false, rafId = 0, vh = 0;
  var P = {};                 // 各动效当前进度（供验证脚本读取）
  var scenes = [];
  var sectionTop = 0, LT = 1;

  /* ---------- 6 类联动（数值＝样张验收通过的收敛值） ---------- */
  var fnHero = function (el, p) {
    el.style.opacity = (1 - 0.88 * p).toFixed(3);
    el.style.transform = "translate3d(0," + (-30 * p).toFixed(1) + "px,0) scale(" + (1 - 0.06 * p).toFixed(3) + ")";
  };
  var fnZoom = function (el, p) {
    var from = parseFloat(el.getAttribute("data-zoom")) || 1.9;
    el.style.transform = "scale(" + (from - (from - 1) * p).toFixed(3) + ")";
  };
  var fnShot = function (el, p) {
    el.style.transform = "translate3d(0," + ((0.5 - p) * 320).toFixed(1) + "px,0)";
  };
  var fnCopy = function (el, p) {
    /* 下限 0.5（比样张 0.35 更收敛）：联系信息、表格等关键内容始终清晰可读 */
    el.style.opacity = (0.5 + 0.5 * p).toFixed(3);
    el.style.transform = "scale(" + (0.985 + 0.015 * p).toFixed(4) + ")";
  };
  var fnLine = function (el, p, i) {
    var base = 1 - 0.62 * (i / Math.max(1, LT - 1));      // 静态上深下淡
    var pi = clamp(p * 1.25 - (LT - 1 - i) * 0.16, 0, 1); // 随滚动推进
    el.style.opacity = (base * (1 - 0.35 * pi)).toFixed(3);
  };
  var fnCta = function (el, p) {
    el.style.opacity = (0.15 + 0.85 * p).toFixed(3);
    el.style.transform = "translate3d(0," + (120 * (1 - p)).toFixed(1) + "px,0)";
  };

  /* ---------- 场景注册（支持筛选后重新扫描） ---------- */
  function addAll(sel, label, fn) {
    qa(sel).forEach(function (el, i) { scenes.push({ el: el, label: label, fn: fn, i: i }); });
  }
  function register() {
    scenes = [];
    LT = qa('[data-m="line"]').length || 1;
    addAll('[data-m="hero"]', "hero", fnHero);
    addAll('[data-m="zoom"]', "zoom", fnZoom);
    addAll('[data-m="shot"]', "parallax", fnShot);
    addAll('[data-m="copy"]', "reveal", fnCopy);
    addAll('[data-m="line"]', "lines", fnLine);
    addAll('[data-m="cta"]', "cta", fnCta);
    var firstLine = q('[data-m="line"]');
    if (firstLine && firstLine.closest) {
      var sec = firstLine.closest(".sheet");
      if (sec) sectionTop = sec.getBoundingClientRect().top + window.scrollY;
    }
  }

  /* ---------- 静态位置缓存 ----------
     进度必须基于「未施加 transform 的原始位置」，否则元素自身位移会反过来影响进度，
     形成反馈自锁（越位移越走不完）。仅在初始化 / 尺寸变化 / refresh 时测量一次。 */
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
  }

  /* ---------- 进度计算（只读缓存值，不受 transform 影响） ---------- */
  function progressOf(s) {
    var rel = s.top - current;
    switch (s.label) {
      case "hero":     return clamp(current / 1200, 0, 1);
      case "zoom":     return clamp((vh * 0.92 - rel) / (vh * 0.92), 0, 1);
      case "parallax": return clamp((vh - rel) / (vh + s.h), 0, 1);
      case "reveal":   return clamp((vh * 0.92 - rel) / (vh * 0.55), 0, 1);
      case "lines":    return clamp((vh * 0.35 - (sectionTop - current)) / (vh * 1.1), 0, 1);
      case "cta":      return clamp((current - (maxScroll() - vh * 1.15)) / (vh * 0.85), 0, 1);
      default: return 0;
    }
  }

  /* ---------- 渲染 ---------- */
  function render() {
    vh = window.innerHeight;
    var groups = {};
    scenes.forEach(function (s) {
      var p = 0;
      if (enabled) { p = progressOf(s); s.fn(s.el, p, s.i || 0); }
      (groups[s.label] = groups[s.label] || []).push(p);
    });
    Object.keys(groups).forEach(function (k) {
      var arr = groups[k];
      P[k] = Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length * 100);
    });
  }

  /* ---------- 惯性平滑滚动 ---------- */
  function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  function startLoop() { if (looping) return; looping = true; rafId = requestAnimationFrame(frame); }
  function frame() {
    rafId = 0;
    var more = false;
    if (enabled) {
      var diff = target - current;
      if (Math.abs(diff) > 0.4) { current += diff * 0.09; window.scrollTo(0, current); more = true; }
      else { current = target; }
    } else { current = window.scrollY; target = current; }
    render();
    if (more) rafId = requestAnimationFrame(frame); else looping = false;
  }

  window.addEventListener("wheel", function (e) {
    if (!enabled || e.ctrlKey) return;
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

  /* ---------- 开关 ---------- */
  function applyStatic() {
    scenes.forEach(function (s) { s.el.style.opacity = ""; s.el.style.transform = ""; });
  }
  function updateBtn() {
    var btn = q("#motion-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", enabled ? "true" : "false");
      btn.innerHTML = "MOTION <b>" + (enabled ? "ON" : "OFF") + "</b>";
    }
  }
  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem("wk-motion-site", enabled ? "on" : "off"); } catch (e) {}
    document.body.classList.toggle("motion-off", !enabled);
    updateBtn();
    if (!enabled) {
      target = current = window.scrollY;
      applyStatic();
      if (window.SEA_GLOW) window.SEA_GLOW.stop();   // 背景光晕也停，保留当前颜色帧
      Object.keys(P).forEach(function (k) { P[k] = 0; });
    } else {
      current = target = window.scrollY;
      render();
      if (!document.hidden && window.SEA_GLOW) window.SEA_GLOW.start();
    }
  }

  /* 系统 / 触屏降级时，切回前台也要保证光晕保持停止 */
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !enabled && window.SEA_GLOW) window.SEA_GLOW.stop();
  });

  /* ---------- 初始化 ---------- */
  function refresh() { register(); measure(); render(); }
  function init() {
    current = target = window.scrollY;
    vh = window.innerHeight;

    var btn = document.createElement("button");
    btn.id = "motion-toggle";
    btn.className = "motion-toggle";
    btn.type = "button";
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    btn.innerHTML = "MOTION <b>" + (enabled ? "ON" : "OFF") + "</b>";
    btn.addEventListener("click", function () { setEnabled(!enabled); });
    document.body.appendChild(btn);

    register();
    measure();
    setEnabled(enabled);
    render();
  }

  /* 验证 / 调试接口 */
  var styleOf = function (sel) {
    var el = q(sel);
    if (!el) return null;
    var cs = getComputedStyle(el);
    return { opacity: cs.opacity, transform: cs.transform };
  };
  window.__MOTION__ = {
    setScroll: function (y) {
      target = current = clamp(y, 0, maxScroll());
      window.scrollTo(0, current);
      render();
      return current;
    },
    sample: function () {
      return {
        y: Math.round(current), enabled: enabled,
        p: JSON.parse(JSON.stringify(P)),
        hero: styleOf('[data-m="hero"]'),
        zoom: styleOf('[data-m="zoom"]'),
        shot: styleOf('[data-m="shot"]'),
        copy: styleOf('[data-m="copy"]'),
        line: styleOf('[data-m="line"]'),
        cta: styleOf('[data-m="cta"]')
      };
    },
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    refresh: refresh,
    sceneLabels: function () { return scenes.map(function (s) { return s.label; }); },
    sea: function () { return window.SEA_GLOW ? window.SEA_GLOW.state() : null; },
    clock: function () { return (q("#clock") || {}).textContent || null; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
