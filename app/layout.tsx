"use client";

import "@mantine/core/styles.css";
import React, { createContext, useEffect } from "react";
import {
  MantineProvider,
  ColorSchemeScript,
  mantineHtmlProps,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { shadcnCssVariableResolver } from "../cssVariableResolver";
import { shadcnTheme } from "../theme";
import "../style.css";
import { Header } from "../components/Header/Header";

export const WebSocketContext = createContext<WebSocket | null>(null);

export default function RootLayout({ children }: { children: any }) {
  const [ws, setWs] = React.useState<WebSocket | null>(null);
  const reconnectTimer = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectIntervalMs = React.useRef(250); // ms, starts at 250ms

  const openWebSocket = React.useCallback(() => {
    if (ws) return;
    const socket = new WebSocket(
      `${
        typeof window !== "undefined" && window.location.protocol === "https:"
          ? "wss"
          : "ws"
      }://${
        typeof window !== "undefined" ? window.location.host : ""
      }/api/probe-data/ws`
    );
    setWs(socket);
    socket.onopen = () => {
      reconnectIntervalMs.current = 250;
    };
    socket.onclose = () => {
      setWs(null);
      // Try to reconnect
      if (!reconnectTimer.current) {
        reconnectTimer.current = setTimeout(() => {
          reconnectTimer.current = null;
          openWebSocket();
          reconnectIntervalMs.current = Math.min(
            reconnectIntervalMs.current + 250,
            5000
          );
        }, reconnectIntervalMs.current);
      }
    };
    socket.onerror = () => {
      socket.close();
      setWs(null);
    };
  }, [ws]);

  React.useEffect(() => {
    openWebSocket();

    return () => {
      ws?.close();
      setWs(null);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, []); 

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <WebSocketContext.Provider value={ws}>
          <MantineProvider
            theme={shadcnTheme}
            cssVariablesResolver={shadcnCssVariableResolver}
          >
            <Header />
            {children}
          </MantineProvider>
        </WebSocketContext.Provider>
      </body>
    </html>
  );
}
