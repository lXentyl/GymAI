import { cn } from "@/lib/utils";

interface SkeletonCardProps {
    className?: string;
    lines?: number;
}

export default function SkeletonCard({
    className,
    lines = 3,
}: SkeletonCardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border/50 bg-card/50 p-5 space-y-4 animate-pulse",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-foreground/10" />
                <div className="space-y-2 flex-1">
                    <div className="h-3 w-24 rounded-full bg-foreground/10" />
                    <div className="h-2 w-16 rounded-full bg-foreground/5" />
                </div>
            </div>
            {/* Lines */}
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-2.5 rounded-full bg-foreground/5"
                    style={{ width: `${80 - i * 15}%` }}
                />
            ))}
        </div>
    );
}

export function SkeletonPage() {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="h-6 w-32 rounded-lg bg-foreground/10 animate-pulse" />
                <div className="h-3 w-48 rounded-full bg-foreground/5 animate-pulse" />
            </div>
            <SkeletonCard />
            <SkeletonCard lines={2} />
            <div className="grid grid-cols-2 gap-3">
                <SkeletonCard lines={1} />
                <SkeletonCard lines={1} />
            </div>
        </div>
    );
}
