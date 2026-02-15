import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './roomManager.js';
import { setupRoomHandlers } from './handlers/roomHandler.js';
import { setupChatHandlers } from './handlers/chatHandler.js';
import { setupPlayerHandlers } from './handlers/playerHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = 3001;
const roomManager = new RoomManager();

// Global interval for syncing room states (every 5 seconds)
let hasLoggedRoomSyncLoop = false;
setInterval(() => {
  const roomCodes = Object.keys(roomManager.rooms);
  for (const roomCode of roomCodes) {
    const playersList = roomManager.getPlayersList(roomCode);
    const room = roomManager.rooms[roomCode];
    
    if (playersList.length > 0) {
      if (!hasLoggedRoomSyncLoop) {
        console.log('📡 room:updated emit -- Loop');
        hasLoggedRoomSyncLoop = true;
      }
      io.to(`room:${roomCode}`).emit('room:updated', {
        roomCode: room.roomCode,
        playersList: playersList,
        messages: room.messages
      });
    }
  }
}, 5000);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server running', 
    rooms: Object.keys(roomManager.rooms).length,
    players: Object.keys(roomManager.connectedPlayers).length
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`✅ Player connected: ${socket.id}`);

  // Register all handlers
  setupRoomHandlers(socket, io, roomManager);
  setupChatHandlers(socket, io, roomManager);
  setupPlayerHandlers(socket, io, roomManager);

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Player disconnected: ${socket.id}`);
    const player = roomManager.getPlayerBySocketId(socket.id);
    if (player) {
      const room = roomManager.rooms[player.roomCode];
      if (room && room.hostId === player.id) {
        // Host disconnected - close room
        console.log(`🔴 Host left room ${player.roomCode}, closing...`);
        io.to(`room:${player.roomCode}`).emit('room:closed', { reason: 'host_disconnected' });
        roomManager.closeRoom(player.roomCode);
      } else if (player.roomCode) {
        // Regular player left
        console.log(`👤 Player ${player.nickname} left room ${player.roomCode}`);
        roomManager.leaveRoom(player.id);
        const room = roomManager.rooms[player.roomCode];
        if (room) {
          io.to(`room:${player.roomCode}`).emit('room:playerLeft', {
            playerId: player.id,
            playersList: roomManager.getPlayersList(player.roomCode)
          });
        }
      }
      roomManager.removePlayer(player.id);
    }
  });

  socket.on('disconnect', () => {
  });
});

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🎮 Kraftopia Server Iniciado!        ║
║  📍 http://localhost:${PORT}               ║
║  ✅ Socket.io ativo                   ║
╚════════════════════════════════════════╝
  `);
});

// Handle server errors
httpServer.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Servidor encerrado');
  httpServer.close();
  process.exit(0);
});
