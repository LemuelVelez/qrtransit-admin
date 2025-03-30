"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface PaymentMethodChartProps {
  qrRevenue: number
  cashRevenue: number
}

export function PaymentMethodChart({ qrRevenue, cashRevenue }: PaymentMethodChartProps) {
  const data = [
    { name: "QR Payments", value: qrRevenue },
    { name: "Cash Payments", value: cashRevenue },
  ]

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"]

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
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

