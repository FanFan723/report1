/* sea-glow.js — 首屏动态深海光晕（正式页面公共模块，自包含）
   挂在 <canvas id="sea-canvas"> 上；配合 style.css 的 .sea-base / .sea-base-2 两层 CSS 渐变
   表现：几团柔光各自缓慢呼吸（明暗 + 半径涨落）、游走、色相在「深蓝 ↔ 靛紫」间极慢流转
   配色约束：全程只在 hue 206–258（蓝 → 蓝紫），不含任何绿 / 青绿色相
   性能：30fps 上限、页面不可见暂停、dpr≤1.5、系统「减弱动态效果」时降级为静态一帧 */
(function () {
  "use strict";

  var cv = document.querySelector("#sea-canvas");
  if (!cv) return;

  var ctx = cv.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, last = 0, timer = 0, running = false, lastHue = 226;

  /* 细噪点：给渐变一点胶片颗粒，避免纯数字感 */
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

  /* 光晕团：bs = 呼吸角速度（周期约 12–22s），ho = 相对色相偏移
     基准 226（深蓝），drift ±14、ho −6…+18 → 实际色相 206–258，全程无绿
     每团呼吸周期刻意不同，叠起来就「一直在变、看不出循环」 */
  var blobs = [
    { x: 0.27, y: 0.32, r: 0.62, l: 30, s: 72, a: 0.26, sx: 0.00019, sy: 0.00015, ph: 0.0, ho:   0, bs: 0.00034 },
    { x: 0.74, y: 0.27, r: 0.52, l: 27, s: 68, a: 0.22, sx: 0.00016, sy: 0.00021, ph: 1.9, ho:  14, bs: 0.00028 },
    { x: 0.56, y: 0.80, r: 0.55, l: 25, s: 66, a: 0.19, sx: 0.00012, sy: 0.00018, ph: 3.4, ho:  -6, bs: 0.00041 },
    { x: 0.89, y: 0.66, r: 0.42, l: 32, s: 64, a: 0.15, sx: 0.00023, sy: 0.00013, ph: 5.1, ho:  18, bs: 0.00031 },
    { x: 0.11, y: 0.75, r: 0.44, l: 24, s: 74, a: 0.13, sx: 0.00015, sy: 0.00020, ph: 2.5, ho:   6, bs: 0.00046 }
  ];

  /* 水中浮游微粒 */
  var dust = [];
  for (var d = 0; d < 42; d++) {
    dust.push({
      x: Math.random(), y: Math.random(),
      r: 0.4 + Math.random() * 1.5,
      sp: 0.000006 + Math.random() * 0.000012,
      ph: Math.random() * 6.28,
      a: 0.10 + Math.random() * 0.24
    });
  }

  function size() {
    var r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) draw(performance.now(), true);
  }

  function draw(t, force) {
    if (!force && document.hidden) return;
    if (!force && t - last < 33) return;      // 30fps 上限
    last = t;
    ctx.clearRect(0, 0, W, H);

    /* 全局色相：约 90s 一轮，深蓝(212) → 幽蓝(226) → 靛紫(240)，全程无绿 */
    var drift = Math.sin(t * 0.00007) * 14;
    lastHue = 226 + drift;

    ctx.globalCompositeOperation = "screen";

    /* 1) 水下斜射光柱，缓慢摆动 */
    for (var k = 0; k < 3; k++) {
      var bx = (0.16 + k * 0.31 + Math.sin(t * 0.00011 + k * 1.7) * 0.045) * W;
      var bw = W * (0.075 + k * 0.012);
      var lg = ctx.createLinearGradient(bx, 0, bx + W * 0.14, H);
      lg.addColorStop(0,   "hsla(" + (lastHue + 12) + ",70%,62%,0.034)");
      lg.addColorStop(0.5, "hsla(" + (lastHue - 8) + ",62%,48%,0.013)");
      lg.addColorStop(1,   "hsla(" + lastHue + ",60%,40%,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(bx, 0); ctx.lineTo(bx + bw, 0);
      ctx.lineTo(bx + bw + W * 0.16, H); ctx.lineTo(bx + W * 0.16, H);
      ctx.closePath(); ctx.fill();
    }

    /* 2) 光晕团：呼吸（明暗 + 半径）+ 游走 + 色相流转 */
    blobs.forEach(function (b) {
      var breath = 0.68 + 0.32 * Math.sin(t * b.bs + b.ph);
      var cx = (b.x + Math.sin(t * b.sx + b.ph) * 0.10) * W;
      var cy = (b.y + Math.cos(t * b.sy + b.ph) * 0.085) * H;
      var rr = b.r * Math.max(W, H) * (1 + Math.sin(t * b.sx * 1.7 + b.ph) * 0.06) * breath;
      var aa = b.a * (0.52 + 0.48 * Math.sin(t * b.bs * 0.8 + b.ph));
      var h = lastHue + b.ho;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0,    "hsla(" + h + "," + b.s + "%," + b.l + "%," + aa.toFixed(3) + ")");
      g.addColorStop(0.45, "hsla(" + h + "," + b.s + "%," + (b.l - 6) + "%," + (aa * 0.45).toFixed(3) + ")");
      g.addColorStop(1,    "hsla(" + h + "," + b.s + "%," + b.l + "%,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
    });

    /* 3) 浮游微粒 */
    dust.forEach(function (p) {
      var y = (p.y - t * p.sp) % 1; if (y < 0) y += 1;
      var x = p.x + Math.sin(t * 0.0002 + p.ph) * 0.012;
      var a = p.a * (0.55 + 0.45 * Math.sin(t * 0.0011 + p.ph));
      ctx.fillStyle = "hsla(" + (lastHue + 18) + ",72%,82%," + a.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(x * W, y * H, p.r, 0, Math.PI * 2); ctx.fill();
    });

    /* 4) 细噪点 */
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }

  function tick(t) { if (!running) return; draw(t, false); timer = requestAnimationFrame(tick); }
  function start() {
    if (running || reduce) return;
    running = true;
    size();
    timer = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(timer); }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
  window.addEventListener("resize", size);

  /* 验证 / 调试接口 */
  window.SEA_GLOW = {
    state: function () { return { hue: Math.round(lastHue * 10) / 10, running: running, blobs: blobs.length, dust: dust.length, reduce: reduce }; },
    start: start, stop: stop
  };

  if (reduce) { size(); }                       // 减弱动效：只画静态一帧
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
