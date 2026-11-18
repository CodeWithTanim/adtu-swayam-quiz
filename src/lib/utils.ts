import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pseudo-random number generator based on enrollment seed
export function seedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return function () {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.abs(hash / 233280);
  };
}

// Deterministic shuffle with seed
export function shuffleArrayWithSeed<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  const rand = seedRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function validateEnrollment(enrollment: string): boolean {
  if (!enrollment) return false;
  const trimmed = enrollment.trim().toUpperCase();

  // Test account
  if (trimmed === "TEST") return true;

  // Real enrollment formats:
  // ADTU/0/2023-27/BTCS/XXX
  // ADTU/1/2023-27/BTCS/XXX
  // ADTU/L/0/2023-27/BTCS/XXX
  // XXX can be any number from 000 to 300
  const regex = /^ADTU\/(?:[01]|L\/0)\/2023-27\/BTCS\/(\d{1,3})$/;
  const match = trimmed.match(regex);
  if (!match) return false;

  const num = parseInt(match[1], 10);
  return num >= 0 && num <= 300;
}

export function normalizeEnrollment(enrollment: string): string {
  return enrollment.trim().toUpperCase();
}
