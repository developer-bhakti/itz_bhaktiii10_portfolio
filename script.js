/* ==========================================================================
   Bhakti Purnale — Content Creator Portfolio
   Shared behaviour for all pages (vanilla JS, no dependencies).

   1. Header            5. Page transitions
   2. Mobile menu       6. Filters (shoot + reels)
   3. Scroll reveal     7. Photo lightbox (shoot)
   4. YouTube thumbs    8. Contact form
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  /* 1. HEADER — add a soft background once the page is scrolled ------------ */
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 12); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* 2. MOBILE MENU ---------------------------------------------------------- */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    var setMenu = function (open) {
      body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) { menu.querySelector("a").focus({ preventScroll: true }); }
    };
    toggle.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && body.classList.contains("menu-open")) { setMenu(false); toggle.focus(); }
    });
    // leaving the mobile breakpoint while the menu is open would leave scroll locked
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (e) { if (e.matches) setMenu(false); });
  }

  /* 3. SCROLL REVEAL -------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-img, .reveal-lines");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* 4. YOUTUBE THUMBNAILS — maxres → hq → tidy placeholder ------------------ */
  document.querySelectorAll("img[data-yt]").forEach(function (img) {
    var id = img.getAttribute("data-yt");
    var sizes = ["maxresdefault", "hqdefault"];
    var step = 0;
    var fail = function () {
      step += 1;
      if (step < sizes.length) { img.src = "https://img.youtube.com/vi/" + id + "/" + sizes[step] + ".jpg"; }
      else {
        var thumb = img.closest(".reel-thumb, .frame");
        if (thumb) thumb.classList.add("is-missing");
      }
    };
    img.addEventListener("error", fail);
    // YouTube answers a missing maxres with a tiny grey placeholder (120px wide) instead of a clean error
    img.addEventListener("load", function () { if (img.naturalWidth && img.naturalWidth <= 120) fail(); });
    if (img.complete) {
      if (img.naturalWidth === 0) fail();
      else if (img.naturalWidth <= 120) fail();
    }
  });

  /* 5. PAGE TRANSITIONS — fade out before following an internal link ------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.protocol === "mailto:") return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    if (reduceMotion) return;
    e.preventDefault();
    body.classList.add("is-leaving");
    setTimeout(function () { location.href = a.href; }, 260);
  });
  // restore when returning via the back button (bfcache)
  window.addEventListener("pageshow", function (e) { if (e.persisted) body.classList.remove("is-leaving"); });

  /* the photo gallery (shoot page). Photos are captured in their authored order before the masonry re-parents them */
  var gallery = document.querySelector("[data-gallery]");
  var allShots = gallery ? Array.prototype.slice.call(gallery.querySelectorAll(".shot")) : [];

  /* 6. FILTERS — [data-filter-bar] buttons control [data-cat] items --------- */
  document.querySelectorAll("[data-filter-bar]").forEach(function (bar) {
    var scope = document.querySelector(bar.getAttribute("data-filter-bar"));
    if (!scope) return;
    var buttons = bar.querySelectorAll("[data-filter]");
    var items = scope.querySelectorAll("[data-cat]");
    var groups = scope.querySelectorAll("[data-group]"); // optional wrappers hidden when empty
    var empty = scope.querySelector("[data-empty]");
    var timer;

    var render = function (filter) {
      var shown = 0;
      items.forEach(function (item) {
        var cats = item.getAttribute("data-cat").split(/\s+/);
        var match = filter === "all" || cats.indexOf(filter) !== -1;
        item.hidden = !match;
        if (match) {
          item.style.setProperty("--i", Math.min(shown, 12));
          item.classList.remove("is-in");
          void item.offsetWidth; // restart the entrance animation
          item.classList.add("is-in");
          shown += 1;
        }
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector("[data-cat]:not([hidden])"); });
      if (empty) empty.hidden = shown > 0;
      scope.dispatchEvent(new Event("filtered")); // lets the masonry re-balance its columns
    };

    var select = function (filter, instant) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === filter)); });
      clearTimeout(timer);
      if (instant || reduceMotion) { render(filter); return; }
      scope.classList.add("is-switching");
      timer = setTimeout(function () { render(filter); scope.classList.remove("is-switching"); }, 200);
    };

    buttons.forEach(function (b) { b.addEventListener("click", function () { select(b.getAttribute("data-filter")); }); });

    // deep links such as reels.html#lifestyle
    var wanted = location.hash.replace("#", "");
    if (wanted && bar.querySelector('[data-filter="' + wanted + '"]')) {
      select(wanted, true);
      setTimeout(function () { bar.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }, 350);
    }
  });

  /* 6b. MASONRY — each photo goes into the currently shortest column (keeps left-to-right order and stays
         balanced after filtering). Full-width "wide" photos split the gallery into separate masonry blocks.
         Without JS the gallery falls back to plain CSS columns. */
  if (gallery) {
    var RATIO = { tall: 1.5, portrait: 1.3333, square: 1, land: 0.75 }; // height ÷ width of each shape class
    var wide = window.matchMedia("(min-width: 961px)");

    // Split photos into n columns of near-equal height: greedy "shortest column" first, then improve by
    // moving / swapping photos while that lowers the tallest column (ties: raise the shortest one).
    var balance = function (items, n) {
      var cols = [];
      var sums = [];
      var i, j, a, b;
      for (i = 0; i < n; i++) { cols.push([]); sums.push(0); }
      items.forEach(function (it) {
        var k = sums.indexOf(Math.min.apply(null, sums));
        cols[k].push(it);
        sums[k] += it.h;
      });
      var cost = function () { return Math.max.apply(null, sums) * 10 - Math.min.apply(null, sums); };
      var improved = true;
      var guard = 0;
      while (improved && guard++ < 60) {
        improved = false;
        for (a = 0; a < n; a++) {
          for (b = 0; b < n; b++) {
            if (a === b) continue;
            for (i = 0; i < cols[a].length; i++) {
              var before = cost();
              var it = cols[a][i];
              sums[a] -= it.h; sums[b] += it.h; // try moving it
              if (cost() < before - 1e-9) { cols[a].splice(i, 1); cols[b].push(it); improved = true; i--; continue; }
              sums[a] += it.h; sums[b] -= it.h;
              for (j = 0; j < cols[b].length && a < b; j++) { // try swapping it with a photo from the other column
                var other = cols[b][j];
                var d = other.h - it.h;
                sums[a] += d; sums[b] -= d;
                if (cost() < before - 1e-9) { cols[a][i] = other; cols[b][j] = it; improved = true; break; }
                sums[a] -= d; sums[b] += d;
              }
            }
          }
        }
      }
      cols.forEach(function (c) { c.sort(function (x, y) { return x.i - y.i; }); }); // keep authored order inside each column
      return cols;
    };

    var layout = function () {
      var n = wide.matches ? 3 : 2;
      var block = [];
      var flush = function () {
        if (!block.length) return;
        var row = document.createElement("div");
        row.className = "gallery-row" + (block.length === 1 ? " is-single" : "");
        balance(block, Math.min(n, block.length)).forEach(function (items) {
          var col = document.createElement("div");
          col.className = "gallery-col";
          items.forEach(function (it) { col.appendChild(it.el); });
          row.appendChild(col);
        });
        gallery.appendChild(row);
        block = [];
      };
      gallery.classList.add("is-masonry");
      gallery.textContent = ""; // detaches the old rows; the photos themselves live on in allShots
      allShots.forEach(function (shot, index) {
        if (shot.hidden) return;
        if (shot.classList.contains("shot--wide")) { flush(); gallery.appendChild(shot); return; }
        var shape = (shot.className.match(/shot--(tall|portrait|square|land)/) || [])[1];
        block.push({ el: shot, h: RATIO[shape] || 1.3333, i: index });
      });
      flush();
    };
    layout();
    wide.addEventListener("change", layout);
    gallery.addEventListener("filtered", layout);
  }

  /* 7. LIGHTBOX ------------------------------------------------------------- */
  var lb = document.getElementById("lightbox");
  if (lb && gallery) {
    var lbImg = lb.querySelector("img");
    var lbCap = lb.querySelector("figcaption");
    var current = 0;
    var opener = null;
    var visibleShots = function () { return allShots.filter(function (s) { return !s.hidden; }); };

    var show = function (i) {
      var list = visibleShots();
      if (!list.length) return;
      current = (i + list.length) % list.length;
      var img = list[current].querySelector("img");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = (current + 1) + " / " + list.length;
    };
    var open = function (shot) {
      opener = document.activeElement;
      lb.hidden = false;
      body.style.overflow = "hidden";
      show(visibleShots().indexOf(shot));
      requestAnimationFrame(function () { lb.classList.add("is-open"); });
      lb.querySelector(".lb-close").focus();
    };
    var close = function () {
      lb.classList.remove("is-open");
      body.style.overflow = "";
      setTimeout(function () { lb.hidden = true; }, reduceMotion ? 0 : 350);
      if (opener) opener.focus();
    };

    gallery.addEventListener("click", function (e) {
      var shot = e.target.closest(".shot");
      if (shot) open(shot);
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* 8. CONTACT FORM — no backend: hands the inquiry to the visitor's email app */
  var form = document.getElementById("inquiry-form");
  if (form) {
    var status = document.getElementById("form-status");
    var to = form.getAttribute("data-mailto");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); // only fires once the browser's built-in validation has passed
      var d = new FormData(form);
      var field = function (k) { return String(d.get(k) || "").trim() || "—"; };
      var subject = "Inquiry: " + field("type") + " — " + field("name");
      var text = [
        "Full name: " + field("name"),
        "Email: " + field("email"),
        "Phone: " + field("phone"),
        "Brand / Company: " + field("company"),
        "Collaboration type: " + field("type"),
        "",
        "Message:",
        String(d.get("message") || "").trim()
      ].join("\r\n");
      var href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
      status.hidden = false;
      status.innerHTML = "Your email app should now open with this inquiry ready to send. " +
        "Nothing has been sent yet — if no email app opens, please write to <a href=\"mailto:" + to + "\">" + to + "</a> directly.";
      window.location.href = href;
    });
  }

  /* footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
