export type Direction = 'up' | 'down' | 'left' | 'right';

export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
};

export type GameState = {
  players: Record<string, Player>;
};

export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  PLAYER_SIZE: 20,
  MOVEMENT_SPEED: 5,
  MOVEMENT_INTERVAL: 50,
} as const; 