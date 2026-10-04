"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { cls } from "@/lib/format";

export function Spin({ className }: { className?: string }) {
  return <Loader2 className={cls("animate-spin", className ?? "size-4")} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cls(
        "group flex w-full items-center justify-between gap-3 text-left",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span>
        <span className="block text-sm font-medium text-snow/90">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-mist">{hint}</span>}
      </span>
      <span
        className={cls(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300",
          checked
            ? "border-lime/60 bg-lime/25"
            : "border-white/15 bg-white/5 group-hover:border-white/30",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={cls(
            "absolute top-1/2 size-4 -translate-y-1/2 rounded-full",
            checked ? "right-1 bg-lime shadow-[0_0_10px_rgba(184,244,77,0.7)]" : "left-1 bg-white/50",
          )}
        />
      </span>
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cls(
        "shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-all duration-200",
        active
          ? "border-lime/60 bg-lime/15 text-lime"
          : "border-white/10 bg-white/[0.03] text-mist hover:border-white/30 hover:text-snow",
        disabled && "cursor-not-allowed opacity-40 hover:border-white/10 hover:text-mist",
      )}
    >
      {children}
    </button>
  );
}

export function SectionHead({
  icon: Icon,
  title,
  right,
  tone = "lime",
}: {
  icon: LucideIcon;
  title: string;
  right?: React.ReactNode;
  tone?: "lime" | "gold" | "frost" | "danger" | "violet";
}) {
  const tones: Record<string, string> = {
    lime: "text-lime border-lime/25 bg-lime/10",
    gold: "text-gold border-gold/25 bg-gold/10",
    frost: "text-frost border-frost/25 bg-frost/10",
    danger: "text-danger border-danger/25 bg-danger/10",
    violet: "text-violet border-violet/25 bg-violet/10",
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className={cls("grid size-8 place-items-center rounded-lg border", tones[tone])}>
          <Icon className="size-4" />
        </span>
        <h2 className="text-[12px] font-semibold tracking-[0.22em] text-snow/90 uppercase">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-[0.14em] text-mist uppercase">
          {label}
        </span>
        {hint && <span className="text-[10px] text-mist/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      className="input"
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
    />
  );
}
