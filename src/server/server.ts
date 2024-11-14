import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Server } from 'socket.io';

import { SocketActions } from '../constants/socket';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(express.static(join(__dirname, 'dist')));
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGIN },
  serveClient: false,
});
const getUsersInRoom = (roomId: string) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) ?? []);
};

io.on('connection', (socket) => {
  socket.on(SocketActions.CREATE_ROOM, ({ roomId }) => {
    const users = getUsersInRoom(roomId);
    if (users.length > 0) {
      socket.emit(SocketActions.EXIST_ROOM);
      return;
    }
    socket.emit(SocketActions.CONNECT_ROOM, roomId);
  });

  socket.on(SocketActions.ENTER_ROOM, ({ roomId }) => {
    const users = getUsersInRoom(roomId);
    if (users.length === 0) {
      socket.emit(SocketActions.NOT_FOUND_ROOM);
      return;
    }
    if (users.length === 2) {
      socket.emit(SocketActions.FULL_ROOM);
      return;
    }
    socket.emit(SocketActions.CONNECT_ROOM, roomId);
  });

  socket.on(SocketActions.JOIN_ROOM, ({ roomId }) => {
    if (socket.rooms.has(roomId)) {
      return;
    }

    const users = getUsersInRoom(roomId);

    const firstUserId = users[0];

    if (firstUserId) {
      io.to(firstUserId).emit(SocketActions.ADD_PEER, {
        remotePeerId: socket.id,
        createOffer: false,
      });
      socket.emit(SocketActions.ADD_PEER, {
        remotePeerId: firstUserId,
        createOffer: true,
      });
    }

    socket.join(roomId);
  });

  socket.on(SocketActions.SEND_SDP, ({ remotePeerId, sessionDescription }) => {
    io.to(remotePeerId).emit(SocketActions.SET_DESCRIPTION, {
      remotePeerId: socket.id,
      remoteSessionDescription: sessionDescription,
    });
  });

  socket.on(SocketActions.SEND_ICE, ({ remotePeerId, iceCandidate }) => {
    io.to(remotePeerId).emit(SocketActions.SET_ICE, {
      iceCandidate,
    });
  });

  function leaveRoom({ roomId }: { roomId: string }) {
    socket.leave(roomId);

    const users = getUsersInRoom(roomId);

    const leftUser = users[0];
    if (leftUser) {
      io.to(leftUser).emit(SocketActions.REMOVE_PEER);
    }
  }

  socket.on(SocketActions.LEAVE_ROOM, leaveRoom);
  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        leaveRoom({ roomId });
      }
    });
  });

  socket.on(SocketActions.SEND_MESSAGE, ({ roomId, isLocal, message }) => {
    const users = getUsersInRoom(roomId);
    users.forEach((user) => {
      if (user !== socket.id) {
        io.to(user).emit(SocketActions.SEND_MESSAGE, { isLocal, message });
      }
    });
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server ready on port ${port}`);
});
