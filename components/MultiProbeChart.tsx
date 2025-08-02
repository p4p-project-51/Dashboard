"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import styles from "./MultiProbeChart.module.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { IconZoom } from "@tabler/icons-react";

export type ProbeData = {
  timestamp: number;
  temperatures: number[]; // 12 probes
  pumpVoltage: number;
  pumpCurrent: number;
  pumpPower: number;
  flowSensorCurrent: number;
};

export default function MultiProbeChart() {
  const [data, setData] = useState<ProbeData[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const chartWidth = 900;

  useEffect(() => {
    // Fetch session list on mount
    fetch("/api/probe-data/sessions")
      .then((res) => res.json())
      .then((sessionList) => {
        setSessions(sessionList);
        setSelectedSession(sessionList[0] || "");
      });
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    fetch(`/api/probe-data/${encodeURIComponent(selectedSession)}`)
      .then((res) => res.json())
      .then(setData);
  }, [selectedSession]);

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

  // Shared zoom state for both charts (xMin, xMax, yMin, yMax)
  const [zoom, setZoom] = useState<[number, number, number?, number?] | null>(
    null
  );
  const minX = x.length > 0 ? x[0] : 0;
  const maxX = x.length > 0 ? x[x.length - 1] : 1;
  const [brush, setBrush] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (zoom) setBrush([zoom[0], zoom[1]]);
    else setBrush([minX, maxX]);
  }, [zoom, minX, maxX]);

  const handleBrushChange = (newBrush: [number, number]) => {
    setBrush(newBrush);
    setZoom((prevZoom) => {
      if (newBrush[0] === minX && newBrush[1] === maxX) return null;
      if (prevZoom) return [newBrush[0], newBrush[1], prevZoom[2], prevZoom[3]];
      return [newBrush[0], newBrush[1], NaN, NaN];
    });
  };

  function formatTime(self: unknown, rawValue: number) {
    if (rawValue === null || isNaN(rawValue)) return "??";
    return `${rawValue.toFixed(1)}s`;
  }
  function formatValue(rawValue: number) {
    if (rawValue === null || isNaN(rawValue)) return "";
    if (rawValue >= 1e6) return `${(rawValue / 1e6).toFixed(2)}M`;
    if (rawValue >= 1e3) return `${(rawValue / 1e3).toFixed(2)}k`;
    return rawValue.toFixed(2);
  }

  // Temperature chart config
  const tempSeriesConfig = [
    { label: "Time (s)", value: formatTime },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `Temp ${i + 1} (°C)`,
      stroke: `hsl(${(i * 30) % 360}, 70%, 50%)`,
      value: (_self: unknown, v: number) =>
        v == null || isNaN(v) ? "--" : `${v.toFixed(2)}°C`,
    })),
  ];
  const tempChartData = useMemo(() => [x, ...tempSeries], [x, tempSeries]);
  const tempOpts = useMemo(
    () => ({
      width: chartWidth,
      height: 500,
      title: "Temperature Probes",
      scales: {
        x: {
          time: false,
          range: zoom
            ? () => [zoom[0], zoom[1]] as [number, number]
            : undefined,
        },
        y: { auto: true },
      },
      series: tempSeriesConfig,
      axes: [
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatTime(self, t)),
          size: 60,
          label: "Time (s)",
        },
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatValue(t)),
          size: 60,
        },
      ],
      legend: { show: true },
      cursor: { drag: { x: true, y: true, uni: 50 }, focus: { prox: 16 } },
      hooks: {
        setSelect: [
          function (u: unknown) {
            const uu = u as {
              select: {
                width: number;
                left: number;
                height: number;
                top: number;
              };
              posToVal: (px: number, scale: string) => number;
            };
            if (uu.select.width > 0 && uu.select.height > 0) {
              const minX = uu.posToVal(uu.select.left, "x");
              const maxX = uu.posToVal(uu.select.left + uu.select.width, "x");
              setZoom([minX, maxX, NaN, NaN]);
            } else if (uu.select.width > 0) {
              setZoom((prevZoom) => [
                uu.posToVal(uu.select.left, "x"),
                uu.posToVal(uu.select.left + uu.select.width, "x"),
                prevZoom ? prevZoom[2] : NaN,
                prevZoom ? prevZoom[3] : NaN,
              ]);
            } else {
              setZoom(null);
            }
          },
        ],
        setCursor: [
          function (u: any) {
            if (
              metricsPlotRef.current &&
              u.cursor.left != null &&
              u.cursor.top != null
            ) {
              metricsPlotRef.current.setCursor({
                left: u.cursor.left,
                top: u.cursor.top,
              });
            }
          },
        ],
        init: [
          function (u: unknown) {
            const uPlotInstance = u as { over: HTMLElement };
            if (uPlotInstance && uPlotInstance.over) {
              uPlotInstance.over.addEventListener("dblclick", () =>
                setZoom(null)
              );
            }
          },
        ],
      },
      select: { show: true, over: true, left: 0, top: 0, width: 0, height: 0 },
    }),
    [setZoom, zoom, chartWidth]
  );

  // Metrics chart config
  const metricsSeriesConfig = [
    { label: "Time (s)", value: formatTime },
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
  const metricsChartData = useMemo(
    () => [x, pumpVoltage, pumpCurrent, pumpPower, flowSensorCurrent],
    [x, pumpVoltage, pumpCurrent, pumpPower, flowSensorCurrent]
  );
  const metricsOpts = useMemo(
    () => ({
      width: chartWidth,
      height: 500,
      title: "Pump Metrics",
      scales: {
        x: {
          time: false,
          range: zoom
            ? () => [zoom[0], zoom[1]] as [number, number]
            : undefined,
        },
        y: { auto: true },
      },
      series: metricsSeriesConfig,
      axes: [
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatTime(self, t)),
          size: 60,
          label: "Time (s)",
        },
        {
          stroke: "#888",
          grid: { show: true },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatValue(t)),
          size: 60,
        },
      ],
      legend: { show: true },
      cursor: { drag: { x: true, y: true, uni: 50 }, focus: { prox: 16 } },
      hooks: {
        setSelect: [
          function (u: unknown) {
            const uu = u as {
              select: {
                width: number;
                left: number;
                height: number;
                top: number;
              };
              posToVal: (px: number, scale: string) => number;
            };
            if (uu.select.width > 0 && uu.select.height > 0) {
              const minX = uu.posToVal(uu.select.left, "x");
              const maxX = uu.posToVal(uu.select.left + uu.select.width, "x");
              setZoom([minX, maxX, NaN, NaN]);
            } else if (uu.select.width > 0) {
              setZoom((prevZoom) => [
                uu.posToVal(uu.select.left, "x"),
                uu.posToVal(uu.select.left + uu.select.width, "x"),
                prevZoom ? prevZoom[2] : NaN,
                prevZoom ? prevZoom[3] : NaN,
              ]);
            } else {
              setZoom(null);
            }
          },
        ],
        setCursor: [
          function (u: any) {
            if (isSyncingCursor.current) return;
            if (
              tempPlotRef.current &&
              u.cursor.left != null &&
              u.cursor.top != null
            ) {
              isSyncingCursor.current = true;
              tempPlotRef.current.setCursor({
                left: u.cursor.left,
                top: u.cursor.top,
              });
              isSyncingCursor.current = false;
            }
          },
        ],
        init: [
          function (u: unknown) {
            const uPlotInstance = u as { over: HTMLElement };
            if (uPlotInstance && uPlotInstance.over) {
              uPlotInstance.over.addEventListener("dblclick", () =>
                setZoom(null)
              );
            }
          },
        ],
      },
      select: { show: true, over: true, left: 0, top: 0, width: 0, height: 0 },
    }),
    [setZoom, zoom, chartWidth]
  );

  // Refs to uPlot instances for cursor sync
  const tempPlotRef = useRef<any>(null);
  const metricsPlotRef = useRef<any>(null);
  const isSyncingCursor = useRef(false);

  return (
    <div className={styles.chartContainer}>
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="session-select"
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginRight: 8,
          }}
        >
          Session:
        </label>
        <select
          id="session-select"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          style={{
            fontSize: 14,
            padding: "4px 8px",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        >
          {sessions.map((sessionId) => (
            <option key={sessionId} value={sessionId}>
              {sessionId}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          marginBottom: 24,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflowX: "auto",
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: 8,
        }}
      >
        <UplotReact
          options={tempOpts}
          data={tempChartData}
          onCreate={(chart) => {
            tempPlotRef.current = chart;
          }}
        />
      </div>
      <div
        style={{
          marginBottom: 8,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflowX: "auto",
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: 8,
        }}
      >
        <div
          style={{
            margin: "4px 0 8px",
            maxWidth: "100%",
            textAlign: "center",
            fontSize: "12px",
            color: "#666",
          }}
        >
          <b>Tip:</b> Drag along one axis of the graph to zoom that axis or drag
          diagonally to zoom into a rectangle. Double-click to reset zoom.
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 16,
            gap: 8,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: chartWidth,
              margin: "12px 24px 16px",
            }}
          >
            <Slider
              range
              min={minX}
              max={maxX}
              step={(maxX - minX) / 500 || 0.01}
              value={brush ?? [minX, maxX]}
              allowCross={false}
              onChange={(vals: number[] | number) => {
                const arr = Array.isArray(vals) ? vals : [minX, maxX];
                handleBrushChange([Number(arr[0]), Number(arr[1])]);
              }}
              trackStyle={[{ backgroundColor: "#000", height: 12 }]} // matches previous style
              handleStyle={[
                {
                  borderColor: "#000",
                  backgroundColor: "#fff",
                  height: 22,
                  width: 22,
                  marginTop: -6,
                  opacity: 1,
                },
                {
                  borderColor: "#000",
                  backgroundColor: "#fff",
                  height: 22,
                  width: 22,
                  marginTop: -6,
                  opacity: 1,
                },
              ]}
              dotStyle={{ display: "none" }}
              activeDotStyle={{ display: "none" }}
              marks={{
                [minX]: {
                  label: formatTime(null, minX),
                  style: { color: "#000", marginTop: 5 },
                },
                [maxX]: {
                  label: formatTime(null, maxX),
                  style: { color: "#000", marginTop: 5 },
                },
              }}
              railStyle={{
                backgroundColor: "#e5e7eb",
                height: 12,
                borderRadius: 8,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              style={{
                marginLeft: 8,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                cursor: "pointer",
              }}
              aria-label="Reset Zoom"
              onClick={() => setZoom(null)}
            >
              <IconZoom />
              <span>Reset Zoom</span>
            </button>
          </div>
        </div>
      </div>
      <div
        style={{
          marginBottom: 24,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          overflowX: "auto",
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          padding: 8,
        }}
      >
        <UplotReact
          options={metricsOpts}
          data={metricsChartData}
          onCreate={(chart) => {
            metricsPlotRef.current = chart;
          }}
        />
      </div>
    </div>
  );
}
