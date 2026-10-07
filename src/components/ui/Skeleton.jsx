import React from 'react';

/**
 * Skeleton loader primitivo (Ponytail style).
 * Substitui spinners crus para evitar Layout Shift (CLS).
 */
export default function Skeleton({ className = '', variant = 'text', count = 1 }) {
  const base = "animate-pulse rounded bg-slate-200 dark:bg-slate-800";

  const variants = {
    text: "h-4 w-full",
    title: "h-6 w-3/4",
    avatar: "h-10 w-10 rounded-full",
    card: "h-28 w-full rounded-xl",
    button: "h-10 w-24 rounded-lg",
    rect: "h-20 w-full rounded-md",
  };

  const selectedClass = variants[variant] || variants.text;

  if (count > 1) {
    return (
      <div className="space-y-2 w-full">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`${base} ${selectedClass} ${className}`} />
        ))}
      </div>
    );
  }

  return <div className={`${base} ${selectedClass} ${className}`} />;
}
