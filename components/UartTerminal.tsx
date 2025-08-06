"use client";

import React, { useState, useRef } from "react";
import { Button, Textarea, Group, Text, Stack, Container } from "@mantine/core";
import BluetoothTerminal from "./BluetoothTerminal";

export default function UartTerminal() {
  const [connected, setConnected] = useState(false);
  const [terminal, setTerminal] = useState("");
  const [deviceName, setDeviceName] = useState("Terminal");
  const terminalRef = useRef<any>(null);
  const btRef = useRef<any>(null);

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
        setTerminal((prev) => prev + data + "\n");
      };
    }
    try {
      setTerminal((prev) => prev + "\nRequesting Bluetooth device...");
      await btRef.current.connect();
      setConnected(true);
      setDeviceName(btRef.current.getDeviceName() || "Terminal");
      setTerminal(
        (prev) =>
          prev +
          `\nConnected to ${btRef.current.getDeviceName() || "Terminal"}\n`
      );
    } catch (err: any) {
      if (
        err?.message?.includes("User cancelled the requestDevice() chooser")
      ) {
        setTerminal(
          (prev) =>
            prev +
            "\n[Cancelled] Bluetooth device selection was cancelled by the user."
        );
      } else {
        setTerminal((prev) => prev + `\nError: ${err?.message || err}`);
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
  };

  // Send data to UART
  const sendData = async (data: string) => {
    if (btRef.current && connected) {
      try {
        await btRef.current.send(data);
        setTerminal((prev) => prev + data + "\n");
      } catch (err) {
        setTerminal((prev) => prev + `\nSend error: ${err}`);
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
          <Button
            onClick={disconnectBluetooth}
            disabled={!connected}
            color="red"
          >
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
          {connected ? "Connected" : "Disconnected"}
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
