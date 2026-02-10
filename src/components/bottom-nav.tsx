"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  CalendarDays,
  User,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/workouts", label: "Workout", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Apple },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-all duration-200 ${
                isActive
                  ? "text-foreground scale-105"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              <item.icon
                className={`h-5 w-5 transition-all duration-200 ${
                  isActive ? "stroke-[2.5]" : "stroke-[1.5]"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "opacity-100" : "opacity-60"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
