"use client";

import React, { useMemo } from 'react';
import { MilkEntry } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface MilkChartProps {
  entries: MilkEntry[];
}

export default function MilkChart({ entries }: MilkChartProps) {
  const chartData = useMemo(() => {
    const monthlyMap: Record<string, number> = {};
    
    entries.forEach((e) => {
      const month = e.date.substring(0, 7); // YYYY-MM
      monthlyMap[month] = (monthlyMap[month] || 0) + e.milkQuantity;
    });

    return Object.keys(monthlyMap)
      .sort()
      .map((month) => ({
        month,
        quantity: monthlyMap[month],
      }));
  }, [entries]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Insufficient data for chart.
      </div>
    );
  }

  return (
    <ChartContainer config={{
      quantity: {
        label: "Liters",
        color: "hsl(var(--primary))",
      }
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar 
            dataKey="quantity" 
            fill="var(--color-quantity)" 
            radius={[4, 4, 0, 0]}
          >
             {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fillOpacity={0.8} />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}