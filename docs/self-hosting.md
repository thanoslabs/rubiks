---
title: Self-hosting
tags: [guide, ops]
---

## Container image

```sh
docker run -d --name rubiks -p 8080:8080 ghcr.io/thanoslabs/rubiks:latest
```

- The image is based on `nginxinc/nginx-unprivileged` (Alpine). It runs as a non-root user and listens on port **8080**.
- It's tagged with each release's bare SemVer version (`1.2.3`) and `latest`, for `linux/amd64` and `linux/arm64`.
- It includes a `HEALTHCHECK` that requests `/`.
- Every response carries a strict Content-Security-Policy (`default-src 'self'`). The app loads nothing from other origins.
- `index.html` is served with `Cache-Control: no-cache`, so a new release is picked up on the next visit.
- The image contains only the app. The docs site is published on GitHub Pages.

To pin a version, use a release tag instead of `latest`:

```sh
docker run -d -p 8080:8080 ghcr.io/thanoslabs/rubiks:1.0.0
```

## Publishing (maintainers)

The **Release** workflow pushes the image with the workflow's `GITHUB_TOKEN`. On the first push:

- Make sure the organisation allows Actions to create packages.
- The new `rubiks` package is private by default. Make it public under **Package settings → Change visibility**, so anonymous `docker pull` works.
- Check that it's linked to this repository. The image's `org.opencontainers.image.source` label does this automatically.

If the push fails, the release isn't tagged, and the workflow can simply be re-run.

## Any static host

The app is the `app/` directory as-is. It has no build step and uses only relative URLs, so it works from a subpath too:

```sh
python3 -m http.server -d app 8000
```

Serve `.js` files as `text/javascript` (or `application/javascript`), because browsers require a JavaScript MIME type for ES modules.

## GitHub Pages

`.github/workflows/pages.yaml` deploys on every push to `main` that touches `app/` or `docs/`. It puts the app at the site root and the docs under `/docs/`. To enable it on a fork:

1. Make the repository public. Private repos skip the deploy.
2. Set **Settings → Pages → Source** to **GitHub Actions**.
