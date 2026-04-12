import { Suspense } from "react";
import { ExplorePage } from "@/components/explore-page";

export default function ExploreRoute() {
  return (
    <Suspense fallback={null}>
      <ExplorePage />
    </Suspense>
  );
}
