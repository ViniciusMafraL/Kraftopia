import { validateRoomCode, validateNickname } from '../utils/validation.js';

export function setupRoomHandlers(socket, io, roomManager) {
  socket.on('room:create', ({ playerId, nickname }, callback) => {
    console.log(`📝 room:create - playerId: ${playerId}, nickname: ${nickname}`);
    
    if (!validateNickname(nickname)) {
      callback({ success: false, error: 'Invalid nickname' });
      return;
    }

    const roomCode = roomManager.createRoom(playerId, nickname);
    roomManager.setPlayerSocketId(playerId, socket.id);
    socket.join(`room:${roomCode}`);

    const room = roomManager.getRoom(roomCode);
    const playersList = roomManager.getPlayersList(roomCode);

    console.log(`🎮 Room created: ${roomCode} by ${nickname}`);

    callback({
      success: true,
      roomCode,
      playerId,
      nickname,
      playersList,
      messages: room.messages,
      hostId: room.hostId
    });
  });

  socket.on('room:join', ({ playerId, nickname, roomCode }, callback) => {
    console.log(`📝 room:join - playerId: ${playerId}, nickname: ${nickname}, roomCode: ${roomCode}`);
    
    if (!validateRoomCode(roomCode) || !validateNickname(nickname)) {
      callback({ success: false, error: 'Invalid room code or nickname' });
      return;
    }

    const room = roomManager.joinRoom(playerId, nickname, roomCode);
    if (!room) {
      console.warn(`❌ Room ${roomCode} does not exist`);
      callback({ success: false, error: 'Room does not exist' });
      return;
    }

    roomManager.setPlayerSocketId(playerId, socket.id);
    socket.join(`room:${roomCode}`);

    const playersList = roomManager.getPlayersList(roomCode);

    console.log(`👤 Player ${nickname} joined room ${roomCode}`);

    callback({
      success: true,
      roomCode,
      playerId,
      nickname,
      playersList,
      messages: room.messages,
      hostId: room.hostId
    });

    // Broadcast to room
    io.to(`room:${roomCode}`).emit('room:playerJoined', {
      playerId,
      nickname,
      playersList
    });
  });

  socket.on('room:leave', ({ playerId }, callback) => {
    console.log(`📝 room:leave - playerId: ${playerId}`);
    
    const player = roomManager.getPlayer(playerId);
    if (!player) {
      console.error(`❌ Player ${playerId} not found in roomManager`);
      callback({ success: false, error: 'Player not found' });
      return;
    }

    const roomCode = player.roomCode;
    const isHost = player.id === roomManager.getRoom(roomCode)?.hostId;

    roomManager.leaveRoom(playerId);
    socket.leave(`room:${roomCode}`);

    if (isHost) {
      console.log(`🔴 Host ${player.nickname} left room ${roomCode}, closing...`);
      io.to(`room:${roomCode}`).emit('room:closed', { reason: 'host_disconnected' });
      roomManager.closeRoom(roomCode);
    } else {
      const room = roomManager.getRoom(roomCode);
      if (room) {
        const playersList = roomManager.getPlayersList(roomCode);
        console.log(`👤 Player ${player.nickname} left room ${roomCode}`);
        io.to(`room:${roomCode}`).emit('room:playerLeft', {
          playerId,
          playersList
        });
      }
    }

    callback({ success: true });
  });

  socket.on('rooms:list', (callback) => {
    const availableRooms = roomManager.getAvailableRooms();
    callback({ success: true, rooms: availableRooms });
  });
}
