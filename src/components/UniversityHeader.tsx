"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  enrollmentNumber?: string;
  showStatus?: boolean;
  statusBadge?: React.ReactNode;
  showLogout?: boolean;
}

export function UniversityHeader({
  enrollmentNumber,
  showStatus = false,
  statusBadge,
  showLogout = true,
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error", e);
    }
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-12 w-48 sm:w-60 overflow-hidden">
            <Image
              src="/adtu-logo.jpg"
              alt="Assam Down Town University"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="hidden md:block pl-3 border-l border-slate-200">
            <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
              Faculty of Engineering & Technology
            </h1>
            <p className="text-xs text-blue-700 font-medium">
              SWAYAM NPTEL Assessment Portal • Self Test
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {enrollmentNumber && (
            <div className="text-right hidden sm:block">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Logged in as
              </span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                {enrollmentNumber}
              </span>
            </div>
          )}

          {showStatus && statusBadge}

          {showLogout && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 flex items-center gap-1.5 text-xs h-9 px-3 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
