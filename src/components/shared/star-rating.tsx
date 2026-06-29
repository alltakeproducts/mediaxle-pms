"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  readonly?: boolean;
  className?: string;
  starClassName?: string;
}

export function StarRating({
  value,
  min = 0,
  max = 5,
  onChange,
  disabled = false,
  readonly = false,
  className,
  starClassName,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  // Generate array of possible scores
  const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const activeDisabled = disabled || readonly;

  return (
    <div 
      className={cn("flex items-center justify-center gap-1", className)}
      onMouseLeave={() => !readonly && setHoverValue(null)}
    >
      {scores.map((score) => {
        const displayValue = !readonly && hoverValue !== null ? hoverValue : value;
        const isSelected = score <= displayValue && score > 0;
        const isZero = score === 0;

        if (isZero && min === 0) {
           return (
             <button
               key={score}
               type="button"
               disabled={activeDisabled}
               onClick={() => !readonly && onChange?.(0)}
               onMouseEnter={() => !readonly && setHoverValue(0)}
               className={cn(
                 "text-[10px] font-medium px-1.5 py-0.5 rounded border transition-colors h-7 flex items-center justify-center min-w-[24px]",
                 displayValue === 0 
                   ? "bg-primary text-primary-foreground border-primary" 
                   : "text-muted-foreground border-input hover:bg-muted",
                 activeDisabled && (readonly ? "cursor-default" : "opacity-50 cursor-not-allowed"),
                 readonly && displayValue !== 0 && "opacity-40"
               )}
             >
               0
             </button>
           );
        }

        return (
          <button
            key={score}
            type="button"
            disabled={activeDisabled}
            onClick={() => !readonly && onChange?.(score)}
            onMouseEnter={() => !readonly && setHoverValue(score)}
            className={cn(
              "group relative focus:outline-none transition-transform active:scale-95",
              !readonly && "hover:scale-110",
              activeDisabled && (readonly ? "cursor-default" : "opacity-50 cursor-not-allowed")
            )}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                isSelected
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground",
                !readonly && !isSelected && "group-hover:text-amber-300",
                starClassName
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
