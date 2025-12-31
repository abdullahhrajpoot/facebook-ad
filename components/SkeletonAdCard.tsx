export default function SkeletonAdCard() {
    return (
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 shadow-sm animate-pulse h-full flex flex-col">
            {/* Header Skeleton */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800"></div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-zinc-800 rounded"></div>
                        <div className="h-3 w-16 bg-zinc-800/50 rounded"></div>
                    </div>
                </div>
                <div className="w-6 h-6 rounded bg-zinc-800"></div>
            </div>

            {/* Image Skeleton - Aspect Ratio 16:9 approx */}
            <div className="w-full h-48 bg-zinc-800/30"></div>

            {/* Content Skeleton */}
            <div className="p-4 space-y-4 flex-1">
                {/* Title & Badge */}
                <div className="flex justify-between items-start gap-4">
                    <div className="h-5 w-3/4 bg-zinc-800 rounded"></div>
                    <div className="h-5 w-16 bg-zinc-800 rounded-full"></div>
                </div>

                {/* Description lines */}
                <div className="space-y-2">
                    <div className="h-3 w-full bg-zinc-800/50 rounded"></div>
                    <div className="h-3 w-5/6 bg-zinc-800/50 rounded"></div>
                    <div className="h-3 w-4/6 bg-zinc-800/50 rounded"></div>
                </div>

                {/* Metrics Grid Skeleton */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="h-12 bg-zinc-800/30 rounded-lg"></div>
                    <div className="h-12 bg-zinc-800/30 rounded-lg"></div>
                    <div className="h-12 bg-zinc-800/30 rounded-lg"></div>
                </div>
            </div>

            {/* Footer Button Skeleton */}
            <div className="p-4 border-t border-zinc-800/50 mt-auto">
                <div className="h-10 w-full bg-zinc-800 rounded-lg"></div>
            </div>
        </div>
    )
}
