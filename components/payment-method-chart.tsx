"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface PaymentMethodChartProps {
  qrRevenue: number
  cashRevenue: number
}

export function PaymentMethodChart({ qrRevenue, cashRevenue }: PaymentMethodChartProps) {
  const data = [
    { name: "QR Payments", value: qrRevenue },
    { name: "Cash Payments", value: cashRevenue },
  ]

  // Custom colors that are visually distinct
  const COLORS = ["#0ea5e9", "#f97316"]

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
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
            borderRadius: "6px",
            padding: "8px 12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend
          formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
          wrapperStyle={{ fontSize: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

