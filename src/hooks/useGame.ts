import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase, createPlayersTable } from '../lib/supabase';
import type { Player, GameState, Direction } from '../types/game';
import { GAME_CONFIG } from '../types/game';

const generateRandomColor = () => {
  return `#${Math.floor(Math.random()*16777215).toString(16)}`;
};

const getRandomDirection = (): Direction => {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
};

const generateInitialPosition = () => ({
  x: Math.floor(GAME_CONFIG.WIDTH / 2),
  y: Math.floor(GAME_CONFIG.HEIGHT / 2),
});

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>({ players: {} });
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize database
  useEffect(() => {
    const initDatabase = async () => {
      console.log('Initializing database...');
      const success = await createPlayersTable();
      if (!success) {
        setError('Failed to initialize game database');
      }
    };
    initDatabase();
  }, []);

  // Load all existing players
  useEffect(() => {
    console.log('Starting to load players...');
    const loadPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*');

        if (error) {
          console.error('Error loading players:', error);
          setError('Failed to load players');
          return;
        }

        console.log('Successfully loaded players:', data);
        const playersMap = data.reduce((acc, player) => {
          acc[player.id] = player;
          return acc;
        }, {} as Record<string, Player>);

        setGameState({ players: playersMap });
        console.log('Updated game state with players:', playersMap);
      } catch (error) {
        console.error('Unexpected error in loadPlayers:', error);
        setError('Failed to load players');
      }
    };

    loadPlayers();
  }, []);

  const updatePlayerPosition = useCallback(async (direction: Direction) => {
    if (!currentPlayer) {
      console.log('Cannot move: no current player');
      return;
    }

    console.log('Moving player:', currentPlayer.id, 'direction:', direction);

    let newX = currentPlayer.x;
    let newY = currentPlayer.y;

    switch (direction) {
      case 'up':
        newY = Math.max(0, currentPlayer.y - GAME_CONFIG.MOVEMENT_SPEED);
        break;
      case 'down':
        newY = Math.min(GAME_CONFIG.HEIGHT - GAME_CONFIG.PLAYER_SIZE, currentPlayer.y + GAME_CONFIG.MOVEMENT_SPEED);
        break;
      case 'left':
        newX = Math.max(0, currentPlayer.x - GAME_CONFIG.MOVEMENT_SPEED);
        break;
      case 'right':
        newX = Math.min(GAME_CONFIG.WIDTH - GAME_CONFIG.PLAYER_SIZE, currentPlayer.x + GAME_CONFIG.MOVEMENT_SPEED);
        break;
    }

    console.log('New position:', { x: newX, y: newY });

    const updatedPlayer = { ...currentPlayer, x: newX, y: newY };

    try {
      const { error } = await supabase
        .from('players')
        .update({ x: newX, y: newY })
        .eq('id', currentPlayer.id);

      if (error) {
        console.error('Error updating player position:', error);
        return;
      }

      console.log('Position updated in database');
      setCurrentPlayer(updatedPlayer);
      setGameState(prev => ({
        players: { ...prev.players, [updatedPlayer.id]: updatedPlayer }
      }));
    } catch (error) {
      console.error('Error updating player position:', error);
    }
  }, [currentPlayer]);

  const initializePlayer = useCallback(async () => {
    console.log('Starting player initialization...');
    try {
      const playerId = uuidv4();
      const position = generateInitialPosition();
      const player: Player = {
        id: playerId,
        name: `Player-${playerId.slice(0, 4)}`,
        ...position,
        color: generateRandomColor(),
      };

      console.log('Attempting to create new player:', player);

      // First, check if the table exists
      const { error: tableCheckError } = await supabase
        .from('players')
        .select('count')
        .limit(1);

      if (tableCheckError) {
        console.error('Table check error:', tableCheckError);
        setError('Game table not found. Please contact administrator.');
        return;
      }

      // Then try to insert the player
      const { data: insertData, error: insertError } = await supabase
        .from('players')
        .insert([player])
        .select();

      if (insertError) {
        console.error('Error creating player:', insertError);
        setError('Failed to create player: ' + insertError.message);
        return;
      }

      console.log('Player created successfully in database:', insertData);
      setCurrentPlayer(player);
      setGameState(prev => {
        const newState = {
          players: { ...prev.players, [player.id]: player }
        };
        console.log('Updated game state:', newState);
        return newState;
      });
      setIsInitialized(true);
      setError(null);
      console.log('Player initialization completed successfully');
    } catch (error) {
      console.error('Unexpected error in initializePlayer:', error);
      setError('Failed to initialize player: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

  // Add automatic random movement for other players
  useEffect(() => {
    const moveInterval = setInterval(() => {
      // Get all players except current player
      const otherPlayers = Object.values(gameState.players).filter(
        player => player.id !== currentPlayer?.id
      );

      // Move each other player randomly
      otherPlayers.forEach(async (player) => {
        const randomDirection = getRandomDirection();
        console.log('Auto-moving other player:', player.id, 'direction:', randomDirection);
        
        let newX = player.x;
        let newY = player.y;

        switch (randomDirection) {
          case 'up':
            newY = Math.max(0, player.y - GAME_CONFIG.MOVEMENT_SPEED);
            break;
          case 'down':
            newY = Math.min(GAME_CONFIG.HEIGHT - GAME_CONFIG.PLAYER_SIZE, player.y + GAME_CONFIG.MOVEMENT_SPEED);
            break;
          case 'left':
            newX = Math.max(0, player.x - GAME_CONFIG.MOVEMENT_SPEED);
            break;
          case 'right':
            newX = Math.min(GAME_CONFIG.WIDTH - GAME_CONFIG.PLAYER_SIZE, player.x + GAME_CONFIG.MOVEMENT_SPEED);
            break;
        }

        try {
          const { error } = await supabase
            .from('players')
            .update({ x: newX, y: newY })
            .eq('id', player.id);

          if (error) {
            console.error('Error updating other player position:', error);
            return;
          }

          // Update local state
          setGameState(prev => ({
            players: {
              ...prev.players,
              [player.id]: { ...player, x: newX, y: newY }
            }
          }));
        } catch (error) {
          console.error('Error updating other player position:', error);
        }
      });
    }, GAME_CONFIG.MOVEMENT_INTERVAL); // Use the new interval

    return () => {
      clearInterval(moveInterval);
    };
  }, [gameState.players, currentPlayer]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log('Key pressed:', e.key, 'isInitialized:', isInitialized, 'currentPlayer:', !!currentPlayer);
      
      if (!currentPlayer) {
        console.log('No current player, cannot move');
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w': 
          console.log('Moving up');
          updatePlayerPosition('up'); 
          break;
        case 's': 
          console.log('Moving down');
          updatePlayerPosition('down'); 
          break;
        case 'a': 
          console.log('Moving left');
          updatePlayerPosition('left'); 
          break;
        case 'd': 
          console.log('Moving right');
          updatePlayerPosition('right'); 
          break;
      }
    };

    console.log('Setting up keyboard listener');
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      console.log('Cleaning up keyboard listener');
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [updatePlayerPosition, currentPlayer]);

  // Set up realtime subscription
  useEffect(() => {
    console.log('Setting up realtime subscription');
    const channel = supabase
      .channel('players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, (payload) => {
        console.log('Realtime update:', payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            console.log('New player joined:', payload.new);
            setGameState(prev => ({
              players: { ...prev.players, [payload.new.id]: payload.new as Player }
            }));
            break;
          case 'UPDATE':
            console.log('Player moved:', payload.new);
            setGameState(prev => ({
              players: { ...prev.players, [payload.new.id]: payload.new as Player }
            }));
            break;
          case 'DELETE':
            console.log('Player left:', payload.old);
            setGameState(prev => {
              const newPlayers = { ...prev.players };
              delete newPlayers[payload.old.id];
              return { players: newPlayers };
            });
            break;
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentPlayer) {
        console.log('Cleaning up player:', currentPlayer.id);
        supabase
          .from('players')
          .delete()
          .eq('id', currentPlayer.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error deleting player:', error);
            }
          });
      }
    };
  }, [currentPlayer]);

  return { gameState, currentPlayer, initializePlayer, error };
}; 