"use client";

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/telemetry/track";

/** Sends Core Web Vitals from real visits to the monitoring sink. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    track("web_vital", { name: metric.name, value: Math.round(metric.value), rating: metric.rating ?? null });
  });
  return null;
}
