//components/project-info.tsx
'use client';

import { Info } from 'lucide-react';

export const ProjectInfo = () => {
  return (
    <footer className="w-full bg-background/50 backdrop-blur-sm border-t border-white/10">
      <div className="container flex flex-col items-center gap-4 py-6 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Info className="h-5 w-5 text-white/50" />
          <p className="text-center text-sm leading-loose text-white/50 md:text-left">
            MyQuery can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </footer>
  );
};
