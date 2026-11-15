# Minimalist Backend Engineer Portfolio & Markdown Blog

A minimalist, high-performance personal portfolio and engineering blog designed for **Hamid Reza Ashkiyan**, showcasing 8+ years of backend and distributed systems experience (ASP.NET Core / .NET 10, PostgreSQL, RabbitMQ, Keycloak, Microservices, Transactional Outbox pattern).

## Features
- **Tech Nerd & Terminal Aesthetic**: Clean dark obsidian palette, emerald/cyan accents, and system status indicators.
- **Microservices Architecture Diagram**: Interactive topology map illustrating API Gateway, Auth, Event Brokers, Outbox tables, and asynchronous consumers.
- **Markdown-Powered Blog**: Pure markdown files stored in `/blog/*.md`. Reads directly into a sleek reader with code formatting and metadata.
- **Embedded Terminal CLI**: Press the `` ` `` (backtick) key or click `terminal` in the header to run interactive commands:
  - `whoami`, `skills`, `arch`, `projects`, `posts`, `curl /health`, `contact`
- **Zero Dependencies**: Pure HTML5, CSS3, and modern Vanilla JS. Ultra-fast loading, zero compile steps, 100/100 Lighthouse score.
- **100% GitHub Pages Ready**: Ready to deploy directly to `https://hamidrezaashkiyan.github.io`.

---

## Quick Local Preview

Run any static file server:

```bash
cd /Users/hamidrezaashkiyan/personal-website
python3 -m http.server 8080
```

Then visit: [http://localhost:8080](http://localhost:8080)

---

## Deploying to GitHub Pages (2 Minutes)

### Option 1: Personal User Site (`hamidrezaashkiyan.github.io`)
1. Create a new repository on GitHub named: **`hamidrezaashkiyan.github.io`**
2. In your terminal:
   ```bash
   cd /Users/hamidrezaashkiyan/personal-website
   git init
   git add .
   git commit -m "feat: initial minimalist portfolio and markdown blog"
   git branch -M main
   git remote add origin https://github.com/HamidRezaAshkiyan/hamidrezaashkiyan.github.io.git
   git push -u origin main
   ```
3. Your website is automatically live at: **`https://hamidrezaashkiyan.github.io`**

### Option 2: Project Site (`/PersonalBrand` or `/portfolio`)
If pushing to an existing repository like `PersonalBrand`:
1. Push the code to the repository.
2. In GitHub, go to **Settings** -> **Pages**.
3. Under **Build and deployment** -> **Branch**, select `main` and folder `/ (root)`, then click **Save**.

---

## Adding a New Blog Post

1. Add your new Markdown file in the `blog/` folder (e.g. `blog/grpc-vs-event-mesh.md`).
2. Add the post metadata to `blog/posts.json`:
   ```json
   {
     "id": "grpc-vs-event-mesh",
     "slug": "grpc-vs-event-mesh",
     "title": "When to Use gRPC vs Event Choreography in Microservices",
     "date": "2026-11-15",
     "readTime": "6 min read",
     "tags": ["Microservices", "gRPC", "RabbitMQ"],
     "summary": "Deep dive into synchronous RPC vs asynchronous event-driven communications...",
     "file": "blog/grpc-vs-event-mesh.md"
   }
   ```
3. Commit and push. The blog dynamically loads and displays your new article immediately!
