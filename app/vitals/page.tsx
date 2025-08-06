"use client";

import React, { useEffect, useState, useContext } from "react";
import { Container, Title, Text, SimpleGrid, Paper } from "@mantine/core";
import UartTerminal from "../../components/UartTerminal";
import { WebSocketContext } from "../layout";

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
        const obj = JSON.parse(event.data);
        if (obj && Array.isArray(obj.values) && Array.isArray(obj.header)) {
          setLabels(obj.header);
          setLiveBuffers((prev) => {
            const next: Record<string, number[]> = { ...prev };
            obj.header.forEach((label: string, i: number) => {
              const value = Number(obj.values[i]);
              if (!isNaN(value)) {
                next[label] = [...(next[label] || []), value].slice(
                  -MAX_POINTS
                );
              }
            });
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
      <SimpleGrid cols={Math.min(labels.length, 4)} spacing={8}>
        {labels.map((label) => (
          <Paper key={label} p={8}>
            <Text size="xs">{label}</Text>
            <Text size="sm" mt={4} fw={700} style={{ textAlign: "right" }}>
              {liveBuffers[label] && liveBuffers[label].length > 0
                ? liveBuffers[label][liveBuffers[label].length - 1]
                : "--"}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>
      <Text mt="md">UART Terminal:</Text>
      <UartTerminal />
    </Container>
  );
}
