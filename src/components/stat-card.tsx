import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  className = "",
}: StatCardProps) {
  return (
    <Card
      className={`border-border/50 bg-card/50 backdrop-blur-sm ${className}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5">
            <Icon className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
