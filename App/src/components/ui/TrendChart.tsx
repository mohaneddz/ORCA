import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type TrendChartProps = {
  data: Array<{ name: string; value: number }>;
};

const chartConfig = {
  value: {
    label: "Value",
    color: "#22d3ee",
  },
};

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="card p-4">
      <p className="m-0 mb-4 text-sm font-semibold text-white">Weekly Trend</p>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.2)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca8be", fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#9ca8be", fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} fill="url(#trendGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}