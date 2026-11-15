/**
 * Hamid Reza Ashkiyan — Minimalist Backend & Microservices Portfolio
 * Vanilla JS: zero dependencies, markdown parser, terminal CLI emulator
 */

// Fallback posts data (used if fetch fails on local file:// protocol)
const FALLBACK_POSTS = [
  {
    id: "modular-monolith-clean-architecture",
    slug: "modular-monolith-clean-architecture",
    title: "Structuring Modular Monoliths with Clean Architecture, MediatR & MassTransit",
    date: "2026-11-15",
    readTime: "8 min read",
    tags: ["Modular Monolith", "Clean Architecture", "DDD", "MediatR", "MassTransit", "C# .NET"],
    summary: "How to design loosely coupled modules with independent persistence, strict contract boundaries, and asynchronous event buses before jumping prematurely to microservices.",
    file: "blog/modular-monolith-clean-architecture.md"
  },
  {
    id: "transactional-outbox-pattern",
    slug: "transactional-outbox-pattern",
    title: "Eliminating Dual-Write Hazards: Transactional Outbox Pattern in .NET & RabbitMQ",
    date: "2026-09-18",
    readTime: "7 min read",
    tags: ["Distributed Systems", "RabbitMQ", ".NET", "PostgreSQL", "Architecture"],
    summary: "Why database commits combined with direct message publishing fail in production, and how to implement a bulletproof transactional outbox with change data capture or polling workers.",
    file: "blog/transactional-outbox-pattern.md"
  },
  {
    id: "idempotent-event-processing",
    slug: "idempotent-event-processing",
    title: "Designing Bulletproof Idempotent Consumers in Distributed Systems",
    date: "2026-07-04",
    readTime: "5 min read",
    tags: ["Microservices", "Event-Driven", "RabbitMQ", "Resilience"],
    summary: "Network retries and broker reconnects inevitably lead to duplicate messages. Here is how we design zero-duplicate consumer pipelines with distributed locks and inbox tables.",
    file: "blog/idempotent-event-processing.md"
  },
  {
    id: "microservices-observability",
    slug: "microservices-observability",
    title: "Distributed Tracing & Correlation IDs Across 20+ Microservices",
    date: "2026-05-12",
    readTime: "6 min read",
    tags: ["Observability", "OpenTelemetry", "Docker", "DevOps"],
    summary: "How to trace a single user request flowing through API gateways, messaging queues, and background processors without losing the correlation trail.",
    file: "blog/microservices-observability.md"
  }
];

let postsData = [];

document.addEventListener("DOMContentLoaded", () => {
  initSystemMetrics();
  initBlogList();
  initTerminal();
  initNavigation();
  handleHashChange();
});

window.addEventListener("hashchange", handleHashChange);

/**
 * Live system status metrics simulation
 */
function initSystemMetrics() {
  const latencyEl = document.getElementById("metric-latency");
  if (!latencyEl) return;
  
  setInterval(() => {
    const lat = Math.floor(Math.random() * 5) + 10;
    latencyEl.textContent = `${lat}ms`;
  }, 4000);
}

/**
 * Load and render blog posts list
 */
async function initBlogList() {
  const listEl = document.getElementById("blog-list");
  if (!listEl) return;

  try {
    const res = await fetch("blog/posts.json");
    if (!res.ok) throw new Error("Could not load posts.json");
    postsData = await res.json();
  } catch (e) {
    console.warn("Using fallback posts manifest:", e);
    postsData = FALLBACK_POSTS;
  }

  listEl.innerHTML = postsData.map(post => `
    <article class="blog-card" onclick="openPost('${post.slug}')">
      <div class="blog-meta">
        <span>📅 ${post.date}</span>
        <span>•</span>
        <span>⏱️ ${post.readTime}</span>
      </div>
      <h3 class="blog-title">${escapeHtml(post.title)}</h3>
      <p class="blog-summary">${escapeHtml(post.summary)}</p>
      <div class="blog-tags">
        ${post.tags.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

/**
 * Open a specific blog post
 */
async function openPost(slug) {
  const post = postsData.find(p => p.slug === slug);
  if (!post) return;

  const overlay = document.getElementById("post-viewer-overlay");
  const contentEl = document.getElementById("post-markdown-content");
  
  window.location.hash = `post/${slug}`;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  
  contentEl.innerHTML = `<div style="font-family: var(--font-mono); color: var(--accent-cyan); padding: 2rem 0;">Fetching ${post.file}...</div>`;

  try {
    const res = await fetch(post.file);
    if (!res.ok) throw new Error("Could not load markdown file");
    const rawMarkdown = await res.text();
    // Strip YAML frontmatter if present
    const cleanMarkdown = rawMarkdown.replace(/^---[\s\S]*?---\s*/, "");
    contentEl.innerHTML = renderSimpleMarkdown(cleanMarkdown);
  } catch (err) {
    contentEl.innerHTML = `
      <h1>${escapeHtml(post.title)}</h1>
      <p style="color: var(--accent-amber); font-family: var(--font-mono); font-size: 0.85rem; margin: 1rem 0;">
        [Notice: Direct file:// access detected. To read full markdown from disk, run a local static server like 'python3 -m http.server' or view on GitHub Pages]
      </p>
      <p>${escapeHtml(post.summary)}</p>
      <h2>Topics Covered</h2>
      <ul>
        ${post.tags.map(t => `<li><strong>${escapeHtml(t)}</strong></li>`).join("")}
      </ul>
      <p style="margin-top: 1.5rem;">File path: <code>${escapeHtml(post.file)}</code></p>
    `;
  }
}

function closePost() {
  const overlay = document.getElementById("post-viewer-overlay");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  if (window.location.hash.startsWith("#post/")) {
    window.location.hash = "#blog";
  }
}

/**
 * Handle URL hash changes
 */
function handleHashChange() {
  const hash = window.location.hash;
  if (hash.startsWith("#post/")) {
    const slug = hash.replace("#post/", "");
    openPost(slug);
  } else if (hash === "") {
    const overlay = document.getElementById("post-viewer-overlay");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

/**
 * Simple zero-dependency Markdown to HTML parser
 */
function renderSimpleMarkdown(md) {
  let html = md;

  // Code blocks ```csharp ... ```
  html = html.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, (match, code) => `<code>${escapeHtml(code)}</code>`);

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^\s*\-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return "";
    if (p.startsWith("<h") || p.startsWith("<pre") || p.startsWith("<ul") || p.startsWith("<blockquote")) {
      return p;
    }
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Terminal Drawer & CLI Emulator
 */
function initTerminal() {
  const drawer = document.getElementById("terminal-drawer");
  const toggleBtn = document.getElementById("btn-terminal-toggle");
  const closeBtn = document.getElementById("btn-terminal-close");
  const inputEl = document.getElementById("terminal-cli-input");
  const logsEl = document.getElementById("terminal-logs");

  if (!drawer || !inputEl) return;

  function toggleTerminal() {
    drawer.classList.toggle("open");
    if (drawer.classList.contains("open")) {
      inputEl.focus();
    }
  }

  if (toggleBtn) toggleBtn.addEventListener("click", toggleTerminal);
  if (closeBtn) closeBtn.addEventListener("click", () => drawer.classList.remove("open"));

  window.addEventListener("keydown", (e) => {
    if (e.key === "`" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      toggleTerminal();
    }
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const rawCmd = inputEl.value.trim();
      inputEl.value = "";
      if (!rawCmd) return;
      executeCommand(rawCmd, logsEl);
    }
  });
}

function executeCommand(cmd, logsEl) {
  appendTerminalLine(`hamid@mesh:~$ ${escapeHtml(cmd)}`, "cmd-echo", logsEl);
  const parts = cmd.toLowerCase().split(" ");
  const action = parts[0];

  switch (action) {
    case "help":
      appendTerminalLine(
        "Available commands:\n" +
        "  whoami          Display engineer profile & bio\n" +
        "  skills          Print core stack matrix & backend tooling\n" +
        "  arch            Render ASCII distributed architecture\n" +
        "  projects        List primary production repositories\n" +
        "  posts           List published engineering articles\n" +
        "  curl            Try 'curl /health' or 'curl /metrics'\n" +
        "  contact         Show reachability options & LinkedIn\n" +
        "  clear           Clear the terminal logs\n" +
        "  exit            Close terminal drawer",
        "output", logsEl
      );
      break;

    case "whoami":
      appendTerminalLine(
        "Hamid Reza Ashkiyan\n" +
        "Senior Backend Engineer & Distributed Systems Architect (8+ years)\n" +
        "Stack: C#, ASP.NET Core, Clean Architecture, DDD, MediatR, MassTransit, RabbitMQ, SQL Server, PostgreSQL, Git\n" +
        "LinkedIn: https://www.linkedin.com/in/hamidrezaashkiyan/\n" +
        "GitHub:   https://github.com/HamidRezaAshkiyan",
        "output", logsEl
      );
      break;

    case "skills":
      appendTerminalLine(
        "[LANGUAGES & CORE]   C# (.NET 8/9/10), ASP.NET Core Web API, SQL, Python\n" +
        "[ARCHITECTURE]      Domain-Driven Design (DDD), Clean Architecture, Modular Monoliths, Microservices, CQRS\n" +
        "[MESSAGING & BUS]    RabbitMQ, MassTransit, MediatR, In-Memory EventBus, Outbox/Inbox Patterns\n" +
        "[DATABASES]         Microsoft SQL Server, PostgreSQL, Redis (Distributed Cache & Redlock), EF Core, Dapper\n" +
        "[DEVOPS & TOOLS]    Git, Docker, Docker Compose, Keycloak (OIDC/JWT), OpenTelemetry, Serilog",
        "output", logsEl
      );
      break;

    case "arch":
      appendTerminalLine(
        "+-------------+      +------------------+      +----------------------+\n" +
        "|  API Gate   | ---> | Auth / Keycloak  | ---> | Orders (MediatR/CQRS)|\n" +
        "+-------------+      +------------------+      +----------------------+\n" +
        "                                                         | (MassTransit)\n" +
        "                                                         v\n" +
        "+-------------+      +------------------+      +----------------------+\n" +
        "| SQL Server  | <--- | Payment Service  | <--- |  RabbitMQ Event Bus  |\n" +
        "| PostgreSQL  |      | (Consumer/Inbox) |      |                      |\n" +
        "+-------------+      +------------------+      +----------------------+",
        "output", logsEl
      );
      break;

    case "projects":
      appendTerminalLine(
        "1. ModularMonolith         - ASP.NET Core (.NET 10), Clean Architecture, MediatR, MassTransit\n" +
        "2. KasraCodeChallenge      - 3-tier microservices (.NET 10, RabbitMQ, PostgreSQL, Keycloak)\n" +
        "3. TelegramAIStoryEngine   - Asynchronous worker queue for AI language generation\n" +
        "4. LibTrack                - Clean Architecture inventory & reservation state machine\n" +
        "5. PersianKeyboardRedefined- Low-level OS layout standardizer\n" +
        "6. HiddenVirusRemover      - C# NTFS file attribute recovery engine",
        "output", logsEl
      );
      break;

    case "posts":
      appendTerminalLine(
        "1. Structuring Modular Monoliths with Clean Architecture, MediatR & MassTransit\n" +
        "2. Eliminating Dual-Write Hazards: Transactional Outbox Pattern in .NET & RabbitMQ\n" +
        "3. Designing Bulletproof Idempotent Consumers in Distributed Systems\n" +
        "4. Distributed Tracing & Correlation IDs Across 20+ Microservices",
        "output", logsEl
      );
      break;

    case "curl":
      if (parts[1] === "/health" || parts[1] === "/api/health") {
        appendTerminalLine('{"status":"HEALTHY","uptime":"8y 4m","services":12,"sql_server":"CONNECTED","rabbitmq":"CONNECTED","masstransit":"RUNNING"}', "output", logsEl);
      } else if (parts[1] === "/metrics") {
        appendTerminalLine('http_requests_total{status="200"} 8492019\nevent_lag_seconds 0.002\nmemory_allocated_mb 142.6', "output", logsEl);
      } else {
        appendTerminalLine("Usage: curl /health | curl /metrics", "output", logsEl);
      }
      break;

    case "contact":
      appendTerminalLine(
        "LinkedIn: https://www.linkedin.com/in/hamidrezaashkiyan/\n" +
        "GitHub:   https://github.com/HamidRezaAshkiyan\n" +
        "Email:    hamidrezaashkiyan@gmail.com\n" +
        "Status:   Open to Senior Backend Engineer / Architecture roles.",
        "output", logsEl
      );
      break;

    case "clear":
      logsEl.innerHTML = "";
      return;

    case "exit":
      document.getElementById("terminal-drawer").classList.remove("open");
      return;

    default:
      appendTerminalLine(`Command not found: ${action}. Type 'help' for available commands.`, "output", logsEl);
      break;
  }

  logsEl.scrollTop = logsEl.scrollHeight;
}

function appendTerminalLine(text, type, logsEl) {
  const line = document.createElement("div");
  line.className = `terminal-line ${type}`;
  line.style.whiteSpace = "pre-wrap";
  if (type === "cmd-echo") {
    line.style.color = "var(--accent-green)";
  } else {
    line.style.color = "#94a3b8";
  }
  line.textContent = text;
  logsEl.appendChild(line);
}

function initNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.startsWith("#post/")) return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
