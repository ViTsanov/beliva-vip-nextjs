#!/usr/bin/env node
// Zero-dependency stdio <-> legacy "HTTP with SSE" bridge (MCP spec 2024-11-05).
// Talks directly to the local Obsidian "Claude Code" plugin's SSE endpoint
// using only Node's built-in http module -- no npx, no downloads, no
// external processes. This avoids sandboxing/PATH issues that can prevent
// npx from working inside Claude Desktop's packaged environment.

const http = require("http");
const readline = require("readline");
const { URL } = require("url");

const SSE_URL = "http://localhost:22360/sse";

function log(...args) {
  // stdout is reserved for MCP JSON-RPC traffic -- always log to stderr.
  console.error("[obsidian-bridge]", ...args);
}

let postEndpoint = null;
const pendingOutbound = [];

function flushPending() {
  while (postEndpoint && pendingOutbound.length) {
    sendToServer(pendingOutbound.shift());
  }
}

function sendToServer(line) {
  let url;
  try {
    url = new URL(postEndpoint);
  } catch (err) {
    log("Invalid endpoint URL from server:", postEndpoint, err.message);
    return;
  }
  const body = Buffer.from(line, "utf8");
  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body.length,
      },
    },
    (res) => {
      // Actual JSON-RPC response arrives asynchronously over the SSE stream,
      // not in this POST response -- just drain it.
      res.resume();
    }
  );
  req.on("error", (err) => log("POST to Obsidian plugin failed:", err.message));
  req.write(body);
  req.end();
}

function handleSSEEvent(rawEvent) {
  let eventType = "message";
  const dataParts = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
  }
  const data = dataParts.join("\n");
  if (!data) return;

  if (eventType === "endpoint") {
    postEndpoint = data.startsWith("http") ? data : new URL(data, SSE_URL).toString();
    log("Connected. POST endpoint:", postEndpoint);
    flushPending();
  } else if (eventType === "message") {
    // Forward server -> Claude Desktop over stdout, one JSON-RPC message per line.
    process.stdout.write(data + "\n");
  }
}

function connectSSE() {
  const url = new URL(SSE_URL);
  const req = http.get(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { Accept: "text/event-stream" },
    },
    (res) => {
      if (res.statusCode !== 200) {
        log("SSE connection failed, status", res.statusCode, "-- is Obsidian open with the plugin running?");
        process.exit(1);
        return;
      }
      res.setEncoding("utf8");
      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          handleSSEEvent(rawEvent);
        }
      });
      res.on("end", () => {
        log("SSE stream closed by Obsidian plugin");
        process.exit(1);
      });
      res.on("error", (err) => {
        log("SSE stream error:", err.message);
        process.exit(1);
      });
    }
  );
  req.on("error", (err) => {
    log("Could not reach Obsidian plugin at", SSE_URL, "-", err.message, "-- is Obsidian running?");
    process.exit(1);
  });
}

// Claude Desktop -> this bridge, one JSON-RPC message per line on stdin.
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (postEndpoint) sendToServer(trimmed);
  else pendingOutbound.push(trimmed);
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

connectSSE();
