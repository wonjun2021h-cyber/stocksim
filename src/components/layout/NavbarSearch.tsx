"use client";

import { SearchBar } from "@/components/layout/SearchBar";
import { MobileSearchButton } from "@/components/layout/MobileSearch";
import type { StockInfo } from "@/lib/types";

interface NavbarSearchProps {
  stocks: StockInfo[];
  placeholder?: string;
}

/** 모바일: 검색 버튼 / 데스크톱: 인라인 검색창 */
export function NavbarSearch({
  stocks,
  placeholder = "주식 검색하기",
}: NavbarSearchProps) {
  return (
    <>
      <div className="md:hidden flex-1 min-w-0">
        <MobileSearchButton stocks={stocks} />
      </div>
      <div className="hidden md:block min-w-0">
        <SearchBar
          stocks={stocks}
          variant="navbar"
          placeholder={placeholder}
        />
      </div>
    </>
  );
}
