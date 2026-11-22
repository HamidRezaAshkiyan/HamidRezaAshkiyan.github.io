/**
 * Hamid Reza Ashkiyan — v1.0 Minimalist Engineering Portfolio & HTML Blog
 * Zero dependencies · Works identically on GitHub Pages and local file://
 */

(function () {
  "use strict";

  // Apply saved theme early to avoid flash
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initScrollProgress();
    initMobileNav();
    initRevealAnimations();
    initSpotlightCards();
    initActiveNav();
    initArchInspector();
    initProjectFilters();
    initBlogFilters();
    initCopyButtons();
    initTerminal();
  });

  /* ------------------------------------------------------------------------
     Theme Toggle (Dark Obsidian <-> Clean Alabaster)
     ------------------------------------------------------------------------ */
  function initThemeToggle() {
    const btn = document.getElementById("btn-theme-toggle");
    if (!btn) return;

    const updateLabel = () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
      btn.innerHTML = isLight
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    };

    updateLabel();

    btn.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      if (isLight) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("theme", "light");
      }
      updateLabel();
    });
  }

  /* ------------------------------------------------------------------------
     Reading / Scroll Progress Bar
     ------------------------------------------------------------------------ */
  function initScrollProgress() {
    const bar = document.querySelector(".scroll-progress");
    if (!bar) return;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      bar.style.width = `${pct}%`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     Mobile Navigation Drawer
     ------------------------------------------------------------------------ */
  function initMobileNav() {
    const btn = document.getElementById("btn-mobile-menu");
    const menu = document.getElementById("mobile-nav");
    if (!btn || !menu) return;

    btn.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll Reveal (IntersectionObserver)
     ------------------------------------------------------------------------ */
  function initRevealAnimations() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    els.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     Subtle Pointer Spotlight on Cards
     ------------------------------------------------------------------------ */
  function initSpotlightCards() {
    const cards = document.querySelectorAll(".spotlight-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ------------------------------------------------------------------------
     Active Navigation Highlight on Scroll
     ------------------------------------------------------------------------ */
  function initActiveNav() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll("nav.main-nav .nav-link[href^='#']");
    if (!sections.length || !navLinks.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            navLinks.forEach((link) => {
              link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
            });
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  /* ------------------------------------------------------------------------
     Interactive Architecture Diagram Inspector
     ------------------------------------------------------------------------ */
  function initArchInspector() {
    const nodes = document.querySelectorAll(".arch-node");
    const inspector = document.getElementById("arch-inspector-text");
    if (!nodes.length || !inspector) return;

    nodes.forEach((node) => {
      const activate = () => {
        nodes.forEach((n) => n.classList.remove("active"));
        node.classList.add("active");
        const title = node.getAttribute("data-title") || "Node";
        const detail = node.getAttribute("data-detail") || "";
        inspector.innerHTML = `<strong>${escapeHtml(title)}</strong> — ${escapeHtml(detail)}`;
      };
      node.addEventListener("mouseenter", activate);
      node.addEventListener("click", activate);
      node.addEventListener("focus", activate);
    });
  }

  /* ------------------------------------------------------------------------
     Project Category Filter
     ------------------------------------------------------------------------ */
  function initProjectFilters() {
    const buttons = document.querySelectorAll("#project-filters .filter-btn");
    const cards = document.querySelectorAll(".projects-grid .project-card");
    if (!buttons.length || !cards.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        cards.forEach((card) => {
          const cat = card.getAttribute("data-category");
          const show = filter === "all" || cat === filter;
          card.classList.toggle("hidden", !show);
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Blog Tag Filter & Search
     ------------------------------------------------------------------------ */
  function initBlogFilters() {
    const buttons = document.querySelectorAll("#blog-filters .filter-btn");
    const searchInput = document.getElementById("blog-search");
    const cards = document.querySelectorAll(".blog-list .blog-card");
    if (!cards.length) return;

    let activeTag = "all";
    let query = "";

    const applyFilter = () => {
      cards.forEach((card) => {
        const tags = (card.getAttribute("data-tags") || "").toLowerCase();
        const text = card.textContent.toLowerCase();
        const matchesTag = activeTag === "all" || tags.includes(activeTag);
        const matchesQuery = !query || text.includes(query);
        card.classList.toggle("hidden", !(matchesTag && matchesQuery));
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTag = (btn.getAttribute("data-tag") || "all").toLowerCase();
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        query = e.target.value.trim().toLowerCase();
        applyFilter();
      });
    }
  }

  /* ------------------------------------------------------------------------
     Copy to Clipboard (Contact Items & Blog Code Blocks)
     ------------------------------------------------------------------------ */
  function initCopyButtons() {
    document.querySelectorAll("[data-copy]").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        const value = el.getAttribute("data-copy");
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          showToast(`Copied: ${value}`);
        } catch {
          showToast(value);
        }
      });
    });

    document.querySelectorAll(".copy-code-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pre = btn.closest(".code-block")?.querySelector("pre");
        if (!pre) return;
        try {
          await navigator.clipboard.writeText(pre.textContent || "");
          const orig = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = orig;
          }, 1600);
        } catch {
          showToast("Copy unavailable");
        }
      });
    });
  }

  function showToast(msg) {
    let toast = document.getElementById("site-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "site-toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  /* ------------------------------------------------------------------------
     Interactive Terminal Drawer (with History & Autocomplete)
     ------------------------------------------------------------------------ */
  function initTerminal() {
    const drawer = document.getElementById("terminal-drawer");
    const toggleBtn = document.getElementById("btn-terminal-toggle");
    const closeBtn = document.getElementById("btn-terminal-close");
    const inputEl = document.getElementById("terminal-cli-input");
    const logsEl = document.getElementById("terminal-logs");
    if (!drawer || !inputEl || !logsEl) return;

    const commands = [
      "help",
      "whoami",
      "experience",
      "education",
      "certs",
      "skills",
      "projects",
      "posts",
      "arch",
      "contact",
      "theme",
      "clear",
      "exit",
    ];
    const history = [];
    let historyIndex = -1;

    const toggle = () => {
      drawer.classList.toggle("open");
      if (drawer.classList.contains("open")) {
        inputEl.focus();
      }
    };

    if (toggleBtn) toggleBtn.addEventListener("click", toggle);
    if (closeBtn) closeBtn.addEventListener("click", () => drawer.classList.remove("open"));

    window.addEventListener("keydown", (e) => {
      const inField = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (e.key === "`" && !inField) {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape" && drawer.classList.contains("open")) {
        drawer.classList.remove("open");
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const raw = inputEl.value.trim();
        inputEl.value = "";
        if (!raw) return;
        history.push(raw);
        historyIndex = history.length;
        runCommand(raw, logsEl, drawer);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          inputEl.value = history[historyIndex];
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          inputEl.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          inputEl.value = "";
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const val = inputEl.value.trim().toLowerCase();
        const match = commands.find((c) => c.startsWith(val));
        if (match) inputEl.value = match;
      }
    });
  }

  function runCommand(rawCmd, logsEl, drawer) {
    appendLine(`hamid@mesh:~$ ${rawCmd}`, "cmd-echo", logsEl);
    const cmd = rawCmd.toLowerCase().split(/\s+/)[0];

    switch (cmd) {
      case "help":
        appendLine(
          "Commands:\n" +
            "  whoami        Profile summary & philosophy\n" +
            "  experience    Career history (MrBilit, Rahnema, Cartiba, Yasin)\n" +
            "  education     Academic background\n" +
            "  certs         Certifications & ACM-ICPC achievement\n" +
            "  skills        Backend, Messaging, Data, DevOps & Systems stack\n" +
            "  projects      Featured production & open-source repositories\n" +
            "  posts         Minimal HTML engineering blog articles\n" +
            "  arch          ASCII microservices & quorum queue topology\n" +
            "  contact       Email, Phone, LinkedIn, GitHub, Telegram\n" +
            "  theme         Toggle dark / light theme\n" +
            "  clear | exit  Clear logs or close terminal",
          "output",
          logsEl
        );
        break;

      case "whoami":
        appendLine(
          "Hamid Reza Ashkiyan — Software Engineer (Backend & Distributed Systems)\n" +
            "Location:  Isfahan, Iran\n" +
            "Current:   BackEnd Developer @ MrBilit (May 2022 – Present)\n" +
            "Focus:     .NET 8 microservices at scale, legacy migrations, fintech payments\n" +
            'Quote:     "Write code that\'s easy to change, not just easy to write."',
          "output",
          logsEl
        );
        break;

      case "experience":
        appendLine(
          "[2022–Present] BackEnd Developer @ MrBilit (Isfahan)\n" +
            "  • Migrated 15+ services to .NET 8 with DDD & microservices\n" +
            "  • Integrated Zarrinpal, Azkivam & automated tax registration\n" +
            "  • Upgraded RabbitMQ to quorum queues with MassTransit; Hangfire + Docker\n\n" +
            "[2021]         Software Development Bootcamp @ Rahnema College (Remote)\n" +
            "  • Full-stack & Agile (Scrum); LinkedIn-like app (Spring Boot, React, GraphQL)\n\n" +
            "[2020–2021]    Back End Developer @ Cartiba (Isfahan)\n" +
            "  • Laravel e-commerce backend & RESTful APIs\n\n" +
            "[2017–2020]    Software Developer @ Yasin Engineering Group (Isfahan)\n" +
            "  • End-to-end desktop/web ownership; clinic systems & large-scale WPF (Hafez)",
          "output",
          logsEl
        );
        break;

      case "education":
        appendLine(
          "B.Sc. in Information Technology (2015 – 2020)\n" +
            "University of Sheikh Bahaei — Isfahan, Iran",
          "output",
          logsEl
        );
        break;

      case "certs":
        appendLine(
          "• Software Development Certificate — Rahnema College\n" +
            "• ACM-ICPC Asia Region Certificate of Achievement — Sharif University",
          "output",
          logsEl
        );
        break;

      case "skills":
        appendLine(
          "Backend:   .NET 8/9/10, C#, ASP.NET Core, DDD, Clean Architecture, MediatR, Hangfire\n" +
            "Data/Msg:  SQL Server, PostgreSQL, Redis, RabbitMQ (Quorum Queues), MassTransit\n" +
            "DevOps:    Docker, Docker Compose, Git, Keycloak (OIDC/JWT), OpenTelemetry\n" +
            "Systems:   Rust, Swift, Python, WPF, Java (Spring Boot), Laravel\n" +
            "Interests: AI/LLM Integration (Ollama, OpenClaw), Open Source, Workflow Automation",
          "output",
          logsEl
        );
        break;

      case "projects":
        appendLine(
          "1. ModularMonolith         ASP.NET Core (.NET 10), Clean Arch, DDD, MediatR, MassTransit\n" +
            "2. Hafez                   2-year large-scale WPF system, hardware control & mobile remote\n" +
            "3. Social Platform         Clean Architecture, Spring Boot, React, GraphQL, JWT, Docker\n" +
            "4. aegis                   Rust system-wide ad/tracker/telemetry blocker (macOS & Win)\n" +
            "5. ophiuchi-rs             Rust localhost SSL reverse proxy & Local Root CA\n" +
            "6. folio                   Rust Bullet Journal (TUI + GUI) backed by Obsidian Markdown\n" +
            "7. PadDisplay              iPad second monitor for macOS (Swift) & Windows (C# IddCx)\n" +
            "8. PersianKeyboardRedefined Redesigned Persian keyboard layout (9★)",
          "output",
          logsEl
        );
        break;

      case "posts":
        appendLine(
          "1. blog/migrating-15-microservices-to-dotnet-8.html\n" +
            "2. blog/modular-monolith-clean-architecture.html\n" +
            "3. blog/transactional-outbox-pattern.html\n" +
            "4. blog/idempotent-event-processing.html\n" +
            "5. blog/microservices-observability.html",
          "output",
          logsEl
        );
        break;

      case "arch":
        appendLine(
          "[Gateway] -> [Auth/OIDC] -> [.NET 8 Service (MediatR/DDD)]\n" +
            "                                 |                   |\n" +
            "                                 v                   v\n" +
            "                       [SQL Server + Outbox]   [Hangfire Jobs]\n" +
            "                                 |\n" +
            "                                 v\n" +
            "                  [MassTransit + RabbitMQ Quorum Queues]\n" +
            "                                 |\n" +
            "                                 v\n" +
            "              [Payments Consumer: Zarrinpal / Azkivam / Tax]",
          "output",
          logsEl
        );
        break;

      case "contact":
        appendLine(
          "Email:    hamidrezaashkiyan@gmail.com\n" +
            "Phone:    +98 938 928 3165\n" +
            "LinkedIn: https://www.linkedin.com/in/hamidrezaashkiyan/\n" +
            "GitHub:   https://github.com/HamidRezaAshkiyan\n" +
            "Telegram: @HamidRezaAshkiyan",
          "output",
          logsEl
        );
        break;

      case "theme": {
        const btn = document.getElementById("btn-theme-toggle");
        if (btn) btn.click();
        appendLine("Theme toggled.", "output", logsEl);
        break;
      }

      case "clear":
        logsEl.innerHTML = "";
        return;

      case "exit":
        drawer.classList.remove("open");
        return;

      default:
        appendLine(`Unknown command: '${cmd}'. Type 'help' for options.`, "output", logsEl);
    }

    logsEl.scrollTop = logsEl.scrollHeight;
  }

  function appendLine(text, cls, container) {
    const div = document.createElement("div");
    div.className = `terminal-line ${cls}`;
    div.textContent = text;
    container.appendChild(div);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
