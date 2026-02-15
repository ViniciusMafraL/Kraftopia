export function setupPlayerHandlers(socket, io, roomManager) {
  socket.on('player:activity', ({ playerId }, callback) => {
    const player = roomManager.getPlayer(playerId);
    if (!player) {
      callback({ success: false });
      return;
    }

    roomManager.updateActivity(playerId);
    const room = roomManager.getRoom(player.roomCode);

    if (room) {
      const playersList = roomManager.getPlayersList(player.roomCode);
      io.to(`room:${player.roomCode}`).emit('player:statusUpdated', {
        playerId,
        isActive: player.isActive,
        playersList
      });
    }

    callback({ success: true });
  });
}
