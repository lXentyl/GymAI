"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface CalorieDonutProps {
  eaten: number;
  goal: number;
  className?: string;
}

export default function CalorieDonut({ eaten, goal, className }: CalorieDonutProps) {
  const remaining = Math.max(goal - eaten, 0);
  const percentage = goal > 0 ? Math.min(Math.round((eaten / goal) * 100), 100) : 0;

  const data = [
    { name: "Eaten", value: eaten },
    { name: "Remaining", value: remaining },
  ];

  const COLORS = ["hsl(var(--foreground))", "hsl(var(--muted))"];

  return (
    <div className={`relative ${className || ""}`}>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={58}
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            animationBegin={200}
            animationDuration={1000}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums">{percentage}%</span>
      </div>
    </div>
  );
}
