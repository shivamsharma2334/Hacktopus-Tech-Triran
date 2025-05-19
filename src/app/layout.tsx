
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; 
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from '@/components/providers/query-provider'; 

export const metadata: Metadata = {
  title: 'CropWise',
  description: 'AI-Powered Crop Prediction',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Use GeistSans variable directly if preferred, or apply font-sans globally */}
      <body className={`font-sans antialiased ${GeistSans.variable}`}>
        {/* Wrap children with the new client-side QueryProvider */}
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
