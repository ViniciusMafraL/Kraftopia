export class RoomManager {
  constructor() {
    this.rooms = {};           // roomCode -> Room
    this.connectedPlayers = {}; // playerId -> Player
    this.activityTimers = new Map();
    this.roomTimers = new Map();
  }

  createRoom(playerId, nickname) {
    const roomCode = this.generateRoomCode();
    
    this.rooms[roomCode] = {
      roomCode,
      hostId: playerId,
      createdAt: Date.now(),
      players: [playerId],
      messages: [],
      isActive: true
    };

    const player = {
      id: playerId,
      nickname,
      roomCode,
      socketId: null,
      isActive: true,
      lastActivityTime: Date.now()
    };

    this.connectedPlayers[playerId] = player;
    this.updateActivity(playerId);

    return roomCode;
  }

  joinRoom(playerId, nickname, roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return null;

    room.players.push(playerId);
    const player = {
      id: playerId,
      nickname,
      roomCode,
      socketId: null,
      isActive: true,
      lastActivityTime: Date.now()
    };

    this.connectedPlayers[playerId] = player;
    this.updateActivity(playerId);

    // Add system message
    room.messages.push({
      playerNickname: 'Sistema',
      message: `${nickname} entrou na sala`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isActive: true,
      type: 'system'
    });

    return room;
  }

  leaveRoom(playerId) {
    const player = this.connectedPlayers[playerId];
    if (!player) return;

    const room = this.rooms[player.roomCode];
    if (!room) return;

    room.players = room.players.filter(id => id !== playerId);

    room.messages.push({
      playerNickname: 'Sistema',
      message: `${player.nickname} saiu da sala`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isActive: true,
      type: 'system'
    });

    if (room.hostId === playerId) {
      // Host left - close room
      this.closeRoom(player.roomCode);
    } else if (room.players.length === 0) {
      // No more players
      this.closeRoom(player.roomCode);
    }
  }

  closeRoom(roomCode) {
    if (this.rooms[roomCode]) {
      this.rooms[roomCode].messages.push({
        playerNickname: 'Sistema',
        message: 'Sala foi fechada',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isActive: true,
        type: 'system'
      });

      // Clear activity timers for players in this room
      for (const playerId of this.rooms[roomCode].players) {
        const timer = this.activityTimers.get(playerId);
        if (timer) clearTimeout(timer);
        this.activityTimers.delete(playerId);
      }

      delete this.rooms[roomCode];
    }
  }

  updateActivity(playerId) {
    const player = this.connectedPlayers[playerId];
    if (!player) return;

    player.lastActivityTime = Date.now();
    player.isActive = true;

    // Clear existing timer
    if (this.activityTimers.has(playerId)) {
      clearTimeout(this.activityTimers.get(playerId));
    }

    // Set 30-second inactivity timeout
    const timer = setTimeout(() => {
      player.isActive = false;
    }, 30000);

    this.activityTimers.set(playerId, timer);
  }

  addMessage(roomCode, playerNickname, message) {
    const room = this.rooms[roomCode];
    if (!room) return;

    room.messages.push({
      playerNickname,
      message,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isActive: true,
      type: 'user'
    });
  }

  getAvailableRooms() {
    return Object.values(this.rooms).map(room => ({
      code: room.roomCode,
      playerCount: room.players.length,
      hostId: room.hostId,
      createdAt: room.createdAt
    }));
  }

  getRoom(roomCode) {
    return this.rooms[roomCode];
  }

  getPlayer(playerId) {
    return this.connectedPlayers[playerId];
  }

  getPlayerBySocketId(socketId) {
    return Object.values(this.connectedPlayers).find(p => p.socketId === socketId);
  }

  setPlayerSocketId(playerId, socketId) {
    const player = this.connectedPlayers[playerId];
    if (player) player.socketId = socketId;
  }

  removePlayer(playerId) {
    const timer = this.activityTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.activityTimers.delete(playerId);
    delete this.connectedPlayers[playerId];
  }

  generateRoomCode() {
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.rooms[code]);
    return code;
  }

  getPlayersList(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return [];

    return room.players.map(pId => {
      const p = this.connectedPlayers[pId];
      if (!p) return null;
      return {
        id: p.id,
        nickname: p.nickname,
        isActive: p.isActive,
        lastActivityTime: p.lastActivityTime
      };
    }).filter(Boolean);
  }
}
