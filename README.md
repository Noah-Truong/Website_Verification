# Nortiq Verify

An internal verification console for Nortiq web developers. It turns the
**Website Development Manual** (Phases 6 & 7) into a repeatable, automated
pre-delivery audit.

Each employee logs in, creates a project with the **live website URL**, the
**Git repository**, and the **client's requirements document** (PDF / DOCX /
TXT / MD). The document is parsed into a verification checklist, and the live
site is audited against the manual's SEO, security, link, accessibility, and
performance criteria.

## Features

- **Authentication** — internal members live in a Supabase `users` table with
  bcrypt-hashed passwords. Sessions are signed JWTs stored in an httpOnly
  cookie; all app routes are protected by middleware.
- **Client document → checklist** — uploads are parsed (PDF, DOCX, TXT, MD) and
  requirement-like lines (checkboxes, bullets, numbered lists, "must/should/
  required" sentences) are extracted into an interactive, section-grouped
  checklist the developer can tick off.
- **Automated audit engine** — fetches the live site and runs the manual's
  checks:
  - **SEO / structured data** — title, meta description (100–160 chars),
    self-referencing canonical, Open Graph tags, Twitter card, single H1,
    heading hierarchy, JSON-LD (Sec.6.1 / 6.2).
  - **Site files** — `robots.txt` + `Sitemap:` line, `sitemap.xml` URLs, 404
    handling (Sec.6.1.1 / 6.1.2).
  - **Security headers** — HSTS, X-Content-Type-Options, Referrer-Policy,
    Permissions-Policy, X-Frame-Options, HTTPS (Sec.6.1.3 / 6.5).
  - **Links & accessibility** — crawlable anchors (no empty/`javascript:` href —
    Nortiq Issue 28), external `rel="noopener"`, image `alt`, `html lang`,
    viewport (Sec.6.4).
  - **Performance** — real Lighthouse scores (Performance / Accessibility /
    Best Practices / SEO + LCP/CLS) via the Google PageSpeed Insights API
    (Phase 7 Sec.7.4).
- **Scoring & history** — every run yields a weighted score and pass/warn/fail
  summary; the last 10 runs are kept per project.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- `jose` (JWT) sessions + `bcryptjs` for password hashing
- Supabase (Postgres) for users and projects (parsed document text stored as JSONB)
- `cheerio` for HTML analysis, `pdf-parse` + `mammoth` for documents

## Getting started

```bash
npm install

# Configure environment
cp .env.example .env.local
# then set AUTH_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY

# Create the database schema + seed a user:
# open the Supabase SQL editor and run supabase/schema.sql
# (edit the seeded email/password near the bottom first)

npm run dev
# open http://localhost:3000 → sign in → create a project
```

### Environment variables

| Variable           | Required | Purpose                                                        |
| ------------------ | -------- | -------------------------------------------------------------- |
| `AUTH_SECRET`      | yes      | Secret used to sign session JWTs.                              |
| `PAGESPEED_API_KEY`| no       | Raises the PageSpeed Insights quota (Lighthouse still runs without it, subject to lower public rate limits). |
| `GITHUB_TOKEN`     | no       | Reserved for repository inspection rate limits.                |

## How it works

1. **Create a project** — provide the website URL, repo URL, and upload the
   client document. The document text is extracted and requirements become a
   checklist.
2. **Run verification** — the engine fetches the homepage, discovers internal
   pages (via `sitemap.xml` and on-page links, up to 8), audits each page, runs
   site-wide and security checks, and measures performance via PageSpeed
   Insights for the first few pages.
3. **Review** — see the score ring, per-page pass/warn/fail breakdown, the
   Lighthouse table, and tick off the client requirements as you confirm them.

## Notes

- Data is persisted in `data/store.json` (git-ignored). Uploaded documents are
  stored under `data/uploads/`.
- PageSpeed Insights is best-effort: if the public API is rate-limited or the
  site is unreachable, the run still completes and the SEO/security checks are
  unaffected.
- For Vercel preview URLs, temporarily disable preview authentication during
  verification so the audit bot can reach the site (manual Sec.7.6).
# Website_Verification
