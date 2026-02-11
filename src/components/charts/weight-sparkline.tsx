"use client";

import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

interface WeightSparklineProps {
  data: { date: string; weight: number }[];
  className?: string;
}

export default function WeightSparkline({ data, className }: WeightSparklineProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin - 2", "dataMax + 2"]} hide />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            fill="url(#weightGrad)"
            animationDuration={1500}
            animationBegin={400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
