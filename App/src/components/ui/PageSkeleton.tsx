import Skeleton from "@/components/ui/Skeleton";

export default function PageSkeleton() {
  return (
    <div className="page-section">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-[70%]" />
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-[300px]" />
    </div>
  );
}