import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDualDate(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '';
  const gregorian = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const hijri = date.toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: 'numeric', day: 'numeric' });
  return `${gregorian.replace(/-/g, '/')} (${hijri} هـ)`;
}
