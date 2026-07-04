# Scan4Health Frontend

Next.js client for the Scan4Health intake queue.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

For local review, the app defaults to `http://localhost:8000/api`.
Production Docker builds can use a same-origin `/api` value when Nginx proxies
API traffic on the same domain. Set `NEXT_PUBLIC_API_URL` only when the Django
API is hosted on a different origin.

## Verify

```bash
npm run lint
npx next build --webpack
npx tsc --noEmit
```

Design tokens live in `src/app/globals.css`; components should use semantic
token classes such as `bg-surface-muted`, `text-danger`, and `border-line`
rather than raw palette colors.
