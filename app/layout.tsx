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
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimer = React.useRef<NodeJS.Timeout | null>(null);
  const reconnectIntervalMs = React.useRef(250); // ms, starts at 250ms

  const openWebSocket = React.useCallback(() => {
    if (wsRef.current) return;
    
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
    const host = typeof window !== "undefined" ? window.location.host : "";

    const currentAuthKey = typeof window !== "undefined" ? localStorage.getItem("upload-auth-key") : null;
    const wsUrl = currentAuthKey 
      ? `${protocol}://${host}/api/probe-data/ws?auth=${encodeURIComponent(currentAuthKey)}`
      : `${protocol}://${host}/api/probe-data/ws`;
      console.log("Connecting to WebSocket URL:", wsUrl);
      console.log("Using auth key:", currentAuthKey);
    
    const socket = new WebSocket(wsUrl);
    setWs(socket);
    wsRef.current = socket;
    socket.onopen = () => {
      reconnectIntervalMs.current = 250;
    };
    socket.onmessage = (event) => {
      console.log("WebSocket message:", event.data);
    }
    socket.onclose = () => {
      setWs(null);
      wsRef.current = null;
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
      wsRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    openWebSocket();

    return () => {
      wsRef.current?.close();
      setWs(null);
      wsRef.current = null;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [openWebSocket]);

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
