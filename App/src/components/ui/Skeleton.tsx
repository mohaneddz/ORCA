type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={["animate-pulse rounded-xl", className].join(" ")}
      style={{ background: "rgba(168,85,247,0.07)" }}
    />
  );
}

