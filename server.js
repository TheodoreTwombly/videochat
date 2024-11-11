import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Server } from 'socket.io';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(express.static(join(__dirname, 'dist')));
console.log(process.env.ALLOWED_ORIGIN);
const io = new Server(server, {
  cors: process.env.ALLOWED_ORIGIN,
  serveClient: false,
});
io.on('connection', (socket) => {
  console.log('Socket connected');
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server ready on port ${port}`);
});
