import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Server } from 'socket.io';

import { SocketActions } from '../constants/socket';

config();

const usersRooms: Record<string, string> = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(express.static(join(__dirname, 'dist')));
const io = new Server(server, {
  cors: { origin: process.env.ALLOWED_ORIGIN },
  serveClient: false,
});

io.on('connection', (socket) => {
  socket.on(SocketActions.CREATE_ROOM, ({ roomId }) => {
    if (usersRooms[roomId]) {
      socket.emit(SocketActions.EXIST_ROOM);
      return;
    }
    usersRooms[roomId] = socket.id;
    socket.emit(SocketActions.CONNECT_ROOM, roomId);
  });

  socket.on(SocketActions.ENTER_ROOM, ({ roomId }) => {
    console.log('ENTER_ROOM');
    if (!Object.keys(usersRooms).includes(roomId)) {
      socket.emit(SocketActions.NOT_FOUND_ROOM);
    } else if (
      Array.from(io.sockets.adapter.rooms.get(usersRooms[roomId]) ?? [])
        .length === 2
    ) {
      socket.emit(SocketActions.FULL_ROOM);
    } else {
      socket.emit(SocketActions.CONNECT_ROOM, roomId);
    }
  });

  socket.on(SocketActions.JOIN_ROOM, ({ roomId }) => {
    console.log('roomId ', roomId);
    console.log('io.sockets.adapter.rooms ', io.sockets.adapter.rooms);
    console.log('usersRooms ', usersRooms);

    console.log('socket.rooms ', socket.rooms);

    if (socket.rooms.has(usersRooms[roomId])) {
      return;
    }

    const users = Array.from(
      io.sockets.adapter.rooms.get(usersRooms[roomId]) ?? []
    );
    console.log('users', users);

    users.forEach((userId) => {
      io.to(userId).emit(SocketActions.ADD_PEER, {
        peerId: socket.id,
        createOffer: false,
      });
      socket.emit(SocketActions.ADD_PEER, {
        peerId: userId,
        createOffer: true,
      });
    });

    socket.join(usersRooms[roomId]);
    console.log(
      'after join ',
      Array.from(io.sockets.adapter.rooms.get(usersRooms[roomId]) ?? [])
    );
  });

  socket.on(SocketActions.SEND_SDP, ({ peerId, sessionDescription }) => {
    io.to(peerId).emit(SocketActions.SET_DESCRIPTION, {
      peerId: socket.id,
      sessionDescription,
    });
  });

  socket.on(SocketActions.SEND_ICE, ({ peerId, iceCandidate }) => {
    io.to(peerId).emit(SocketActions.SET_ICE, {
      peerId: socket.id,
      iceCandidate,
    });
  });

  function leaveRoom({ roomId }: { roomId: string }) {
    const users = Array.from(
      io.sockets.adapter.rooms.get(usersRooms[roomId]) ?? []
    );

    users.forEach((userId) => {
      io.to(userId).emit(SocketActions.REMOVE_PEER, {
        peerId: socket.id,
      });

      socket.emit(SocketActions.REMOVE_PEER, {
        peerId: userId,
      });
    });
    socket.leave(usersRooms[roomId]);
    if (
      Array.from(io.sockets.adapter.rooms.get(usersRooms[roomId]) ?? [])
        .length === 0
    ) {
      delete usersRooms[roomId];
    }

    console.log(usersRooms);
  }

  socket.on(SocketActions.LEAVE_ROOM, leaveRoom);
  // socket.on('disconnecting', (reason) => {
  //   if(reason){
  //     leaveRoom();
  //   }
  // });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server ready on port ${port}`);
});
