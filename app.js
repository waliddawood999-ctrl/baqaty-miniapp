(function () {
  "use strict";
  var tg = window.Telegram && window.Telegram.WebApp;
  var inTg = !!(tg && tg.initData);
  var D = null, state = { q: "", sel: {} };
  var app = document.getElementById("app");
  var bar = document.getElementById("buybar"), barBtn = document.getElementById("buybtn");
  var mainCb = null, booted = false;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(n) { return (Math.round(n * 100) / 100).toString(); }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[\s\-_.·]+/g, "");
  }
  function haptic(kind) {
    try {
      if (!inTg || !tg.HapticFeedback) return;
      if (kind === "sel") tg.HapticFeedback.selectionChanged();
      else if (kind === "ok") tg.HapticFeedback.notificationOccurred("success");
      else tg.HapticFeedback.impactOccurred(kind || "light");
    } catch (e) {}
  }
  function tile(p, big) {
    var inner = p.mono
      ? '<i style="--m:url(' + esc(p.logo) + ');--c:' + esc(p.mono) + '"></i>'
      : '<img src="' + esc(p.logo) + '" alt="" loading="' + (big ? "eager" : "lazy") + '" decoding="async">';
    return '<span class="tile">' + inner + "</span>";
  }

  /* ---------- buy button (Telegram MainButton or fallback bar) ---------- */
  function setBuy(text, cb) {
    if (inTg) {
      var mb = tg.MainButton;
      if (mainCb) mb.offClick(mainCb);
      mainCb = null;
      if (!text) { mb.hide(); return; }
      mainCb = cb; mb.onClick(cb);
      var params = { text: text, is_visible: true, is_active: true };
      if (mb.setParams) mb.setParams(params); else { mb.setText(text); mb.show(); }
    } else {
      bar.hidden = !text;
      barBtn.textContent = text || "";
      barBtn.onclick = cb || null;
    }
  }
  function setBack(on) {
    if (!inTg || !tg.BackButton) return;
    if (on) tg.BackButton.show(); else tg.BackButton.hide();
  }

  /* ---------- order: hand off to the bot ---------- */
  function order(p, pl) {
    haptic("ok");
    var link = "https://t.me/" + D.store.bot + "?start=buy_" + p.slug + "_" + pl.id;
    if (inTg) {
      tg.openTelegramLink(link);
      setTimeout(function () { try { tg.close(); } catch (e) {} }, 350);
    } else {
      location.href = link;
    }
  }

  /* ---------- home ---------- */
  function match(p, q) {
    if (!q) return true;
    var hay = [p.name, p.slug, p.tagline].concat(p.aliases || []);
    for (var i = 0; i < hay.length; i++) if (norm(hay[i]).indexOf(q) !== -1) return true;
    return false;
  }
  function gridHtml() {
    var q = norm(state.q);
    var list = D.products.filter(function (p) { return match(p, q); });
    if (!list.length) {
      return '<div class="empty">ما لقينا «' + esc(state.q) + '»<br><a href="' + esc(D.store.wa_link) + '" target="_blank" rel="noopener">اسألنا على واتساب</a></div>';
    }
    return '<div class="grid">' + list.map(function (p) {
      return '<button class="app" data-slug="' + esc(p.slug) + '">' + tile(p) +
        "<b>" + esc(p.short || p.name) + "</b>" +
        "<small>" + "من <em>" + num(p.from) + "</em> ر.س</small></button>";
    }).join("") + "</div>";
  }
  function home() {
    setBack(false); setBuy(null);
    var s = D.store;
    app.innerHTML =
      '<header class="hero"><h1>' + esc(s.name) + '</h1><p>' + esc(s.tagline) + '</p>' +
      '<div class="pills"><span class="pill y">' + D.products.length + ' اشتراك</span>' +
      '<span class="pill">⚡ تفعيل ' + esc(s.response_short || s.response_time) + '</span>' +
      '</div></header>' +
      '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="q" type="search" inputmode="search" autocomplete="off" placeholder="ابحث عن تطبيق…" value="' + esc(state.q) + '"></div>' +
      '<div class="sec"><h2>كل الاشتراكات</h2><span>الأسعار بالريال</span></div>' +
      '<div id="grid">' + gridHtml() + "</div>" +
      '<section class="how"><h3>كيف تطلب؟</h3><div class="steps">' +
      "<div><b>1</b><span>اختر التطبيق والباقة</span></div>" +
      "<div><b>2</b><span>يفتح لك البوت الطلب جاهز — أكّد بياناتك</span></div>" +
      "<div><b>3</b><span>حوّل وارفع الإيصال، ونفعّل لك " + esc(s.response_short || s.response_time) + "</span></div></div></section>" +
      '<div class="foot">' + (s.telegram_support ? '<a href="https://t.me/' + esc(s.telegram_support) + '" target="_blank" rel="noopener">💬 الدعم: <bdi dir="ltr">@' + esc(s.telegram_support) + '</bdi></a>' : "") +
      '<a href="' + esc(s.wa_link) + '" target="_blank" rel="noopener">🟢 واتساب</a>' +
      '<a href="' + esc(s.site_url) + '" target="_blank" rel="noopener">🌐 الموقع</a></div>';
    var q = document.getElementById("q");
    q.addEventListener("input", function () { state.q = q.value; document.getElementById("grid").innerHTML = gridHtml(); });
    q.addEventListener("keydown", function (e) { if (e.key === "Enter") q.blur(); });
  }

  /* ---------- product ---------- */
  function product(slug) {
    var p = D.bySlug[slug];
    if (!p) { go(""); return; }
    setBack(true);
    var plans = p.plans;
    var sel = state.sel[slug];
    if (sel == null) {
      var pop = plans.filter(function (x) { return x.popular; })[0];
      sel = (pop || plans[0]).id;
    }
    var pl0 = plans.filter(function (x) { return x.id === sel; })[0] || plans[0];
    var g = p.grad || ["#3B2BD9", "#160F45"];
    var needsEmail = plans.some(function (x) { return x.email; });
    app.innerHTML =
      '<header class="phero" style="background:linear-gradient(135deg,' + g[0] + "," + g[1] + ')">' + tile(p, true) +
      "<div><h1>" + esc(p.name) + "</h1><p>" + esc(p.lead || p.tagline) + "</p>" +
      "</div></header>" +
      (p.about ? '<p class="about">' + esc(p.about) + "</p>" : "") +
      '<div class="sec"><h2>اختر الباقة</h2><span>' + (plans.length === 1 ? "باقة واحدة" : plans.length === 2 ? "باقتان" : plans.length + " باقات") + "</span></div>" +
      '<div class="plans">' + plans.map(function (x) {
        var b = [];
        if (x.popular) b.push('<span class="badge s">⭐ الأكثر طلبًا</span>');
        if (x.email) b.push('<span class="badge">📧 على بريدك</span>');
        if (x.off) b.push('<span class="badge">وفّر ' + x.off + "%</span>");
        return '<button class="plan' + (x.id === pl0.id ? " sel" : "") + '" data-plan="' + x.id + '">' +
          '<div class="row"><div><h3>' + esc(x.label) + '</h3><div class="dur">' + esc(x.duration) + "</div></div>" +
          '<div class="price">' + (x.compare ? "<s>" + num(x.compare) + "</s>" : "") + "<b>" + num(x.price) + "</b><span>ر.س</span></div></div>" +
          (b.length ? '<div class="badges">' + b.join("") + "</div>" : "") + '<span class="radio"></span></button>';
      }).join("") + "</div>" +
      '<div class="info" id="info">' + infoHtml(pl0) + "</div>" +
      (needsEmail ? '<p class="note">📧 بعض الباقات تُفعَّل على بريدك — يطلبه البوت ويبقى خاصًا.</p>' : "") +
      '<p class="note">الطلب يكمل داخل البوت: تأكد بياناتك، تحوّل وترسل الإيصال، ونفعّل لك.</p>' +
      '<a class="note wa" href="' + esc(D.store.wa_link + "?text=" + encodeURIComponent("السلام عليكم، أبغى أطلب " + p.name + " من باقاتي وأدفع بعد التفعيل")) +
      '" target="_blank" rel="noopener">💬 تبي تدفع بعد التفعيل؟ <b>تواصل معنا واتساب</b></a>';
    app.querySelectorAll(".plan").forEach(function (el) {
      el.addEventListener("click", function () {
        var id = +el.getAttribute("data-plan");
        if (state.sel[slug] === id && el.classList.contains("sel")) return;
        state.sel[slug] = id; haptic("sel");
        app.querySelectorAll(".plan").forEach(function (o) { o.classList.toggle("sel", o === el); });
        var x = plans.filter(function (y) { return y.id === id; })[0];
        document.getElementById("info").innerHTML = infoHtml(x);
        buyFor(p, x);
      });
    });
    buyFor(p, pl0);
  }
  function infoHtml(x) {
    var h = "";
    if (x.steps && x.steps.length) h += "<details open><summary>طريقة التفعيل</summary><div class=\"body\"><ol>" +
      x.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></div></details>";
    if (x.warranty) h += '<details><summary>الضمان</summary><div class="body">' + esc(x.warranty) + "</div></details>";
    return h;
  }
  function buyFor(p, x) { setBuy("اطلب " + x.label + " · " + num(x.price) + " ر.س", function () { order(p, x); }); }

  /* ---------- routing ---------- */
  function go(slug) {
    if (slug) location.hash = "#/p/" + slug; else location.hash = "";
  }
  function route() {
    var m = location.hash.match(/^#\/p\/([\w-]+)/);
    window.scrollTo(0, 0);
    if (booted) { app.classList.remove("fade"); void app.offsetWidth; app.classList.add("fade"); } booted = true;
    if (m) product(m[1]); else home();
  }
  app.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".app");
    if (a) { haptic("light"); location.hash = "#/p/" + a.getAttribute("data-slug"); }
  });
  window.addEventListener("hashchange", route);

  /* ---------- boot ---------- */
  if (inTg) {
    try {
      tg.ready(); tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor("#160F45");
      if (tg.setBackgroundColor) tg.setBackgroundColor("bg_color");
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
      tg.BackButton.onClick(function () { haptic("light"); location.hash = ""; });
    } catch (e) {}
  }
  fetch("data.json?v=" + (window.__V__ || Date.now()), { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      D = d; D.bySlug = {};
      d.products.forEach(function (p) { D.bySlug[p.slug] = p; });
      // deep-open from the bot: ?startapp=<slug> or tgWebAppStartParam
      var sp = (inTg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || new URLSearchParams(location.search).get("p");
      if (sp && D.bySlug[sp] && !location.hash) { location.replace("#/p/" + sp); }
      route();
    })
    .catch(function () { app.innerHTML = '<div class="empty">تعذّر التحميل — حاول مرة ثانية</div>'; });
})();
