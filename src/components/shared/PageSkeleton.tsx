import React from 'react';

export function PageSkeleton({ label = 'Loading workspace...' }: { label?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-32 rounded-md bg-[#E5DFD0]" />
        <div className="h-9 w-64 rounded-lg bg-[#E5DFD0]" />
        <p className="text-xs font-medium text-[#6B6352]">{label}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="atelier-card h-28 bg-white/85" />
        ))}
      </div>
      <div className="atelier-card h-64 bg-white/85" />
    </div>
  );
}
