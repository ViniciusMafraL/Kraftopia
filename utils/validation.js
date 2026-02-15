export function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return false;
  const trimmed = nickname.trim();
  return trimmed.length >= 3 && trimmed.length <= 20;
}

export function validateRoomCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^\d{5}$/.test(code);
}

export function validateMessage(message) {
  if (!message || typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= 500;
}
