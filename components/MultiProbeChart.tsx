"use client";

import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import { WebSocketContext } from "../app/layout";
import UplotReact from "uplot-react";
import "uplot/dist/uPlot.min.css";
import styles from "./MultiProbeChart.module.css";
import "./MultiProbeChart.css";
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
  useMantineColorScheme,
  Stack,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { calibration, getPinMapping } from "../app/api/probe-data/pinData";

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

export type DynamicProbeData = Record<string, number | null> & {
  timestamp: number;
};

const adcToTempC = (X_ADC: number): number => {
  const R25 = 10000; // Ω
  const B25to100 = 3590; // K
  const SERIES_OHMS = 8200; // Ω

  // t_NTC = 1 / ( (1/298.15) + (1/B) * ln( (8200*X_ADC) / (R25*(3300 - X_ADC)) ) ) - 273.15
  const term = (SERIES_OHMS * X_ADC) / (R25 * (3300 - X_ADC));

  const invT = 1 / 298.15 + (1 / B25to100) * Math.log(term);
  const T_K = 1 / invT;
  const t_C = T_K - 273.15;

  return t_C;
};

export default function MultiProbeChart() {
  const { colorScheme } = useMantineColorScheme();
  const systemColorScheme = useColorScheme();
  const isDarkMode =
    (colorScheme === "auto" && systemColorScheme === "dark") ||
    colorScheme === "dark";

  // Responsive chart width
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        // Use 95% of container width for chart
        setChartWidth(Math.max(400, containerRef.current.offsetWidth * 0.95));
      }
    }
    updateWidth();
    const resizeObserver = new window.ResizeObserver(updateWidth);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const [data, setData] = useState<DynamicProbeData[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [starredSessions, setStarredSessions] = useState<string[]>([]);
  const [starLoading, setStarLoading] = useState(false);
  const [tempHeaders, setTempHeaders] = useState<string[]>([]);
  const [metricHeaders, setMetricHeaders] = useState<string[]>([]);

  const ws = useContext(WebSocketContext);

  useEffect(() => {
    // Fetch session list on mount
    fetch("/api/probe-data/sessions")
      .then((res) => res.json())
      .then((sessionList: SessionInfo[]) => {
        setSessions(sessionList.reverse());
        setSelectedSession(sessionList[0]?.id || "");
        console.log("Sessions loaded:", sessionList);
      });
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    setLoading(true);
    fetch(`/api/probe-data/${encodeURIComponent(selectedSession)}`)
      .then((res) => res.json())
      .then(({ header, rows }) => {
        if (
          Array.isArray(rows) &&
          Array.isArray(header) &&
          rows.length > 0 &&
          header.length > 0
        ) {
          const tempHeaders = header
            .filter((h) => h.startsWith("Temperature"))
            .map((h: string) => getPinMapping(h.trim()));
          const metricHeaders = header
            .filter(
              (h) => !h.startsWith("Temperature") && !h.startsWith("Time")
            )
            .map((h: string) => getPinMapping(h.trim()))
            .filter((h) => !h.startsWith("Unmapped"));

          const parsedData = rows.map((row) => {
            const obj: DynamicProbeData = { timestamp: Number(row[0]) };
            header.forEach((key, index) => {
              const mappedPin = getPinMapping(key.trim());
              if (
                !key.startsWith("Time") &&
                !mappedPin.startsWith("Unmapped")
              ) {
                obj[mappedPin] =
                  calibration(key, parseFloat(row[index])) || null;
              }
            });
            return obj;
          });

          console.log("Parsed Data:", parsedData);

          setData(parsedData);
          setTempHeaders(tempHeaders);
          setMetricHeaders(metricHeaders);

          // Initialize zoom state
          const timestamps = parsedData.map((d) => d.timestamp);
          const minX = timestamps.length > 0 ? Math.min(...timestamps) : 0;
          const maxX = timestamps.length > 0 ? Math.max(...timestamps) : 1;
          setXZoom([minX, maxX]);
          setBrush([minX, maxX]);
        } else {
          setData([]);
          setTempHeaders([]);
          setMetricHeaders([]);
          setXZoom(null);
          setBrush(null);
        }
        setTempYZoom(null);
        setMetricsYZoom(null);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setTempHeaders([]);
        setMetricHeaders([]);
        setXZoom(null);
        setBrush(null);
        setTempYZoom(null);
        setMetricsYZoom(null);
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

  const tempSeries = useMemo(() => {
    return tempHeaders.map((header) =>
      data.map((d) => (d[header] as number) ?? NaN)
    );
  }, [data, tempHeaders]);

  const metricSeries = useMemo(() => {
    return metricHeaders.map((header) =>
      data.map((d) => (d[header] as number) ?? NaN)
    );
  }, [data, metricHeaders]);

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
      ...metricSeries.map((arr) => Float64Array.from(arr)),
    ],
    [x, metricSeries]
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

  function formatTime(self: unknown, rawValue: number, long: boolean = false) {
    if (rawValue === null || isNaN(rawValue)) return "--.-s";
    // Convert ms to seconds
    const seconds = rawValue / 1000;

    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (long) return `${mins}m ${secs.toFixed(1)}s`;
      else return `${mins}m`;
    }

    return `${seconds.toFixed(1)}s`;
  }

  function formatValue(rawValue: number) {
    if (rawValue === null || isNaN(rawValue)) return "";
    if (rawValue >= 1e6) return `${(rawValue / 1e6).toFixed(2)}M`;
    if (rawValue >= 1e3) return `${(rawValue / 1e3).toFixed(2)}k`;
    return rawValue.toFixed(2);
  }

  const gridColor = isDarkMode ? "#222" : "#ccc";
  const labelColor = isDarkMode ? "#fff" : "#222";
  
  const colorList = [
    "#a6cee3",
    "#1f78b4",
    "#6fee00",
    "#33a02c",
    "#e31a1c",
    "#6a3d9a",
    "#c036db",
    "#ffa600",
    "#54D8B1",
    "#5785C1",
  ];
  const lineColor = useMemo(
    () => (text: string) => {
      const hash = hashString(text);
      return colorList[hash % colorList.length];
    },
    []
  );

  // Temperature chart config
  const tempSeriesConfig = useMemo(() => {
    return [
      {
        label: "Time (s)",
        value: (self: unknown, rawValue: number) => formatTime(self, rawValue, true),
      },
      ...tempHeaders.map((header) => {
        return {
          label: header,
          stroke: lineColor(header),
          value: (_self: unknown, v: number) =>
            v == null || isNaN(v) ? "--.--°C" : `${v.toFixed(2)}°C`,
        };
      }),
    ];
  }, [tempHeaders, lineColor]);

  // Metrics chart config
  const metricsSeriesConfig = useMemo(() => {
    return [
      {
        label: "Time (s)",
        value: (self: unknown, rawValue: number) => formatTime(self, rawValue, true),
      },
      ...metricHeaders.map((header) => {
        return {
          label: header,
          stroke: lineColor(header),
          width: 1.25,
          value: (_self: unknown, v: number) =>
            v == null || isNaN(v) ? "--.--°C" : `${v.toFixed(2)}`,
        };
      }),
    ];
  }, [metricHeaders, lineColor]);
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
          grid: { show: true, stroke: gridColor },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatTime(self, t)),
          size: 60,
          label: "Time (s)",
          font: "14px sans-serif",
          stroke: labelColor,
        },
        {
          grid: { show: true, stroke: gridColor },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatValue(t)),
          size: 60,
          font: "14px sans-serif",
          stroke: labelColor,
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
    [xZoom, tempYZoom, chartWidth, gridColor, labelColor, tempSeriesConfig]
  );

  const metricsOpts = useMemo(
    () => ({
      width: chartWidth,
      height: 500,
      title: "Temperature Measurements",
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
          grid: { show: true, stroke: gridColor },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatTime(self, t)),
          size: 60,
          label: "Time",
          font: "14px sans-serif",
          stroke: labelColor,
          // incr = 0.04 in my case
          splits: (
            plot: uPlot,
            __: unknown,
            scaleMin: number,
            scaleMax: number
          ) => {
            // Candidate intervals in ms
            const intervals = [
              10 * 1000, // 10 seconds
              30 * 1000, // 30 seconds
              60 * 1000, // 1 minute
              2 * 60 * 1000, // 2 minutes
              5 * 60 * 1000, // 5 minutes
              10 * 60 * 1000, // 10 minutes
              30 * 60 * 1000, // 30 minutes
              60 * 60 * 1000, // 60 minutes
            ];
            const maxTickCount = 45;
            const maxTicks = Math.floor(plot.width / maxTickCount);
            const range = scaleMax - scaleMin;

            // Find largest interval that fits
            let chosenInterval = intervals[intervals.length - 1];
            for (let i = 0; i < intervals.length; i++) {
              const ticks = Math.ceil(range / intervals[i]);
              if (ticks <= maxTicks) {
                chosenInterval = intervals[i];
                break;
              }
            }
            const startingPoint = Math.ceil(scaleMin / chosenInterval) * chosenInterval;
            const splits = [];
            for (let v = startingPoint; v <= scaleMax; v += chosenInterval) {
              splits.push(v);
            }
            return splits;
          },
        },
        {
          label: "Temperature (°C)",
          grid: { show: true, stroke: gridColor },
          values: (self: unknown, ticks: number[]) =>
            ticks.map((t) => formatValue(t)),
          size: 60,
          font: "14px sans-serif",
          stroke: labelColor,
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
    [
      xZoom,
      metricsYZoom,
      chartWidth,
      gridColor,
      labelColor,
      metricsSeriesConfig,
    ]
  );

  // Refs to uPlot instances for cursor sync
  const tempPlotRef = useRef<any>(null);
  const metricsPlotRef = useRef<any>(null);
  const isSyncingCursor = useRef(false);

  // Track if user is actively selecting (mouse down)
  const isSelecting = useRef(false);
  useEffect(() => {
    const handleMouseDown = () => {
      isSelecting.current = true;
    };
    const handleMouseUp = () => {
      isSelecting.current = false;
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      if (container)
        container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
      .then(({ header, rows }) => {
        if (
          Array.isArray(rows) &&
          Array.isArray(header) &&
          rows.length > 0 &&
          header.length > 0
        ) {
          const tempHeaders = header
            .filter((h) => h.startsWith("Temperature"))
            .map((h: string) => getPinMapping(h.trim()));
          const metricHeaders = header
            .filter(
              (h) => !h.startsWith("Temperature") && !h.startsWith("Time")
            )
            .map((h: string) => getPinMapping(h.trim()))
            .filter((h) => !h.startsWith("Unmapped"));

          const parsedData = rows.map((row) => {
            const obj: DynamicProbeData = { timestamp: Number(row[0]) };
            header.forEach((key, index) => {
              const mappedPin = getPinMapping(key.trim());
              if (
                !key.startsWith("Time") &&
                !mappedPin.startsWith("Unmapped")
              ) {
                obj[mappedPin] =
                  calibration(key, parseFloat(row[index])) || null;
              }
            });
            return obj;
          });

          setData(parsedData);
          setTempHeaders(tempHeaders);
          setMetricHeaders(metricHeaders);

          // Initialize zoom state
          const timestamps = parsedData.map((d) => d.timestamp);
          const minX = timestamps.length > 0 ? Math.min(...timestamps) : 0;
          const maxX = timestamps.length > 0 ? Math.max(...timestamps) : 1;
          setXZoom([minX, maxX]);
          setBrush([minX, maxX]);
        } else {
          setData([]);
          setTempHeaders([]);
          setMetricHeaders([]);
          setXZoom(null);
          setBrush(null);
        }
        setTempYZoom(null);
        setMetricsYZoom(null);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setTempHeaders([]);
        setMetricHeaders([]);
        setXZoom(null);
        setBrush(null);
        setTempYZoom(null);
        setMetricsYZoom(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!ws) return;
    // Handler for incoming WebSocket messages
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        // UART message format: { id, timestamp, header, values }
        if (
          msg.id === selectedSession &&
          msg.timestamp &&
          Array.isArray(msg.header) &&
          Array.isArray(msg.values)
        ) {
          // Convert UART message to DynamicProbeData
          const uartData: DynamicProbeData = { timestamp: msg.timestamp };
          msg.header.forEach((key: string, idx: number) => {
            uartData[key] =
              typeof msg.values[idx] === "number"
                ? adcToTempC(msg.values[idx])
                : null;
          });
          setData((prevData) => {
            const updatedData = [...prevData, uartData];
            const timestamps = updatedData.map((d) => d.timestamp);
            const minX = timestamps.length > 0 ? Math.min(...timestamps) : 0;
            const maxX = timestamps.length > 0 ? Math.max(...timestamps) : 1;
            const prevMinX =
              prevData.length > 0
                ? Math.min(...prevData.map((d) => d.timestamp))
                : minX;
            const prevMaxX =
              prevData.length > 0
                ? Math.max(...prevData.map((d) => d.timestamp))
                : maxX;
            // Only zoom out if user is fully zoomed out and not actively selecting
            if (
              !isSelecting.current &&
              (xZoom == null ||
                (xZoom[0] === prevMinX && xZoom[1] === prevMaxX)) &&
              (minX < prevMinX || maxX > prevMaxX)
            ) {
              setXZoom([minX, maxX]);
              setBrush([minX, maxX]);
            }
            return updatedData;
          });
        }
      } catch (e) {
        // Ignore invalid messages
      }
    };
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, selectedSession, xZoom]);

  return (
    <div
      ref={containerRef}
      className={styles.chartContainer}
      style={{ width: "100%", maxWidth: "100%" }}
    >
      <Container
        size="md"
        px={0}
        style={{ marginBottom: 16, width: "100%", maxWidth: "100%" }}
      >
        <Group justify="center" align="end">
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
            allowDeselect={false}
            disabled={sessions.length === 0}
            size="sm"
            styles={{
              root: { flexGrow: "1" },
            }}
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
        <Paper
          shadow="sm"
          p="xl"
          className={styles.chartPaper}
          style={{ width: "100%", maxWidth: "100%" }}
        >
          <div style={{ textAlign: "center", fontSize: 18 }}>
            No sessions available.
            <br />
            Please upload data to begin.
          </div>
        </Paper>
      ) : (
        <Stack>
          <Paper
            shadow="sm"
            p="xl"
            className={styles.chartPaper}
            style={{
              width: "100%",
              maxWidth: "100%",
              height: "0px",
              display: "none",
            }}
          >
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
            shadow="sm"
            p={8}
            className={styles.metricsPaper}
            style={{ width: "100%", maxWidth: "100%" }}
          >
            <div className={styles.tip}>
              <b>Tip:</b> Drag along one axis of the graph to zoom that axis or
              drag diagonally to zoom into a rectangle. Double-click to reset
              zoom.
            </div>
            <div
              className={styles.rangeSliderContainer}
              style={{
                width: "100%",
                maxWidth: chartWidth,
                margin: "12px auto 16px",
              }}
            >
              <RangeSlider
                min={minX}
                max={maxX}
                step={(maxX - minX) / 500 || 0.01}
                value={brush ?? [minX, maxX]}
                onChange={(vals: [number, number]) => {
                  handleBrushChange([Number(vals[0]), Number(vals[1])]);
                }}
                marks={[
                  { value: minX, label: formatTime(null, minX, true) },
                  { value: maxX, label: formatTime(null, maxX, true) },
                ]}
                size="lg"
                label={(value) => formatTime(null, value, true)}
                disabled={sessions.length === 0}
                style={{ width: "100%", maxWidth: chartWidth }}
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
          <Paper
            shadow="sm"
            p="xl"
            className={styles.chartPaper}
            style={{ width: "100%", maxWidth: "100%" }}
          >
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
        </Stack>
      )}
    </div>
  );
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
