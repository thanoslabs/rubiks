# AGENTS.md

## Purpose

Lightweight interactive Rubik's cube, served as a static page (no backend, no build step). Bootstrapped from the `thanoslabs` template, so it also carries Renovate, branch protection, CODEOWNERS, and the label-driven release workflow.

## Tech stack

- **Vanilla JavaScript ES modules** under `app/`, loaded directly by the browser — no bundler, no npm runtime dependencies
- **Node.js** (version in `.tool-versions`) only to run unit tests with the built-in `node:test` runner
- **nginx** (`nginxinc/nginx-unprivileged`, Alpine) to serve `app/` in the self-hosting container image
- **Renovate** for dependency updates (managers: `asdf`, `docker-compose`, `dockerfile`, `github-actions`, `gomod`)
- **GitHub Actions** for CI (unit tests and an image build + smoke test on PRs), GitHub Pages deploys, releases (tag + GHCR image), and Renovate
- **[nebula-md](https://github.com/thanoslabs/nebula-md)** for building `docs/` into a static markdown site, served under `/docs/` on Pages
- **MIT License**

## Structure

```
.
├── .agents/                  # Agent instructions and skills
├── app/                      # Static site root (serve this directory as-is)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js           # Page wiring: controls, keyboard, turn queue, localStorage
│       ├── view.js           # CSS 3D rendering, turn animation, pointer drag handling (DOM)
│       ├── celebrate.js      # Confetti canvas (DOM)
│       ├── session.js        # Attempt status, move count, timer; persisted as move history (pure)
│       ├── drag.js           # Screen geometry: sticker drag -> layer turn, turn -> CSS rotation (pure)
│       ├── queue.js          # Sequential task queue for turn animations (pure)
│       ├── cube.js           # Cube state (54-facelet string), geometry-derived moves, isSolved
│       ├── notation.js       # Parse/format/invert standard notation (U D L R F B M E S x y z, ' 2)
│       └── scramble.js       # WCA-style 25-move random-move scrambles
├── test/                     # node:test unit tests (*.test.js)
├── .github/
│   ├── CODEOWNERS            # @thanoslabs/reviewers
│   ├── renovate-config.js    # Renovate platform config
│   └── workflows/
│       ├── ci.yml            # Unit tests; image build + smoke test
│       ├── pages.yaml        # Pages: app at root + nebula-md docs at /docs/
│       ├── release.yaml      # Label-driven SemVer release + GHCR image publish
│       └── renovate.yaml     # Renovate workflow
├── docs/                     # Project documentation (markdown source for the docs site)
├── nginx/                    # nginx server config + security headers for the image
├── Dockerfile                # Self-hosting image (serves app/ on :8080, non-root)
├── .tool-versions            # Pinned language/tool versions (asdf/mise)
├── AGENTS.md                 # Operational expectations for humans and AI agents
├── CONTRIBUTING.md
├── LICENSE
├── package.json              # Test script only; no dependencies
├── README.md
├── SECURITY.md
└── renovate.json             # Renovate settings
```

## Commands

| Task | Command |
|---|---|
| Install tools | `mise install` (or `asdf install`) |
| Unit tests | `npm test` |
| Run locally | `python3 -m http.server -d app 8000` → http://localhost:8000 |
| Container | `docker build -t rubiks . && docker run --rm -p 8080:8080 rubiks` |

No linter or type checker is configured; keep modules dependency-free and document public functions with JSDoc. Keep logic in the pure modules (no DOM access at import time) so it stays unit-testable; `main.js`, `view.js`, and `celebrate.js` are the only DOM modules. Use relative URLs only — the site is served from a subpath on GitHub Pages.

## Conventions

- `.tool-versions` is the single source of truth for language and tool versions. Before building, testing, or running any tooling, check it and use the pinned versions (install via `asdf install` or `mise install`). When adding a new language or tool to the project, pin its version there first — never assume a globally installed version.
- Versioning: project artifacts (releases, tags, packages, images) follow [SemVer](https://semver.org/) as bare `X.Y.Z` — no `v` prefix (`1.4.2`, not `v1.4.2`). Bump MAJOR for breaking changes, MINOR for backwards-compatible features, PATCH for fixes.
- See `AGENTS.md` for full agent workflow, code style, testing, and git/PR guidance.
- Branch protection: never push directly to `main`; all changes via PR with review.
- The app must load nothing from other origins: the image's CSP is `default-src 'self'` (plus `data:` images). Don't add CDNs, inline scripts, or inline `<style>`.

## Releases

- All released artifacts (images, binaries, packages) are versioned with [SemVer](https://semver.org/) as bare `X.Y.Z` tags — no `v` prefix.
- **Automatic bumps**: when a PR merges to `main`, the next version is derived from the PR label:
  - `major` — breaking changes
  - `minor` — backwards-compatible features
  - `patch` — fixes
  - No label — defaults to a `patch` bump
- **Manual releases**: a specific version may be cut manually by supplying an explicit `X.Y.Z` version tag when needed (e.g. via a manual workflow dispatch). This bypasses the label-based bump.
- Release automation lives in `.github/workflows/release.yaml`: it computes the next version, builds and pushes `ghcr.io/<owner>/<repo>:X.Y.Z` and `:latest` (amd64 + arm64), then tags and creates the GitHub release. It only runs from `main`. The GHCR package must be public, and the org must allow `GITHUB_TOKEN` to create packages (see `docs/self-hosting.md`).

## Docs

- Project documentation lives in `docs/` as markdown and is the source for the project's docs site. Do not introduce another static site generator (MkDocs, Docusaurus, etc.) — docs are built with [nebula-md](https://github.com/thanoslabs/nebula-md).
- `.github/workflows/pages.yaml` builds nebula-md (pinned commit in `NEBULA_MD_REF`) and places the docs under `/docs/` next to the app at the Pages root. nebula-md's reusable deploy workflow is not used because it deploys on its own and would overwrite the app. Generation happens in CI only — do not commit built HTML.
- Deployment to GitHub Pages runs only when the repository is **public**; private repos skip the job. Public repos must set **Settings → Pages → Source** to **GitHub Actions**.
- Pages are Obsidian-flavoured markdown: YAML frontmatter (`title`, `tags`, `date`), `[[wikilinks]]` between pages, and callouts. `docs/index.md` is the site's landing page.
