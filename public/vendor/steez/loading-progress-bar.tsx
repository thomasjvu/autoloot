/**
 * Standalone Steez UI copy of Loading Progress Bar.
 *
 * Generated from packages/ui/src/components/LoadingProgressBar.tsx by pnpm registry:generate.
 * This file is intentionally self-contained: its CSS, local helpers, and icon
 * implementations are embedded so it can be pasted into a React project.
 * Do not edit this generated copy; edit the canonical package source instead.
 */

"use client";

import * as React from "react";

const __styles_steez_loading_progress_bar_0: Record<string, string> = {
  "root": "steez-loading-progress-bar-0-root",
  "barGroup": "steez-loading-progress-bar-0-barGroup",
  "bar": "steez-loading-progress-bar-0-bar",
  "barFilled": "steez-loading-progress-bar-0-barFilled",
  "value": "steez-loading-progress-bar-0-value",
};

const __steezStandaloneStyles = String.raw`/* packages/ui/src/components/LoadingProgressBar.module.css */
.steez-loading-progress-bar-0-root {
  display: flex;
  align-items: center;
  gap: 4px;
}

.steez-loading-progress-bar-0-barGroup {
  display: flex;
  width: 100%;
  max-width: 650px;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
}

.steez-loading-progress-bar-0-bar {
  width: clamp(10px, 2.5vw, 28px);
  height: clamp(10px, 2.5vw, 28px);
  box-sizing: border-box;
  flex-shrink: 0;
  border: none;
  border-radius: 4px;
  background: rgba(203, 203, 204, 0.15);
  transform: skewX(-15deg);
  transition: all 0.1s ease-out;
  transition-delay: var(--bar-delay, 0ms);
}

.steez-loading-progress-bar-0-barFilled {
  background: currentColor;
}

.steez-loading-progress-bar-0-value {
  width: 4ch;
  margin-left: 16px;
  text-align: right;
  font-family: var(--font-mono, "Maple Mono", "SF Mono", "Cascadia Code", "Fira Code", Monaco, monospace);
  font-size: clamp(18px, 5vw, 32px);
  font-weight: 900;
  letter-spacing: 2px;
}


@media (prefers-reduced-motion: reduce) {
  .steez-loading-progress-bar-0-bar {
    transition: none;
  }
}
`;
const __steezStandaloneStyleKey = "loading-progress-bar";

function __injectSteezStandaloneStyles() {
  if (typeof document === "undefined" || document.querySelector(`style[data-steez-standalone="${__steezStandaloneStyleKey}"]`)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute("data-steez-standalone", __steezStandaloneStyleKey);
  style.textContent = __steezStandaloneStyles;
  document.head.appendChild(style);
}

__injectSteezStandaloneStyles();

export const LOADING_PROGRESS_SEGMENT_COUNT = 20;

const BAR_INDEXES = Array.from({ length: LOADING_PROGRESS_SEGMENT_COUNT }, (_, index) => index);

export interface LoadingProgressBarProps {
  progress: number;
  className?: string;
  valueLabel?: string;
}

export function LoadingProgressBar({
  progress,
  className,
  valueLabel,
}: LoadingProgressBarProps) {
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const clampedProgress = Math.max(0, Math.min(100, safeProgress));
  const filledBars = Math.round((clampedProgress / 100) * LOADING_PROGRESS_SEGMENT_COUNT);
  const displayLabel = valueLabel ?? `${Math.round(clampedProgress)}%`;

  return (
    <div
      className={className ? `${__styles_steez_loading_progress_bar_0.root} ${className}` : __styles_steez_loading_progress_bar_0.root}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedProgress}
      aria-label={displayLabel}
    >
      <div className={__styles_steez_loading_progress_bar_0.barGroup}>
        {BAR_INDEXES.map((index) => {
          const isFilled = index < filledBars;
          return (
            <div
              key={index}
              className={`${__styles_steez_loading_progress_bar_0.bar} ${isFilled ? __styles_steez_loading_progress_bar_0.barFilled : ""}`.trim()}
              style={{ ["--bar-delay" as string]: `${index * 20}ms` }}
            />
          );
        })}
      </div>
      <div className={__styles_steez_loading_progress_bar_0.value}>{displayLabel}</div>
    </div>
  );
}
