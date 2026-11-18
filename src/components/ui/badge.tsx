import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}) => {
  const variants = {
    default: "border-transparent bg-blue-900 text-white",
    secondary: "border-transparent bg-slate-100 text-slate-900",
    destructive: "border-transparent bg-red-100 text-red-700 font-semibold",
    outline: "text-slate-900 border-slate-300",
    success: "border-transparent bg-emerald-100 text-emerald-800 font-semibold",
    warning: "border-transparent bg-amber-100 text-amber-800 font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};
