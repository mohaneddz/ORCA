import * as React from "react";

type ChartConfig = Record<string, { label: string; color: string }>;

type ChartContainerProps = React.ComponentProps<"div"> & {
  config: ChartConfig;
};

export function ChartContainer({ className, config, ...props }: ChartContainerProps) {
  const style = Object.entries(config).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[`--color-${key}`] = value.color;
    return acc;
  }, {});

  return <div className={className} style={style as React.CSSProperties} {...props} />;
}

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; dataKey?: string }>;
};

export function ChartTooltipContent({ active, payload }: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const first = payload[0];

  return (
    <div className="rounded-md border border-white/20 bg-slate-950/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
      <p className="m-0 font-medium">{first.name}</p>
      <p className="m-0 mt-1 text-cyan-200">Value: {first.value}</p>
    </div>
  );
}

