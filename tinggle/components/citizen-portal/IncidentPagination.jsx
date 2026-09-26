"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
} from "lucide-react";

/**
 * Generate an array of page numbers with ellipsis strings for large page counts
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  pages.push(1);

  if (start > 2) {
    pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push("...");
  }

  pages.push(totalPages);
  return pages;
}

export default function IncidentPagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 5,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [5, 10, 20, 50],
}) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageClick = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);

    // Smooth scroll to top of feed for better user experience
    const feedAnchor = document.getElementById("feed-top-anchor");
    if (feedAnchor) {
      feedAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="p-4 md:p-5 bg-[#141b2a] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg transition-all">
      {/* Left: Item range & count info */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex flex-col">
          {/* <div className="text-xs text-zinc-400 font-mono">
            DISPATCHES <span className="text-white font-bold">{startItem}–{endItem}</span> OF{" "}
            <span className="text-amber-400 font-bold">{totalItems}</span>
          </div> */}
          <div className="text-[13px] text-zinc-500 font-mono">
            PAGE {currentPage} OF {totalPages}
          </div>
        </div>
      </div>

      {/* Center: Pagination Controls */}
      <div className="flex items-center gap-1.5 justify-center flex-wrap">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage === 1}
          title="First Page"
          className="p-2 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous Page"
          className="p-2 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-zinc-500 font-mono text-xs select-none"
                >
                  •••
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-mono font-bold transition-all ${isActive
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/25 border border-amber-400"
                  : "bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white border border-white/5"
                  }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next Page"
          className="p-2 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage === totalPages}
          title="Last Page"
          className="p-2 rounded-xl bg-[#1c2436] hover:bg-[#253046] text-zinc-300 hover:text-white border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Items per page selector */}
      {onItemsPerPageChange && (
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="hidden xl:inline text-[11px] text-zinc-500">SHOW:</span>
          <div className="flex items-center gap-1 bg-[#101622] p-1 rounded-xl border border-white/5">
            {pageSizeOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onItemsPerPageChange(opt);
                  onPageChange(1);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${itemsPerPage === opt
                  ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
