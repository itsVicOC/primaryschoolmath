import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  indicatorClassName?: string;
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, value = 0, ...props }, ref) => {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
      <div
        ref={ref}
        className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 rounded-full bg-primary transition-transform",
            indicatorClassName,
          )}
          style={{ transform: `translateX(-${100 - safeValue}%)` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
