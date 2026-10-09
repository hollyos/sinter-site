/* Sinter docs, no dependencies. Native platform features over libraries (rung 4). */
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Each feature is independent. If one throws, the rest of the page still
  // works: as a single IIFE, one error took everything down with it.
  const feature = (name, fn) => { try { fn(); } catch (e) { console.error("sinter:" + name, e); } };

  // The hero figure reads its colours from CSS variables, so it must repaint
  // when the theme changes. Declared before the theme block that calls it: // declaring it after put it in the temporal dead zone.
  let redrawTheme = () => {};

  feature("theme", () => {
    /* ── Theme ───────────────────────────────────────
       Three states: auto (follows the system), light, dark. Auto is the
       default and stores nothing; an explicit choice persists.          */
    const root = document.documentElement;
    const themeBtn = $("#themeToggle"), themeLabel = $("#themeLabel");
    if (themeBtn) {
      const ORDER = ["auto", "light", "dark"];
      const LABEL = { auto: "Auto", light: "Light", dark: "Dark" };
      const HINT = {
        auto:  "Colour theme: following system. Activate for light.",
        light: "Colour theme: light. Activate for dark.",
        dark:  "Colour theme: dark. Activate to follow the system.",
      };
      const current = () => root.getAttribute("data-theme") || "auto";
      function apply(next) {
        if (next === "auto") { root.removeAttribute("data-theme"); }
        else { root.setAttribute("data-theme", next); }
        try {
          if (next === "auto") localStorage.removeItem("sinter-theme");
          else localStorage.setItem("sinter-theme", next);
        } catch (e) { /* private mode: the choice just will not persist */ }
        if (themeLabel) themeLabel.textContent = LABEL[next];
        themeBtn.setAttribute("aria-label", HINT[next]);
        redrawTheme();
      }
      themeBtn.addEventListener("click", () =>
        apply(ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length]));
      apply(current());
      matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => { if (current() === "auto") redrawTheme(); });
    }
    // Each feature is independent. If one throws, the rest of the page still
    // works: a single IIFE meant one error took everything with it.
    const feature = (name, fn) => { try { fn(); } catch (e) { console.error("sinter:" + name, e); } };

  });

  feature("nav", () => {
    /* ── Nav ─────────────────────────────────────────── */
    const here = location.pathname.split("/").pop() || "index.html";
    $$(".rail a").forEach(a => {
      if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
    });
    const rail = $(".rail"), toggle = $(".railtoggle");
    if (toggle && rail) {
      const setOpen = open => {
        rail.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      };
      toggle.addEventListener("click", () => {
        const open = !rail.classList.contains("is-open");
        setOpen(open);
        if (open) { const first = rail.querySelector("a"); if (first) first.focus(); }
      });
      document.addEventListener("keydown", e => {
        if (e.key !== "Escape" || !rail.classList.contains("is-open")) return;
        setOpen(false);
        toggle.focus();
      });
      rail.addEventListener("click", e => {
        if (e.target.closest("a")) setOpen(false);
      });
    }

  });

  feature("reveal", () => {
    /* ── Scroll reveal ───────────────────────────────── */
    const revealables = $$(".reveal");
    if (reduced || !("IntersectionObserver" in window) || !revealables.length) {
      revealables.forEach(el => el.classList.add("is-in"));
    } else {
      // Arm only once the observer exists (see the CSS note).
      document.documentElement.classList.add("reveal-armed");
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      revealables.forEach(el => io.observe(el));
    }

  });

  feature("hero", () => {
    /* ── Hero: powder -> sintered section ──────────────
       Eight particles, one per upstream source. They grow until each fills
       its own grain, so the union closes into a solid block with exact
       Voronoi boundaries. Sampling a nearest-seed grid was the earlier
       approach and it could only ever produce staircase edges.          */
    const stage = $("#sinterStage");
    if (stage) {
      const ctx = stage.getContext("2d");
      const NAMES = ["SUPERPOWERS", "PONYTAIL", "CAVEMAN", "RALPH",
                     "ECC", "IMPECCABLE", "CLOSEDLOOP", "IN-HOUSE"];
      const COLS = 4, ROWS = 2;
      const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      let W = 0, H = 0, seeds = [], cells = [], pores = [], t0 = 0, last = 1;

      // Exact Voronoi: clip the frame by the perpendicular bisector against
      // every other seed. Eight seeds, so this is 56 clips: free.
      function voronoi() {
        const rect = [[0, 0], [W, 0], [W, H], [0, H]];
        return seeds.map((s, i) => {
          let poly = rect;
          for (let j = 0; j < seeds.length && poly.length; j++) {
            if (j === i) continue;
            const o = seeds[j];
            const nx = o.x - s.x, ny = o.y - s.y;
            const cx = (s.x + o.x) / 2, cy = (s.y + o.y) / 2;
            const side = p => nx * (p[0] - cx) + ny * (p[1] - cy);
            const out = [];
            for (let k = 0; k < poly.length; k++) {
              const a = poly[k], b = poly[(k + 1) % poly.length];
              const da = side(a), db = side(b);
              if (da <= 0) out.push(a);
              if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
                const t = da / (da - db);
                out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
              }
            }
            poly = out;
          }
          return poly;
        });
      }

      const centroid = poly => {
        let a = 0, cx = 0, cy = 0;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
          const f = x1 * y2 - x2 * y1; a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
        }
        a *= 0.5;
        return Math.abs(a) < 1e-6 ? poly[0] : [cx / (6 * a), cy / (6 * a)];
      };

      function layout() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        W = stage.clientWidth; H = stage.clientHeight;
        stage.width = W * dpr; stage.height = H * dpr;

        // Deterministic jitter, proportional to the frame, so the composition
        // holds at any width rather than only the one it was designed at.
        const noise = (i, n) => (Math.sin(i * 12.9898 + n) * 43758.5453) % 1;
        seeds = [];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const i = r * COLS + c;
            seeds.push({
              x: (c + 0.5) / COLS * W + (noise(i, 1) - 0.5) * W * 0.07,
              y: (0.30 + r * 0.40) * H + (noise(i, 2) - 0.5) * H * 0.14,
            });
          }
        }
        cells = voronoi();
        // Each particle grows to exactly cover its own grain, so at t=1 the
        // union is the full block with no scalloped edge.
        seeds.forEach((s, i) => {
          s.reach = Math.max(...cells[i].map(([x, y]) => Math.hypot(x - s.x, y - s.y)));
          s.label = centroid(cells[i]);
        });

        // Residual porosity. Real sintered material keeps voids along the
        // grain boundaries, largest where three grains meet. It is the signature
        // that these were once separate particles, and it is what stops the
        // resting frame reading as a shape that was divided rather than fused.
        const rnd = (i, k) => Math.abs((Math.sin(i * 12.9898 + k * 4.1414) * 43758.5453) % 1);
        const onFrame = ([x, y]) => x < 1 || y < 1 || x > W - 1 || y > H - 1;
        const edges = [], junctions = [];
        cells.forEach(poly => {
          poly.forEach((p, k) => {
            const q = poly[(k + 1) % poly.length];
            if (onFrame(p) && onFrame(q)) return;              // frame side, not a boundary
            const key = [p, q].map(v => v.map(Math.round).join(",")).sort().join("|");
            if (!edges.some(e => e.key === key)) edges.push({ key, p, q });
          });
          poly.forEach(v => {
            if (onFrame(v)) return;
            const near = junctions.find(j => Math.hypot(j.x - v[0], j.y - v[1]) < 3);
            if (near) near.n++; else junctions.push({ x: v[0], y: v[1], n: 1 });
          });
        });

        pores = [];
        edges.forEach((e, i) => {
          const len = Math.hypot(e.q[0] - e.p[0], e.q[1] - e.p[1]);
          const count = Math.max(2, Math.round(len / 46));
          for (let k = 1; k <= count; k++) {
            const t = (k - 0.5) / count + (rnd(i, k) - 0.5) * 0.16;
            if (t <= 0.04 || t >= 0.96) continue;
            const x = e.p[0] + (e.q[0] - e.p[0]) * t;
            const y = e.p[1] + (e.q[1] - e.p[1]) * t;
            if (onFrame([x, y])) continue;
            pores.push({ x, y, r: 1.5 + rnd(i, k + 9) * 1.9 });
          }
        });
        // Pores are largest at triple junctions.
        junctions.filter(j => j.n >= 3).forEach((j, i) =>
          pores.push({ x: j.x, y: j.y, r: 3.4 + rnd(i, 3) * 1.8 }));
      }

      function draw(t) {
        last = t;
        const grow = 0.11 + t * 0.89;
        ctx.setTransform(stage.width / W, 0, 0, stage.height / H, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";

        ctx.fillStyle = col("--md-sys-color-inverse-surface");
        seeds.forEach((s, i) => {
          const settle = reduced ? 0 : (1 - t) * Math.sin(i * 2.1) * 6;
          ctx.beginPath();
          ctx.arc(s.x + settle, s.y + settle * 0.5, s.reach * grow, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.globalCompositeOperation = "source-atop";

        if (t > 0.35) {
          ctx.strokeStyle = col("--md-sys-color-inverse-on-surface");
          ctx.globalAlpha = Math.min((t - 0.35) / 0.35, 1) * 0.62;
          ctx.lineWidth = 1.2;
          ctx.lineJoin = "round";
          cells.forEach(poly => {
            if (poly.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(poly[0][0], poly[0][1]);
            for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
            ctx.closePath();
            ctx.stroke();
          });
          ctx.globalAlpha = 1;
        }

        // Heat at the necks while the particles are still fusing.
        if (t > 0.2 && t < 0.88) {
          ctx.strokeStyle = col("--md-sys-color-primary");
          ctx.globalAlpha = Math.sin((t - 0.2) / 0.68 * Math.PI) * 0.45;
          ctx.lineWidth = 1.5;
          seeds.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.reach * grow, 0, Math.PI * 2);
            ctx.stroke();
          });
          ctx.globalAlpha = 1;
        }

        if (t > 0.55 && pores.length) {
          ctx.fillStyle = col("--md-sys-color-surface-container");
          ctx.globalAlpha = Math.min((t - 0.55) / 0.3, 1) * 0.85;
          pores.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }

        if (t > 0.6) {
          ctx.globalAlpha = Math.min((t - 0.6) / 0.3, 1);
          ctx.fillStyle = col("--md-sys-color-inverse-on-surface");
          ctx.font = `600 11px ${col("--md-ref-typeface-mono")}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          seeds.forEach((s, i) => ctx.fillText(NAMES[i], s.label[0], s.label[1]));
          ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = "source-over";
      }

      function frame(now) {
        if (!t0) t0 = now;
        const raw = Math.min((now - t0) / 2800, 1);
        draw(raw * raw * (3 - 2 * raw));
        if (raw < 1) requestAnimationFrame(frame);
      }

      layout();
      redrawTheme = () => draw(last);

      const replay = $("#heroReplay");
      if (replay) {
        if (reduced) replay.remove();
        else replay.addEventListener("click", () => {
          t0 = 0;
          requestAnimationFrame(frame);
          replay.blur();
        });
      }

      if (reduced || !("IntersectionObserver" in window)) {
        draw(1);
      } else {
        draw(0);
        const heroIO = new IntersectionObserver((entries, obs) => {
          if (!entries[0].isIntersecting) return;
          obs.disconnect();
          t0 = 0;
          requestAnimationFrame(frame);
        }, { threshold: 0.35 });
        heroIO.observe(stage);
      }
      let rt;
      addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(() => { layout(); draw(1); }, 120);
      }, { passive: true });
    }

  });

  feature("router", () => {
    /* ── Lane router demo ────────────────────────────
       Mirrors skills/router/references/signals.md. Structural signals
       outrank phrasing, which is the whole point of the rule.          */
    const routerEl = $("#router");
    if (routerEl) {
      const input = $("#routerIn"), laneEl = $("#routerLane"), whyEl = $("#routerWhy");

      const STRUCTURAL = [
        [/\b(auth|login|session|token|password|oauth|permission|authoriz)/i, "standard", "touches authentication or authorization"],
        [/\b(payment|billing|charge|invoice|refund|checkout)/i,              "standard", "touches a payment path"],
        [/\b(pii|phi|personal data|gdpr|hipaa|cardholder)/i,                 "standard", "touches regulated personal data"],
        [/\b(migrat|schema change|alter table|backfill)/i,                   "full",     "touches a data migration"],
        [/\b(add|install|upgrade|bump)\b.{0,18}\b(dependency|package|library)/i, "standard", "adds or changes a dependency"],
        [/\b(new (service|system|app|platform)|from scratch|greenfield|microservice)/i, "full", "introduces a new deployable unit"],
        [/\b(prd|spec document|requirements doc)/i,                          "full",     "a specification was provided"],
        [/\b(plan|design|architect)\b/i,                                     "full",     "explicitly asks for planning"],
        [/\b(api|endpoint|public interface|breaking change)/i,               "standard", "changes a public surface"],
      ];
      const PHRASING = [
        [/\b(quick|small|tiny|just|typo|rename|one-?line|bump the version)/i, "lazy",     "reads as a small, contained change"],
        [/\b(fix|bug|broken|fails|error|crash)/i,                             "lazy",     "a fix with a known location"],
        [/\b(refactor|clean up|tidy|simplify)/i,                              "standard", "behaviour-preserving but multi-file"],
        [/\b(add|implement|support for|feature)/i,                            "standard", "new capability in an existing system"],
        [/\b(slow|performance|optimi[sz]e|latency)/i,                         "standard", "needs measurement before change"],
        [/\b(review|audit)\b/i,                                               "lazy",     "review runs lane-independently"],
      ];
      const RANK = { lazy: 0, standard: 1, full: 2 };
      const COPY = {
        lazy:     "The ladder governs. One runnable check if the logic is non-trivial. Code, then at most three lines.",
        standard: "Correctness-first. Red/green TDD, complete deliverable for the unit of work, tradeoffs stated.",
        full:     "Plan-first. Written plan, human gate before implementation, then review and judge gates.",
      };

      function route(text) {
        if (!text.trim()) return null;
        let lane = "lazy", why = [], structural = false;
        for (const [re, l, reason] of PHRASING) {
          if (re.test(text) && RANK[l] > RANK[lane]) { lane = l; why = [reason]; }
          else if (re.test(text) && !why.length) why = [reason];
        }
        for (const [re, l, reason] of STRUCTURAL) {
          if (!re.test(text)) continue;
          structural = true;
          if (RANK[l] >= RANK[lane]) { lane = l; why = [reason]; }
        }
        const files = (text.match(/\b(\d+)\s*files?\b/i) || [])[1];
        if (files && +files >= 5 && RANK.full > RANK[lane]) { lane = "full"; why = [`spans ${files} files`]; }
        else if (files && +files >= 3 && RANK.standard > RANK[lane]) { lane = "standard"; why = [`spans ${files} files`]; }
        if (!why.length) why = ["no escalating signal found"];
        return { lane, why: why[0], structural };
      }

      function render() {
        const r = route(input.value);
        if (!r) {
          laneEl.textContent = "-";
          laneEl.style.color = "var(--slag)";
          whyEl.innerHTML = "Describe a task to see which lane it routes to.";
          return;
        }
        laneEl.textContent = r.lane;
        laneEl.style.color = r.lane === "full" ? "var(--flux)"
                          : r.lane === "standard" ? "var(--molten)" : "var(--graphite)";
        whyEl.innerHTML =
          `<b>${r.structural ? "Structural signal" : "Phrasing signal"}:</b> ${r.why}. ` + COPY[r.lane];
      }

      input.addEventListener("input", render);
      $$(".router__ex button").forEach(b =>
        b.addEventListener("click", () => { input.value = b.textContent; render(); input.focus(); }));
      render();
    }

  });

  feature("filter", () => {
    /* ── Filterable index ────────────────────────────── */
    const filterbar = $(".filterbar");
    if (filterbar) {
      // The chips sit in a second .filterbar row, so scoping the lookup to the
      // first one found nothing and the group filters silently did nothing.
      const q = $("#filterQ"), chips = $$(".chip"), count = $(".count");
      const entries = $$("[data-entry]");
      let active = null;
      const sections = $$("[data-group-section]");
      function apply() {
        const needle = (q?.value || "").toLowerCase().trim();
        let shown = 0;
        entries.forEach(el => {
          const okGroup = !active || el.dataset.group === active;
          const okText = !needle || el.dataset.search.includes(needle);
          const show = okGroup && okText;
          el.hidden = !show;
          if (show) shown++;
        });
        // A group heading with nothing under it is worse than no heading.
        sections.forEach(sec => {
          sec.hidden = !sec.querySelector("[data-entry]:not([hidden])");
        });
        if (count) count.textContent = `${shown} of ${entries.length}`;
      }
      q?.addEventListener("input", apply);
      chips.forEach(c => c.addEventListener("click", () => {
        const g = c.dataset.group;
        active = active === g ? null : g;
        chips.forEach(x => x.setAttribute("aria-pressed", String(x.dataset.group === active)));
        apply();
      }));
      apply();
    }

  });
})();
