"use client";

import dynamic from "next/dynamic";

const InteractiveMap = dynamic(
  () =>
    import("@/features/map/components/InteractiveMap").then(
      (mod) => mod.InteractiveMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full h-[calc(100vh-5rem)] md:h-[calc(100vh-6.5rem)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#070913] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-xs font-semibold text-white/50 tracking-wider uppercase">
            Loading MixChat Map...
          </p>
        </div>
      </div>
    ),
  },
);

export default function MapPage() {
  return <InteractiveMap />;
}
