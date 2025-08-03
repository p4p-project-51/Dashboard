"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import styles from "./MultiProbeChart.module.css";
import { IconZoom } from "@tabler/icons-react";
import {
  Select,
  LoadingOverlay,
  Paper,
  Button,
  RangeSlider,
} from "@mantine/core";

export type SessionInfo = {
  id: string;
  startTimestamp: number;
};
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
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const chartWidth = 900;

  useEffect(() => {
    // Fetch session list on mount
    fetch("/api/probe-data/sessions")
      .then((res) => res.json())
      .then((sessionList: SessionInfo[]) => {
        setSessions(sessionList);
        setSelectedSession(sessionList[0]?.id || "");
      });
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    setLoading(true);
    fetch(`/api/probe-data/${encodeURIComponent(selectedSession)}`)
      .then((res) => res.json())
      .then((newData) => {
        setData(newData);
        setZoom(null); // Reset zoom only after new data is loaded
        setLoading(false);
      });
  }, [selectedSession]);

  // Prepare chart data
  const x = useMemo(() => data.map((d) => d.timestamp), [data]);
  const tempSeries = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        data.map((d) => d.temperatures[i] ?? NaN)
      ),
    [data]
  );
  const pumpVoltage = useMemo(() => data.map((d) => d.pumpVoltage), [data]);
  const pumpCurrent = useMemo(() => data.map((d) => d.pumpCurrent), [data]);
  const pumpPower = useMemo(() => data.map((d) => d.pumpPower), [data]);
  const flowSensorCurrent = useMemo(
    () => data.map((d) => d.flowSensorCurrent),
    [data]
  );

  // Convert chart data to Float64Array for uPlot
  const tempChartData = useMemo(
    () => [
      Float64Array.from(x),
      ...tempSeries.map((arr) => Float64Array.from(arr)),
    ],
    [x, tempSeries]
  );
  const metricsChartData = useMemo(
    () => [
      Float64Array.from(x),
      Float64Array.from(pumpVoltage),
      Float64Array.from(pumpCurrent),
      Float64Array.from(pumpPower),
      Float64Array.from(flowSensorCurrent),
    ],
    [x, pumpVoltage, pumpCurrent, pumpPower, flowSensorCurrent]
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
    // Convert ms to seconds for display
    return `${(rawValue / 1000).toFixed(1)}s`;
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
        <Select
          label="Session"
          placeholder="Select session"
          data={sessions
            .slice()
            .sort((a, b) => b.startTimestamp - a.startTimestamp)
            .map((session) => ({
              value: session.id,
              label: `${session.id} (${new Date(
                session.startTimestamp
              ).toLocaleString()})`,
            }))}
          value={selectedSession}
          onChange={(value) => setSelectedSession(value || "")}
          size="sm"
          radius="md"
          styles={{
            label: { fontWeight: 600, fontSize: 14 },
            input: { fontSize: 14, borderRadius: 4 },
          }}
        />
      </div>
      <Paper shadow="sm" p="xl" className={styles.chartPaper}>
        <LoadingOverlay
          visible={loading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        <UplotReact
          options={tempOpts}
          data={tempChartData}
          onCreate={(chart) => {
            tempPlotRef.current = chart;
          }}
        />
      </Paper>
      <Paper
        mb={24}
        w="100%"
        radius={8}
        shadow="xs"
        p={8}
        className={styles.metricsPaper}
      >
        <div className={styles.tip}>
          <b>Tip:</b> Drag along one axis of the graph to zoom that axis or drag
          diagonally to zoom into a rectangle. Double-click to reset zoom.
        </div>
        <div className={styles.rangeSliderContainer}>
          <RangeSlider
            min={minX}
            max={maxX}
            step={(maxX - minX) / 500 || 0.01}
            value={brush ?? [minX, maxX]}
            onChange={(vals: [number, number]) => {
              handleBrushChange([Number(vals[0]), Number(vals[1])]);
            }}
            marks={[
              { value: minX, label: formatTime(null, minX) },
              { value: maxX, label: formatTime(null, maxX) },
            ]}
            size="lg"
            radius="md"
            label={(value) => formatTime(null, value)}
          />
        </div>
        <div className={styles.resetZoomRow}>
          <Button
            variant="default"
            radius="md"
            size="sm"
            leftSection={<IconZoom />}
            onClick={() => setZoom(null)}
            aria-label="Reset Zoom"
            style={{ fontWeight: 600, fontSize: 12 }}
          >
            Reset Zoom
          </Button>
        </div>
      </Paper>
      <Paper shadow="sm" p="xl" className={styles.chartPaper}>
        <LoadingOverlay
          visible={loading}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        <UplotReact
          options={metricsOpts}
          data={metricsChartData}
          onCreate={(chart) => {
            metricsPlotRef.current = chart;
          }}
        />
      </Paper>
    </div>
  );
}
