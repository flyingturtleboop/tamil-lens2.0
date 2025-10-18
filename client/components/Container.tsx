import React from "react";

export default function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // Slightly wider than Tailwind's max-w-7xl (1280px). This is ~1408px.
  return (
    <div className={`mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
