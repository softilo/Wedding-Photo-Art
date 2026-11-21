import React from 'react';

export default function DigitalAlbumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F9F8F5] text-stone-900 antialiased selection:bg-stone-900 selection:text-stone-50">
      {children}
    </div>
  );
}
