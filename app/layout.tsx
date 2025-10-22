import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'HOLLY - AI Super Agent',
  description: 'Hyper-Optimized Logic & Learning Yield - Your Autonomous AI Development Partner',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
