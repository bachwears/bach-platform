"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface SizeGuideData {
  name: string;
  note: string | null;
  headers: string[];
  rows: string[][];
}

export function SizeGuide({ guide, label = "Size guide" }: { guide: SizeGuideData; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="type-meta underline underline-offset-4 hover:opacity-60"
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/20 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg border bg-background p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="type-heading">{guide.name}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close size guide"
                className="-me-2 -mt-2 grid h-11 w-11 place-items-center"
              >
                <X className="h-5 w-5" strokeWidth={1} aria-hidden />
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b text-start">
                    {guide.headers.map((h) => (
                      <th key={h} className="type-meta py-2 pe-4 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className={`py-2 pe-4 ${j === 0 ? "font-medium" : "text-muted-foreground"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {guide.note && <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{guide.note}</p>}
          </div>
        </div>
      )}
    </>
  );
}
