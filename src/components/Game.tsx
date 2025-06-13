import { useGame } from '../hooks/useGame';
import { GAME_CONFIG } from '../types/game';
import styles from './Game.module.css';

export const Game = () => {
  console.log('Game component rendering...');
  const { gameState, currentPlayer, initializePlayer, error } = useGame();

  // Auto-initialize player when component mounts if not already initialized
  if (!currentPlayer && !error) {
    console.log('No current player found, initializing...');
    initializePlayer();
  }

  console.log('Game State:', gameState);
  console.log('Current Player:', currentPlayer);
  console.log('Players:', Object.values(gameState.players));

  return (
    <div className={styles.gameWrapper}>
      <div className={styles.stats}>
        <div>Players online: {Object.keys(gameState.players).length}</div>
        {currentPlayer && (
          <div>Your player: {currentPlayer.name}</div>
        )}
      </div>
      <div className={styles.gameContainer}>
        {Object.values(gameState.players).map((player) => {
          console.log('Rendering player:', player);
          return (
            <div
              key={player.id}
              className={styles.player}
              style={{
                backgroundColor: player.color,
                left: `${player.x}px`,
                top: `${player.y}px`,
                width: `${GAME_CONFIG.PLAYER_SIZE}px`,
                height: `${GAME_CONFIG.PLAYER_SIZE}px`,
                outline: player.id === currentPlayer?.id ? '2px solid white' : 'none',
              }}
            >
              <span className={styles.playerName}>{player.name}</span>
            </div>
          );
        })}
        {!currentPlayer && !error && (
          <div className={styles.loading}>Loading...</div>
        )}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button onClick={() => initializePlayer()}>Retry</button>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <p>Controls:</p>
        <ul>
          <li>W - Move Up</li>
          <li>S - Move Down</li>
          <li>A - Move Left</li>
          <li>D - Move Right</li>
        </ul>
      </div>
    </div>
  );
}; 