import { Suspense } from "react";

import { QueueView } from "@/components/submissions/QueueView";

export default function Home() {
  return (
    // Suspense boundary required because QueueView reads useSearchParams.
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <QueueView />
    </Suspense>
  );
}
