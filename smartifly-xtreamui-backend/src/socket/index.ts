/* eslint-disable @typescript-eslint/no-explicit-any */

import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Server } from "socket.io";

import { env } from "../config/env";

interface AccessTokenPayload {
  sub: number;
  role: "ADMIN" | "USER";
}

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, env.jwtAccessSecret);

      if (typeof decoded !== "object") {
        return next(new Error("Invalid token format"));
      }

      const payload = decoded as JwtPayload;

      if (!payload.sub || !payload.role) {
        return next(new Error("Invalid token payload"));
      }

      const user: AccessTokenPayload = {
        sub: Number(payload.sub),
        role: payload.role as "ADMIN" | "USER",
      };

      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: any) => {
    console.log("Socket connected:", socket.data.user.sub);
  });

  return io;
}
