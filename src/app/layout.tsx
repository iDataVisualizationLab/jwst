// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import Navbar from '@/components/Navbar/Navbar';
// import Controller from '@/components/Controller';
import SidebarLayout from '@/components/Sidebar/SidebarLayout';
import { PlotSettingsProvider } from '@/context/PlotSettingsContext';
export const metadata = {
  title: 'JWST Precision Timing',
  description: 'Data visualization for JWST time-series analysis',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <div className="flex flex-col min-h-screen">
          <PlotSettingsProvider>
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
              <SidebarLayout />
              <main className="flex-1 h-[calc(100vh-4rem)] overflow-auto">
                {children}
              </main>
            </div>
          </PlotSettingsProvider>
        </div>
      </body>
    </html>
  );
}