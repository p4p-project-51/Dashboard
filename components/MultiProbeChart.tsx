"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import styles from "./MultiProbeChart.module.css";

export type ProbeData = {
  timestamp: number;
  temperatures: number[]; // 12 probes
  pumpVoltage: number;
  pumpCurrent: number;
  pumpPower: number;
  flowSensorCurrent: number;
};

async function fetchProbeData(): Promise<ProbeData[]> {
  const res = await fetch("/api/probe-data");
  return res.json();
}

export default function MultiProbeChart() {
  const [data, setData] = useState<ProbeData[]>([]);
  const chartWidth = 900;

  useEffect(() => {
    fetchProbeData().then(setData);
  }, []);

  // Prepare chart data
  const x = useMemo(
    () => Float64Array.from(data.map((d) => d.timestamp)),
    [data]
  );
  const tempSeries = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        Float64Array.from(data.map((d) => d.temperatures[i] ?? NaN))
      ),
    [data]
  );
  const pumpVoltage = useMemo(
    () => Float64Array.from(data.map((d) => d.pumpVoltage)),
    [data]
  );
  const pumpCurrent = useMemo(
    () => Float64Array.from(data.map((d) => d.pumpCurrent)),
    [data]
  );
  const pumpPower = useMemo(
    () => Float64Array.from(data.map((d) => d.pumpPower)),
    [data]
  );
  const flowSensorCurrent = useMemo(
    () => Float64Array.from(data.map((d) => d.flowSensorCurrent)),
    [data]
  );

  const series = [
    {
      label: "Time (s)",
      value: (self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(1)}s`,
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `Temp ${i + 1} (°C)`,
      stroke: `hsl(${(i * 30) % 360}, 70%, 50%)`,
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}°C`,
    })),
    {
      label: "Pump Voltage (V)",
      stroke: "#0074D9",
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}V`,
    },
    {
      label: "Pump Current (A)",
      stroke: "#2ECC40",
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}A`,
    },
    {
      label: "Pump Power (W)",
      stroke: "#FF4136",
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}W`,
    },
    {
      label: "Flow Sensor Current (A)",
      stroke: "#B10DC9",
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}A`,
    },
  ];

  const chartData = useMemo(
    () => [
      x,
      ...tempSeries,
      pumpVoltage,
      pumpCurrent,
      pumpPower,
      flowSensorCurrent,
    ],
    [x, tempSeries, pumpVoltage, pumpCurrent, pumpPower, flowSensorCurrent]
  );

  const opts = useMemo(
    () => ({
      width: chartWidth,
      height: 500,
      title: "Multi-Probe & Pump Metrics",
      scales: { x: { time: false }, y: { auto: true } },
      series,
      axes: [
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => `${t.toFixed(1)}s`),
          size: 60,
          label: "Time (s)",
        },
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => t.toFixed(2)),
          size: 60,
        },
      ],
      legend: { show: true },
      cursor: { drag: { x: true, y: true, uni: 50 }, focus: { prox: 16 } },
      select: { show: true, over: true, left: 0, top: 0, width: 0, height: 0 },
    }),
    [chartWidth, series]
  );

  return (
    <UplotReact
      options={opts}
      data={chartData}
      className={styles.chartContainer}
    />
  );
}
