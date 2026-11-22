import React from 'react';
import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SessionProvider } from '@/components/SessionProvider';
import { ProductModalProvider } from '@/components/ProductModalProvider';

export const metadata: Metadata = {
  title: 'PC Builder Store - NoSQL MongoDB Project',
  description: 'Hệ thống xây dựng cấu hình và bán linh kiện PC hiện đại cho đồ án môn Cơ sở dữ liệu Phi quan hệ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <SessionProvider>
          <ProductModalProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </ProductModalProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
