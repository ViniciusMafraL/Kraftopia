import { validateMessage } from '../utils/validation.js';

export function setupChatHandlers(socket, io, roomManager) {
  socket.on('chat:send', ({ playerId, message }, callback) => {
    const player = roomManager.getPlayer(playerId);
    if (!player) {
      callback({ success: false, error: 'Player not found' });
      return;
    }

    const room = roomManager.getRoom(player.roomCode);
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (!validateMessage(message)) {
      callback({ success: false, error: 'Invalid message' });
      return;
    }

    roomManager.updateActivity(playerId);
    roomManager.addMessage(player.roomCode, player.nickname, message);

    const chatMessage = {
      playerNickname: player.nickname,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isActive: player.isActive,
      type: 'user'
    };

    console.log(`📡 Broadcasting chat:message to room:${player.roomCode}`);
    io.to(`room:${player.roomCode}`).emit('chat:message', chatMessage);

    callback({ success: true });
  });
}
