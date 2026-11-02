# Quyk landing (quyk.io)

Static site, no build step: `index.html`, `css/site.css`, `js/site.js`.
Vendored: GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13 (`vendor/`), Hanken Grotesk woff2 (`fonts/`, OFL).

- Preview locally: `python3 -m http.server -d apps/landing_web 8765`
- Deploy on the VPS: `git pull && bash scripts/deploy-landing.sh` (served by the `quyk-static` nginx container for quyk.io and www.quyk.io).
- Respects `prefers-reduced-motion`; all content is visible without JavaScript.

Replaces the Flutter `apps/marketing_website` on quyk.io.
