import Link from "next/link";

import {
  LayoutDashboard,
  List,
  Rocket,
  Route,
  CalendarDays,
  Map,
  Trophy,
  Camera,
} from "lucide-react";

const navItems = [
  {
    href: "/strava",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/strava/activities",
    label: "Activities",
    icon: List,
  },
  {
    href: "/strava/gear",
    label: "Gear",
    icon: Rocket,
  },
  {
    href: "/strava/segments",
    label: "Segments",
    icon: Route,
  },
  {
    href: "/strava/monthly",
    label: "Monthly stats",
    icon: CalendarDays,
  },
  {
    href: "/strava/heatmap",
    label: "Heatmap",
    icon: Map,
  },
  {
    href: "/strava/best-efforts",
    label: "Best efforts",
    icon: Trophy,
  },
  {
    href: "/strava/photos",
    label: "Photos",
    icon: Camera,
  },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-8 hidden w-64 shrink-0 rounded-3xl border bg-card p-3 md:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition hover:bg-accent"
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}