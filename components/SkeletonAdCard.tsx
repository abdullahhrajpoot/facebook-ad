export default function SkeletonAdCard() {
    return (
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-sm h-full flex flex-col relative">
            {/* Shimmer Effect Overlay */}
            <div className="absolute inset-0 z-10 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"></div>

            {/* Image Area Skeleton */}
            <div className="aspect-video bg-zinc-800/50 relative border-b border-zinc-800/50">
                <div className="absolute top-3 right-3 w-16 h-5 rounded-full bg-zinc-800"></div>
                <div className="absolute top-3 left-3 w-20 h-5 rounded bg-zinc-800"></div>
            </div>

            {/* Content Skeleton */}
            <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Title */}
                <div className="space-y-2">
                    <div className="h-5 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-3 bg-zinc-800/50 rounded w-1/3"></div>
                </div>

                {/* Description */}
                <div className="space-y-2 flex-1">
                    <div className="h-3 bg-zinc-800/30 rounded w-full"></div>
                    <div className="h-3 bg-zinc-800/30 rounded w-full"></div>
                    <div className="h-3 bg-zinc-800/30 rounded w-2/3"></div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-4 mt-auto border-t border-zinc-800/50 flex justify-between gap-4">
                    <div className="h-4 bg-zinc-800/50 rounded w-1/4"></div>
                    <div className="h-4 bg-zinc-800/50 rounded w-1/4"></div>
                    <div className="h-4 bg-zinc-800/50 rounded w-1/4"></div>
                </div>
            </div>
        </div>
    )
}
