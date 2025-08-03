"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import styles from "./MultiProbeChart.module.css";
import {
  IconZoom,
  IconDownload,
  IconReload,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import {
  Select,
  LoadingOverlay,
  Paper,
  Button,
  RangeSlider,
  Group,
  Container,
} from "@mantine/core";

export type SessionInfo = {
  id: string; // RNG id
  sequence: string; // sequence number
  startTimestamp: number;
  fileName: string;
  date: string;
  time: string;
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
  const [starredSessions, setStarredSessions] = useState<string[]>([]);
  const [starLoading, setStarLoading] = useState(false);
  const chartWidth = 900;

  useEffect(() => {
    // Fetch session list on mount
    fetch("/api/probe-data/sessions")
      .then((res) => res.json())
      .then((sessionList: SessionInfo[]) => {
        setSelectedSession(sessionList[0]?.id || "");
        setSessions(sessionList.reverse());
        console.log("Sessions loaded:", sessionList);
      });
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    setLoading(true);
    fetch(`/api/probe-data/${encodeURIComponent(selectedSession)}`)
      .then((res) => res.json())
      .then((newData) => {
        // Fallback if error response
        if (Array.isArray(newData)) {
          setData(newData);
        } else {
          setData([]);
        }
        // Reset zoom only after new data is loaded
        setXZoom(null);
        setTempYZoom(null);
        setMetricsYZoom(null);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  }, [selectedSession]);

  // Fetch starred sessions
  useEffect(() => {
    fetch("/api/probe-data/starred")
      .then((res) => res.json())
      .then((ids: string[]) => setStarredSessions(ids));
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

  // Shared zoom state for both charts (xMin, xMax)
  const [xZoom, setXZoom] = useState<[number, number] | null>(null);
  // Individual y-axis zoom for each chart
  const [tempYZoom, setTempYZoom] = useState<[number, number] | null>(null);
  const [metricsYZoom, setMetricsYZoom] = useState<[number, number] | null>(
    null
  );
  const minX = x.length > 0 ? x[0] : 0;
  const maxX = x.length > 0 ? x[x.length - 1] : 1;
  const [brush, setBrush] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (xZoom) setBrush([xZoom[0], xZoom[1]]);
    else setBrush([minX, maxX]);
  }, [xZoom, minX, maxX]);

  const handleBrushChange = (newBrush: [number, number]) => {
    setBrush(newBrush);
    setXZoom((prevZoom) => {
      if (newBrush[0] === minX && newBrush[1] === maxX) return null;
      return [newBrush[0], newBrush[1]];
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
          range: xZoom
            ? () => [xZoom[0], xZoom[1]] as [number, number]
            : undefined,
        },
        y: {
          auto: !tempYZoom,
          range: tempYZoom
            ? () => [tempYZoom[0], tempYZoom[1]] as [number, number]
            : undefined,
        },
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
            // Only sync horizontal zoom
            if (uu.select.width > 0) {
              const minX = uu.posToVal(uu.select.left, "x");
              const maxX = uu.posToVal(uu.select.left + uu.select.width, "x");
              setXZoom([minX, maxX]);
            } else if (!uu.select.width) {
              setXZoom(null);
            }
            // Only apply vertical zoom to this chart
            if (uu.select.height > 0) {
              const minY = uu.posToVal(uu.select.top + uu.select.height, "y");
              const maxY = uu.posToVal(uu.select.top, "y");
              setTempYZoom([minY, maxY]);
            } else if (!uu.select.height) {
              setTempYZoom(null);
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
              uPlotInstance.over.addEventListener("dblclick", () => {
                setXZoom(null);
                setTempYZoom(null);
                setMetricsYZoom(null);
              });
            }
          },
        ],
      },
      select: { show: true, over: true, left: 0, top: 0, width: 0, height: 0 },
    }),
    [xZoom, tempYZoom, chartWidth]
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
          range: xZoom
            ? () => [xZoom[0], xZoom[1]] as [number, number]
            : undefined,
        },
        y: {
          auto: !metricsYZoom,
          range: metricsYZoom
            ? () => [metricsYZoom[0], metricsYZoom[1]] as [number, number]
            : undefined,
        },
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
            // Only sync horizontal zoom
            if (uu.select.width > 0) {
              const minX = uu.posToVal(uu.select.left, "x");
              const maxX = uu.posToVal(uu.select.left + uu.select.width, "x");
              setXZoom([minX, maxX]);
            } else if (!uu.select.width) {
              setXZoom(null);
            }
            // Only apply vertical zoom to this chart
            if (uu.select.height > 0) {
              const minY = uu.posToVal(uu.select.top + uu.select.height, "y");
              const maxY = uu.posToVal(uu.select.top, "y");
              setMetricsYZoom([minY, maxY]);
            } else if (!uu.select.height) {
              setMetricsYZoom(null);
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
              uPlotInstance.over.addEventListener("dblclick", () => {
                setXZoom(null);
                setMetricsYZoom(null);
              });
            }
          },
        ],
      },
      select: { show: true, over: true, left: 0, top: 0, width: 0, height: 0 },
    }),
    [xZoom, metricsYZoom, chartWidth]
  );

  // Refs to uPlot instances for cursor sync
  const tempPlotRef = useRef<any>(null);
  const metricsPlotRef = useRef<any>(null);
  const isSyncingCursor = useRef(false);

  // Helper to toggle star
  const toggleStar = async () => {
    setStarLoading(true);
    await fetch("/api/probe-data/starred", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: selectedSession,
        starred: !starredSessions.includes(selectedSession),
      }),
    });
    // Refetch
    fetch("/api/probe-data/starred")
      .then((res) => res.json())
      .then((ids: string[]) => setStarredSessions(ids))
      .finally(() => setStarLoading(false));
  };

  // Helper to reload graph
  const reloadGraph = () => {
    setLoading(true);
    fetch(`/api/probe-data/${encodeURIComponent(selectedSession)}`)
      .then((res) => res.json())
      .then((newData) => {
        if (Array.isArray(newData)) {
          setData(newData);
        } else {
          setData([]);
        }
        setXZoom(null);
        setTempYZoom(null);
        setMetricsYZoom(null);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  };

  return (
    <div className={styles.chartContainer}>
      <Container size="md" px={0} style={{ marginBottom: 16 }}>
        <Group justify="center" align="center">
          <Select
            label="Session"
            placeholder="Select session"
            data={sessions
              .sort((a, b) => parseInt(b.sequence) - parseInt(a.sequence))
              .map((session) => ({
                value: session.id,
                label: starredSessions.includes(session.id)
                  ? `${session.fileName} ★`
                  : session.fileName,
                leftSection: starredSessions.includes(session.id) ? (
                  <IconStarFilled size={16} color="#FFD700" />
                ) : undefined,
              }))}
            value={selectedSession}
            onChange={(value) => setSelectedSession(value || "")}
            onDropdownOpen={() => {
              fetch("/api/probe-data/sessions")
                .then((res) => res.json())
                .then((sessionList: SessionInfo[]) => {
                  setSessions(sessionList);
                });
            }}
            disabled={sessions.length === 0}
            size="sm"
            styles={{
              label: { fontWeight: 600, fontSize: 14 },
              input: { fontSize: 14, borderRadius: 4 },
            }}
            style={{ minWidth: 320 }}
          />
          <Group justify="center">
            <Button
              variant="light"
              leftSection={<IconDownload />}
              disabled={!selectedSession}
              size="sm"
              style={{ fontWeight: 600, fontSize: 14 }}
              onClick={() => {
                if (!selectedSession) return;
                const url = `/api/probe-data/download/${encodeURIComponent(
                  selectedSession
                )}`;
                const link = document.createElement("a");
                link.href = url;
                link.download = "session.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Download CSV
            </Button>
            <Button
              variant="light"
              leftSection={<IconReload />}
              disabled={!selectedSession || loading}
              size="sm"
              style={{ fontWeight: 600, fontSize: 14 }}
              onClick={reloadGraph}
            >
              Reload Graph
            </Button>
            <Button
              variant={
                starredSessions.includes(selectedSession) ? "filled" : "light"
              }
              leftSection={
                starredSessions.includes(selectedSession) ? (
                  <IconStarFilled />
                ) : (
                  <IconStar />
                )
              }
              color={
                starredSessions.includes(selectedSession) ? "yellow" : undefined
              }
              disabled={!selectedSession || starLoading}
              size="sm"
              style={{ fontWeight: 600, fontSize: 14 }}
              onClick={toggleStar}
            >
              {starredSessions.includes(selectedSession) ? "Unstar" : "Star"}
            </Button>
          </Group>
        </Group>
      </Container>
      {sessions.length === 0 ? (
        <Paper shadow="sm" p="xl" className={styles.chartPaper}>
          <div style={{ textAlign: "center", fontSize: 18, color: "#888" }}>
            No sessions available.
            <br />
            Please upload data to begin.
          </div>
        </Paper>
      ) : (
        <>
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
              <b>Tip:</b> Drag along one axis of the graph to zoom that axis or
              drag diagonally to zoom into a rectangle. Double-click to reset
              zoom.
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
                label={(value) => formatTime(null, value)}
                disabled={sessions.length === 0}
              />
            </div>
            <div className={styles.resetZoomRow}>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconZoom />}
                onClick={() => {
                  setXZoom(null);
                  setTempYZoom(null);
                  setMetricsYZoom(null);
                }}
                aria-label="Reset Zoom"
                style={{ fontWeight: 600, fontSize: 12 }}
                disabled={sessions.length === 0}
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
        </>
      )}
    </div>
  );
}
