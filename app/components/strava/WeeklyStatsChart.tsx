"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";

const chartConfig = {
  distance_km: {
    label: "Distance",
  },
  runs: {
    label: "Runs",
  },
};

export default function WeeklyStatsChart({ weekly }: { weekly: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Stats</CardTitle>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-[340px] w-full">
          <LineChart data={weekly}>
            <CartesianGrid vertical={false} />

            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />

            <YAxis
              yAxisId="distance"
              tickLine={false}
              axisLine={false}
              width={40}
            />

            <YAxis
              yAxisId="runs"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />

            <ChartTooltip content={<ChartTooltipContent />} />

            <Line
              yAxisId="distance"
              dataKey="distance_km"
              name="Distance"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={3}
              dot
            />


          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}