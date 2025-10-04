"use client";

import ImageProcessor from '@/components/ImageProcessor';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-card-foreground">SafeVision Content Moderation</h1>
          <p className="text-muted-foreground">AI-powered content detection and blurring with customizable rules</p>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ImageProcessor />
          </div>
          <div className="lg:col-span-1">
            <ConnectionStatus />
          </div>
        </div>
      </main>
    </div>
  );
}
