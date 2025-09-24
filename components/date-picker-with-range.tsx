"use client"

import { useState } from "react"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  startOfDay,
  endOfDay,
  startOfToday,
  endOfToday,
} from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

type DatePreset = {
  name: string
  label: string
  value: () => DateRange
}

export function DatePickerWithRange({ className, date, onDateChange }: DatePickerWithRangeProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const datePresets: DatePreset[] = [
    {
      name: "today",
      label: "Today",
      value: () => ({
        from: startOfToday(),
        to: endOfToday(),
      }),
    },
    {
      name: "yesterday",
      label: "Yesterday",
      value: () => {
        const y = subDays(new Date(), 1)
        return {
          from: startOfDay(y),
          to: endOfDay(y),
        }
      },
    },
    {
      name: "last7days",
      label: "Last 7 Days",
      value: () => ({
        from: startOfDay(subDays(new Date(), 6)),
        to: endOfToday(),
      }),
    },
    {
      name: "last30days",
      label: "Last 30 Days",
      value: () => ({
        from: startOfDay(subDays(new Date(), 29)),
        to: endOfToday(),
      }),
    },
    {
      name: "thismonth",
      label: "This Month",
      value: () => ({
        from: startOfMonth(new Date()),
        to: endOfToday(),
      }),
    },
    {
      name: "lastmonth",
      label: "Last Month",
      value: () => {
        const today = new Date()
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        return {
          from: startOfDay(startOfMonth(lastMonth)),
          to: endOfDay(endOfMonth(lastMonth)),
        }
      },
    },
    {
      name: "thisyear",
      label: "This Year",
      value: () => ({
        from: startOfYear(new Date()),
        to: endOfToday(),
      }),
    },
  ]

  const handleSelectPreset = (preset: DatePreset) => {
    const newRange = preset.value()
    onDateChange(newRange)
    setIsPopoverOpen(false)
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range) return onDateChange(undefined)
    const from = range.from ? startOfDay(range.from) : undefined
    const to = range.to ? endOfDay(range.to) : (range.from ? endOfDay(range.from) : undefined)
    onDateChange(from || to ? { from, to } : undefined)
  }

  const handleClearDate = () => {
    onDateChange(undefined)
  }

  return (
    <div className={cn("grid gap-2 w-full sm:w-auto", className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[260px] justify-start text-left font-normal group hover:bg-primary/50",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              <>
                <span>
                  {date.to ? (
                    <>
                      {format(date.from, "MMM d, yyyy")} - {format(date.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(date.from, "MMM d, yyyy")
                  )}
                </span>
                <X
                  className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearDate()
                  }}
                />
              </>
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Tabs defaultValue="presets">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <TabsList className="grid grid-cols-2 text-white bg-primary">
                <TabsTrigger value="presets">Presets</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="presets" className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {datePresets.map((preset) => (
                  <Button
                    key={preset.name}
                    size="sm"
                    variant="outline"
                    className="justify-start font-normal bg-primary/80 text-white hover:primary/30"
                    onClick={() => handleSelectPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="calendar" className="p-0 border-t">
              <div className="">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={isDesktop ? 2 : 1}
                  className="p-3 bg-primary text-white"
                />
              </div>
              <div className="flex items-center justify-between p-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleClearDate()}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => setIsPopoverOpen(false)}>
                  Apply
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}
