import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = ({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 p-6 pb-2 text-left", className)}
    {...props}
  />
);

export const DialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("text-xl font-bold leading-none tracking-tight text-slate-900", className)}
    {...props}
  />
);

export const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("text-sm text-slate-500 leading-relaxed", className)}
    {...props}
  />
);

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-end space-x-3 p-6 pt-4 bg-slate-50/50", className)}
    {...props}
  />
);
