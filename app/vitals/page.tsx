"use client";

import React, { useEffect, useState, useContext } from "react";
import { Container, Title, Text, SimpleGrid, Paper } from "@mantine/core";
import UartTerminal from "../../components/UartTerminal";
import { WebSocketContext } from "../layout";
import { calibration, getPinMapping } from "../api/probe-data/pinData";

const MAX_POINTS = 30;

export default function VitalsPage() {
  // Buffer for last 30 live values for each probe
  const [liveBuffers, setLiveBuffers] = useState<Record<string, number[]>>({});
  const [labels, setLabels] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<string>("Disconnected");
  const ws = useContext(WebSocketContext);

  useEffect(() => {
    if (!ws) {
      setWsStatus("Disconnected");
      return;
    }
    setWsStatus(
      ws.readyState === WebSocket.OPEN ? "Connected" : "Disconnected"
    );
    const handleOpen = () => setWsStatus("Connected");
    const handleClose = () => setWsStatus("Disconnected");
    const handleError = () => setWsStatus("Error");
    const handleMessage = (event: MessageEvent) => {
      try {
        let obj = JSON.parse(event.data);

        if (obj && Array.isArray(obj.values) && Array.isArray(obj.header)) {
          const newLabels: string[] = obj.header
            .map((h: string) => getPinMapping(h.trim()))
            .filter((h: string) => h !== "Unmapped");

          setLabels(newLabels);
          setLiveBuffers((prev) => {
            const next: Record<string, number[]> = { ...prev };

            for (let i = 0; i < obj.header.length; i++) {
              const label = obj.header[i];
              const mappedLabel = getPinMapping(label.trim());
              if (mappedLabel == "Unmapped") continue;

              let value = Number(obj.values[i]);
              if (isNaN(value)) value = 0;

              const calibratedValue = calibration(label.trim(), value);
              next[mappedLabel] = [
                ...(next[mappedLabel] || []),
                calibratedValue,
              ].slice(-MAX_POINTS);
            }

            return next;
          });
        }
      } catch {}
    };
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("close", handleClose);
    ws.addEventListener("error", handleError);
    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("open", handleOpen);
      ws.removeEventListener("close", handleClose);
      ws.removeEventListener("error", handleError);
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws]);

  return (
    <Container size="xxl" px="md">
      <Title order={2}>Vitals</Title>
      <Text mt="lg" size="sm" color="dimmed">
        WebSocket: {wsStatus}
      </Text>
      <SimpleGrid
        cols={{
          base: Math.min(labels.length, 3),
          md: Math.min(labels.length, 4),
          lg: Math.min(labels.length, 6),
        }}
        spacing={8}
      >
        {labels.map((label) => (
          <Paper key={label} p={8}>
            <Text size="xs">{label}</Text>
            <Text size="sm" mt={4} fw={700} style={{ textAlign: "right" }}>
              {liveBuffers[label] && liveBuffers[label].length > 0
                ? liveBuffers[label][liveBuffers[label].length - 1].toFixed(2)
                : "--"}
              °C
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
      <Text mt="md">UART Terminal:</Text>
      <UartTerminal />
    </Container>
  );
}
