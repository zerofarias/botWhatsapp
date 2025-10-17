import type { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | undefined;

export function setSocketServer(server: SocketIOServer) {
  ioInstance = server;
}

export function getSocketServer() {
  return ioInstance;
}
