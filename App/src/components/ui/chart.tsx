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
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{
        background: "color-mix(in srgb, var(--color-surface-1) 78%, transparent)",
        borderColor: "var(--color-border-subtle)",
        color: "var(--color-neutral-200)",
        backdropFilter: "blur(10px)",
      }}
    >
      <p className="m-0 font-medium">{first.name}</p>
      <p className="m-0 mt-1" style={{ color: "var(--color-primary)" }}>Value: {first.value}</p>
    </div>
  );
}

