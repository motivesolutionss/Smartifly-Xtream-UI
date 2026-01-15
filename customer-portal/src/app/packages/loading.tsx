import { PackageCardSkeleton } from "@/components/ui/skeleton";

export default function PackagesLoading() {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="container relative z-10">
        <div className="text-center mb-12">
          <div className="h-8 w-48 bg-background-tertiary rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-96 bg-background-tertiary rounded-lg mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-background-tertiary rounded-lg mx-auto animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[1, 2, 3].map((i) => (
            <PackageCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

