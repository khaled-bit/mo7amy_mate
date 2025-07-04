import React, { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "./table";

export interface DataTableColumn<T> {
  key: keyof T;
  label: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  initialSort?: { key: keyof T; direction: "asc" | "desc" };
  initialPageSize?: number;
}

export function DataTable<T extends object>({
  columns,
  data,
  initialSort,
  initialPageSize = 10,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSort?.key || null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    initialSort?.direction || "asc"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Handle numbers
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      // Handle strings and other types
      const aString = String(aValue);
      const bString = String(bValue);
      return sortDirection === "asc"
        ? aString.localeCompare(bString, "ar")
        : bString.localeCompare(aString, "ar");
    });
  }, [data, sortKey, sortDirection]);

  // Pagination logic
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  // Handlers
  const handleSort = (key: keyof T, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const getAlignmentClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      case "left":
        return "text-left";
      default:
        return "text-right"; // Default to RTL alignment
    }
  };

  return (
    <div className="w-full flex flex-col min-h-[400px] h-full">
      {/* Table Section */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={`${getAlignmentClass(col.align)} whitespace-nowrap`}
                  style={{ cursor: col.sortable ? "pointer" : undefined }}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <span className="flex items-center gap-1 select-none">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-xs">{sortDirection === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={`${getAlignmentClass(col.align)} whitespace-nowrap`}
                    >
                      {col.render ? col.render(row) : (row[col.key] as any)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section - Always at Bottom */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>عرض</span>
            <select
              className="border rounded px-2 py-1 bg-background text-sm"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={25}>25</option>
            </select>
            <span>من {totalRows} نتيجة</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              السابق
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`px-3 py-1 border rounded text-sm min-w-[40px] ${
                      page === pageNum
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted transition-colors"
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              التالي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 