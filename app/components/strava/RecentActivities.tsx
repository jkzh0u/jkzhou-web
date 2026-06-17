import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export default function RecentActivities({
  activities,
  onSelect,
}: {
  activities: any[];
  onSelect: (activity: any) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Dist.</TableHead>
              <TableHead>Elev.</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Speed</TableHead>
              <TableHead>HR</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {activities.map((a) => (
              <TableRow
                key={a.id}
                onClick={() => onSelect(a)}
                className="cursor-pointer"
              >
                <TableCell>
                  {new Date(a.start_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{a.distance_km} km</TableCell>
                <TableCell>{a.elevation_m} m</TableCell>
                <TableCell>{a.moving_time_min} min</TableCell>
                <TableCell>{a.pace ?? a.speed_kmh} km/h</TableCell>
                <TableCell>{a.avg_hr ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}