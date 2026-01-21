import React from 'react';
import { cn } from '@/lib/utils';

interface EditorLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function EditorLayout({ children, className }: EditorLayoutProps) {
  return (
    <div className={cn("flex h-screen bg-background text-foreground", className)}>
      {children}
    </div>
  );
}
