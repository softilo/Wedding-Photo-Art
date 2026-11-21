import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wedding PhotoArt — Wedding Photography & Cinematography | Feni, Bangladesh',
  description:
    'Wedding PhotoArt is a professional Wedding Photography & Cinematography team based in Feni, Bangladesh. Specializing in Wedding, Holud, Reception, Engagement, Couple, and Pre-Wedding Photography.',
  icons: {
    icon: '/brand/wedding-photoart-logo.png',
    apple: '/brand/wedding-photoart-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F9F8F5] text-[#181611] font-sans selection:bg-[#CAA650]/25 selection:text-[#181611]">
        {children}
      </body>
    </html>
  );
}
