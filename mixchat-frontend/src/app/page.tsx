'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/feed');
  }, [router]);

  return (
    <div className="min-h-app-viewport bg-background flex flex-col items-center justify-center text-white">
      <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-400">Loading MixChat...</p>
    </div>
  );
}
