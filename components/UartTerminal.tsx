"use client";

import React, { useState, useRef, useContext } from "react";
import { Button, Textarea, Group, Text, Stack, Container } from "@mantine/core";
import BluetoothTerminal from "./BluetoothTerminal";
import { WebSocketContext } from "../app/layout";

export default function UartTerminal() {
  // Maximum number of lines to keep in the terminal output
  const MAX_TERMINAL_LINES = 500;

  // Helper to trim terminal text to the last MAX_TERMINAL_LINES lines
  const trimToMaxLines = (text: string) => {
    const parts = text.split("\n");
    if (parts.length <= MAX_TERMINAL_LINES) return text;
    return parts.slice(-MAX_TERMINAL_LINES).join("\n");
  };
  const [connected, setConnected] = useState(false);
  const [terminal, setTerminal] = useState("");
  const [deviceName, setDeviceName] = useState("Terminal");
  const terminalRef = useRef<any>(null);
  const btRef = useRef<any>(null);
  const ws = useContext(WebSocketContext); // Use shared WebSocket
  const backlogRef = useRef<string[]>([]); // Buffer for unsent messages

  // UUIDs as numbers for Web Bluetooth compatibility with ESP32
  const SERVICE_UUID = 0xffe0;
  const CHARACTERISTIC_UUID = 0xffe1;

  // Connect to Bluetooth UART
  const connectBluetooth = async () => {
    if (!btRef.current) {
      btRef.current = new BluetoothTerminal(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        "\n",
        "\n"
      );
      btRef.current.receive = (data: string) => {
        setTerminal((prev) => trimToMaxLines(prev + data + "\n"));
      };
    }
    try {
      setTerminal((prev) =>
        trimToMaxLines(prev + "\nRequesting Bluetooth device...")
      );
      await btRef.current.connect();
      setConnected(true);
      setDeviceName(btRef.current.getDeviceName() || "Terminal");
      setTerminal((prev) =>
        trimToMaxLines(
          prev +
            `\nConnected to ${btRef.current.getDeviceName() || "Terminal"}\n`
        )
      );
      // Forward readings to WebSocket
      btRef.current.receive = (data: string) => {
        setTerminal((prev) => trimToMaxLines(prev + data + "\n"));
        // Forward JSON string directly to WebSocket or buffer if not open
        try {
          const obj = JSON.parse(data);
          if (obj && obj.id && obj.header && obj.values) {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(data);
              console.log("Sent to WebSocket:", obj);
            } else {
              backlogRef.current.push(data);
            }
          }
        } catch (e) {
          // Not a valid JSON, ignore
        }
      };
      // Send backlog if any
      if (ws && ws.readyState === WebSocket.OPEN) {
        while (backlogRef.current.length > 0) {
          ws.send(backlogRef.current.shift()!);
        }
      }
    } catch (err: any) {
      if (
        err?.message?.includes("User cancelled the requestDevice() chooser")
      ) {
        setTerminal((prev) =>
          trimToMaxLines(
            prev +
              "\n[Cancelled] Bluetooth device selection was cancelled by the user."
          )
        );
      } else {
        setTerminal((prev) =>
          trimToMaxLines(prev + `\nError: ${err?.message || err}`)
        );
      }
      console.error("Bluetooth connect error:", err);
    }
  };

  // Disconnect from Bluetooth UART
  const disconnectBluetooth = async () => {
    if (btRef.current) {
      await btRef.current.disconnect();
      setConnected(false);
      setDeviceName("Terminal");
    }
    backlogRef.current = [];
  };

  // Send data to UART
  const sendData = async (data: string) => {
    if (btRef.current && connected) {
      try {
        await btRef.current.send(data);
        setTerminal((prev) => trimToMaxLines(prev + data + "\n"));
      } catch (err) {
        setTerminal((prev) => trimToMaxLines(prev + `\nSend error: ${err}`));
      }
    }
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = terminalRef.current?.value || "";
    if (input) {
      sendData(input);
      terminalRef.current.value = "";
    }
  };

  return (
    <Stack gap={"md"}>
      <Group gap={"md"}>
        <Button onClick={connectBluetooth} disabled={connected}>
          Connect Bluetooth UART
        </Button>
        <Button onClick={disconnectBluetooth} disabled={!connected} color="red">
          Disconnect
        </Button>
        <Text>Device: {deviceName}</Text>
      </Group>

      <form onSubmit={handleSubmit}>
        <Group gap={"md"}>
          <Textarea
            ref={terminalRef}
            minRows={1}
            autosize
            placeholder="Type and send..."
            disabled={!connected}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // Submit form
                handleSubmit(e as any);
              }
            }}
          />
          <Button type="submit" disabled={!connected}>
            Send
          </Button>
        </Group>
      </form>
      <Text size="sm" color="dimmed">
        Bluetooth: {connected ? "Connected" : "Disconnected"}
      </Text>

      <Textarea
        value={terminal}
        readOnly
        styles={{
          input: {
            fontFamily: "monospace",
            background: "#222",
            color: "#eee",
            width: "100%",
            minWidth: "600px",
            maxWidth: "100vw",
          },
          root: {
            width: "100%",
          },
        }}
        minRows={12}
        autosize
      />
    </Stack>
  );
}
