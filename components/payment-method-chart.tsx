"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface PaymentMethodChartProps {
  qrRevenue: number
  cashRevenue: number
}

export function PaymentMethodChart({ qrRevenue, cashRevenue }: PaymentMethodChartProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const data = [
    { name: "QR Payments", value: qrRevenue },
    { name: "Cash Payments", value: cashRevenue },
  ]

  // Colors that work well in both light and dark mode
  const LIGHT_COLORS = ["#059669", "#6ee7b7"]
  const DARK_COLORS = ["#10b981", "#34d399"]

  const COLORS = mounted && resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS

  if (!mounted) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => {
            // Shorten the label text for better responsiveness
            const displayName = name === "Cash Payments" ? "Cash" : "QR"
            return `${displayName} ${(percent * 100).toFixed(0)}%`
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`₱${value.toLocaleString()}`, ""]}
          contentStyle={{
            borderRadius: "6px",
            padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
          labelStyle={{
            color: "hsl(var(--foreground))",
          }}
        />
        <Legend
          formatter={(value) => <span >{value}</span>}
          wrapperStyle={{ fontSize: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

