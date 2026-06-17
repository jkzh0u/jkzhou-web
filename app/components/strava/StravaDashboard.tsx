"use client";

import { useEffect, useState } from "react";
import RecentActivities from "./RecentActivities";
import WeeklyStatsChart from "./WeeklyStatsChart";
import ActivityDialog from "./ActivityDialog";
import StravaSummary from "./StravaSummary";

export default function StravaDashboard() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch("/api/strava")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p>Loading Strava...</p>;

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <RecentActivities activities={data.recent} onSelect={setSelected} />
        <StravaSummary activities={data.recent} />
      </div>

      <WeeklyStatsChart weekly={data.weekly} />

      <ActivityDialog selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}