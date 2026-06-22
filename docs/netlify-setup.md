# Netlify Setup Guide — TropicsTracker.net

How to deploy this static site to Netlify and point `tropicstracker.net` at it. No build step is required; `netlify.toml` at the repo root configures everything.

> Note: account creation, authentication, and DNS changes must be done by you in the Netlify and domain-registrar dashboards. This guide walks you through it.

---

## Option A: Connect the Git repo (recommended)

This gives you automatic deploys on every push.

1. Push this branch (or merge it to `main`) to GitHub.
2. Sign in at [app.netlify.com](https://app.netlify.com).
3. Click **Add new site**, then **Import an existing project**.
4. Choose **GitHub** and authorize Netlify, then pick the `tropicstracker.net` repository.
5. Build settings (Netlify reads `netlify.toml`, so these should auto-fill):
   - **Build command:** leave blank.
   - **Publish directory:** `.` (repo root).
6. Click **Deploy site**. First deploy takes under a minute.
7. Netlify gives you a temporary URL like `random-name-123.netlify.app`. Verify the site loads and all tabs work.

Every future `git push` to the connected branch redeploys automatically. Pull requests get deploy previews.

---

## Option B: Netlify CLI (manual deploys)

Useful for a quick one-off deploy without connecting Git.

```bash
npm install -g netlify-cli
netlify login            # opens a browser to authenticate
netlify deploy           # draft deploy to a preview URL
netlify deploy --prod    # promote to production
```

When prompted for the publish directory, enter `.` (the repo root).

---

## What netlify.toml already handles

- **Publish directory:** repo root, no build command.
- **`/legacy` is hidden:** redirected with a 301 so the archived v1 PHP and test files are not publicly served.
- **Security headers:** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and a `Permissions-Policy` that allows geolocation only from the same origin (needed for the radar "center on me" feature in Sprint 2).
- **Caching:** one-hour cache on `/css` and `/js`.

You do not need to configure any of this in the Netlify UI.

---

## Custom domain (tropicstracker.net)

1. In the site dashboard, go to **Domain management**, then **Add a domain**.
2. Enter `tropicstracker.net`.
3. Point DNS at Netlify. Two paths:
   - **Easiest:** use Netlify DNS. Netlify gives you nameservers; set them at your registrar.
   - **Keep current DNS:** add the records Netlify shows (an `A` record or `ALIAS`/`ANAME` for the apex, and a `CNAME` for `www`).
4. Netlify provisions a free Let's Encrypt SSL certificate automatically once DNS resolves. This can take from a few minutes to a few hours.
5. Enable **Force HTTPS** in the domain settings once the certificate is active.

---

## Post-deploy checklist

- [ ] Temporary `*.netlify.app` URL loads and all five tabs work.
- [ ] `/legacy/index.html` redirects to home (confirms the archive is hidden).
- [ ] Resource Hub links open correctly.
- [ ] Custom domain resolves over HTTPS.
- [ ] Force HTTPS is enabled.
- [ ] Update the `og:url` and any hardcoded URLs if the final domain differs from `https://tropicstracker.net/`.

---

## Notes for future sprints

- **Geolocation (Sprint 2):** already permitted by the `Permissions-Policy` header. Browsers also require HTTPS for geolocation, which Netlify provides.
- **No environment variables needed:** the architecture is key-free by design. If a future feature ever needs a secret, prefer a Netlify Function (serverless) for that single call rather than reintroducing a full backend, and document the exception.
