import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === "string" ? Number.parseFloat(amount.replace(/[^\d.-]/g, "")) : amount

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(numAmount)
}

/**
 * Formats a date coming from different sources:
 * - Appwrite's $createdAt (ISO 8601 string)
 * - numeric epoch (ms)
 * - Date instance
 *
 * Previously this used `toLocaleDateString` and tried to parse strings as integers,
 * which broke ISO timestamps like Appwrite's $createdAt (e.g. "2025-09-24T06:12:34.000+00:00").
 */
export function formatDate(input: number | string | Date): string {
  let date: Date

  if (input instanceof Date) {
    date = input
  } else if (typeof input === "number") {
    date = new Date(input)
  } else if (typeof input === "string") {
    // If it's a plain number in a string, treat as epoch ms; otherwise assume ISO string.
    const numericOnly = /^\d+$/.test(input.trim())
    date = numericOnly ? new Date(Number.parseInt(input, 10)) : new Date(input)
  } else {
    return ""
  }

  // Use toLocaleString so time options are respected across browsers
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}
