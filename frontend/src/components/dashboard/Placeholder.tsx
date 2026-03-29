"use client";

import { Building2 } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="bg-indigo-50 p-6 rounded-3xl mb-8 group hover:scale-110 transition-transform">
        <Building2 className="w-16 h-16 text-indigo-200 group-hover:text-indigo-600 transition-colors" />
      </div>
      <h1 className="text-4xl font-black text-slate-950 mb-4">{title} Under Construction</h1>
      <p className="text-xl text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">We're building out the advanced {title.toLowerCase()} system. Check back in Phase 5!</p>
    </div>
  );
}
