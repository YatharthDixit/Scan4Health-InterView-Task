# Scan4Health Frontend

Next.js client for the Scan4Health intake queue.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_API_URL` if the Django API is not running at
`http://localhost:8000/api`.

## Verify

```bash
npm run lint
npx next build --webpack
npx tsc --noEmit
```

Design tokens live in `src/app/globals.css`; components should use semantic
token classes such as `bg-surface-muted`, `text-danger`, and `border-line`
rather than raw palette colors.
