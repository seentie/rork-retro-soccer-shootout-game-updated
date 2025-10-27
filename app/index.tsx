import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RotateCcw, ArrowUp, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type GoalkeeperPosition = 'left' | 'center' | 'right';
type GameState = 'aiming' | 'shooting' | 'result' | 'gameOver';
type ShotResult = 'goal' | 'saved' | 'missed';

interface Shot {
  result: ShotResult;
  attempt: number;
}

const GOAL_WIDTH = SCREEN_WIDTH * 0.8;
const GOAL_HEIGHT = SCREEN_HEIGHT * 0.35;
const BALL_SIZE = 30;
const KEEPER_WIDTH = 80;
const KEEPER_HEIGHT = 110;

export default function SoccerShootout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('aiming');
  const [shots, setShots] = useState<Shot[]>([]);
  const [totalShots, setTotalShots] = useState(5);
  const [arrowAngle, setArrowAngle] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [keeperPosition, setKeeperPosition] = useState<GoalkeeperPosition>('center');
  const [showMessage, setShowMessage] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'night' | 'rain'>('day');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const ballX = useRef(new Animated.Value(0)).current;
  const ballY = useRef(new Animated.Value(0)).current;
  const ballScale = useRef(new Animated.Value(1)).current;
  const ballRotation = useRef(new Animated.Value(0)).current;
  const ballBounce = useRef(new Animated.Value(0)).current;
  const keeperX = useRef(new Animated.Value(0)).current;
  const keeperY = useRef(new Animated.Value(0)).current;
  const arrowOpacity = useRef(new Animated.Value(1)).current;
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keeperIdleAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const rainAnimations = useRef<Animated.Value[]>([]).current;
  const crowdSound = useRef<Audio.Sound | null>(null);
  const goalSound = useRef<Audio.Sound | null>(null);
  const cheerSound = useRef<Audio.Sound | null>(null);
  const blockSound = useRef<Audio.Sound | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => gameState === 'aiming',
      onMoveShouldSetPanResponder: () => gameState === 'aiming',
      onPanResponderMove: (_, gestureState) => {
        if (gameState === 'aiming') {
          const angle = Math.atan2(-gestureState.dy, gestureState.dx) * (180 / Math.PI);
          const clampedAngle = Math.max(-60, Math.min(60, angle));
          setArrowAngle(clampedAngle);
        }
      },
    })
  ).current;

  const getKeeperXPosition = (position: GoalkeeperPosition): number => {
    const positions = {
      left: -GOAL_WIDTH / 3,
      center: 0,
      right: GOAL_WIDTH / 3,
    };
    return positions[position];
  };

  const shouldKeeperBlockRef = useRef(false);
  const shotDestinationRef = useRef({ x: 0, y: 0 });

  const moveKeeper = useCallback((shotAngle: number) => {
    const predictedX = Math.sin(shotAngle * Math.PI / 180) * GOAL_WIDTH * 0.4;
    
    let keeperTargetX = 0;
    const saveRate = difficulty === 'easy' ? 0.45 : difficulty === 'hard' ? 0.75 : 0.66;
    const shouldBlock = Math.random() < saveRate;
    shouldKeeperBlockRef.current = shouldBlock;
    shotDestinationRef.current = { x: predictedX, y: -(SCREEN_HEIGHT * 0.3) };
    
    console.log(`🎯 Shot ${shots.length + 1}: Keeper will ${shouldBlock ? '🥅 BLOCK' : '❌ MISS'} this shot (angle: ${shotAngle.toFixed(1)}°, predicted X: ${predictedX.toFixed(1)})`);
    
    if (shouldBlock) {
      keeperTargetX = predictedX;
      
      if (predictedX < -GOAL_WIDTH / 4) {
        setKeeperPosition('left');
      } else if (predictedX > GOAL_WIDTH / 4) {
        setKeeperPosition('right');
      } else {
        setKeeperPosition('center');
      }
      
      console.log(`🥅 Keeper moving to GUARANTEED BLOCK position: ${keeperTargetX.toFixed(1)} (ball will be at ${predictedX.toFixed(1)})`);
    } else {
      const positions: GoalkeeperPosition[] = ['left', 'center', 'right'];
      
      let wrongPositions = positions.filter(pos => {
        const posX = getKeeperXPosition(pos);
        return Math.abs(posX - predictedX) > GOAL_WIDTH / 3;
      });
      
      if (wrongPositions.length === 0) {
        wrongPositions = predictedX >= 0 ? ['left'] : ['right'];
      }
      
      const newPosition = wrongPositions[Math.floor(Math.random() * wrongPositions.length)];
      setKeeperPosition(newPosition);
      keeperTargetX = getKeeperXPosition(newPosition);
      
      console.log(`❌ Keeper moving to MISS position: ${keeperTargetX.toFixed(1)} (intentionally far from ${predictedX.toFixed(1)})`);
    }
    
    Animated.spring(keeperX, {
      toValue: keeperTargetX,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();

    Animated.sequence([
      Animated.spring(keeperY, {
        toValue: -50,
        useNativeDriver: true,
        tension: 60,
        friction: 4,
      }),
      Animated.spring(keeperY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 4,
      }),
    ]).start();
  }, [keeperX, keeperY, shots.length, difficulty]);

  const handleTap = () => {
    if (gameState !== 'aiming') return;

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
    }

    if (newTapCount === 2) {
      shoot();
      setTapCount(0);
    } else {
      tapTimer.current = setTimeout(() => {
        setTapCount(0);
      }, 500) as ReturnType<typeof setTimeout>;
    }
  };

  const shoot = () => {
    setGameState('shooting');
    stopKeeperIdleMovement();
    moveKeeper(arrowAngle);

    Animated.timing(arrowOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const targetX = (Math.sin(arrowAngle * Math.PI / 180) * GOAL_WIDTH * 0.4);
    const targetY = -(SCREEN_HEIGHT * 0.3);

    Animated.timing(ballRotation, {
      toValue: 720,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const willBlock = shouldKeeperBlockRef.current;
    
    if (willBlock) {
      console.log('🥅 EXECUTING GUARANTEED BLOCK');
      
      Animated.parallel([
        Animated.timing(ballX, {
          toValue: targetX * 0.6,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(ballY, {
          toValue: targetY * 0.6,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(ballScale, {
          toValue: 0.7,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        handleSavedShot(targetX * 0.6, targetY * 0.6);
      });
    } else {
      console.log('❌ EXECUTING GUARANTEED GOAL/MISS');
      
      Animated.parallel([
        Animated.timing(ballX, {
          toValue: targetX,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ballY, {
          toValue: targetY,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ballScale, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const finalX = SCREEN_WIDTH / 2 + targetX;
        const finalY = SCREEN_HEIGHT * 0.7 + targetY;
        checkGoal(finalX, finalY, targetX);
      });
    }
  };

  const handleSavedShot = (currentBallX: number, currentBallY: number) => {
    const newShots: Shot[] = [...shots, { result: 'saved' as ShotResult, attempt: shots.length + 1 }];
    console.log('HandleSavedShot - Adding saved shot:', { result: 'saved', attempt: shots.length + 1 });
    console.log('HandleSavedShot - New shots array:', newShots);
    setShots(newShots);
    setShowMessage('SAVED!');
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(err => 
        console.log('Haptics error:', err)
      );
    }
    
    console.log('🥅 SAVE! Playing block sound...');
    if (soundEnabled && blockSound.current) {
      blockSound.current.setPositionAsync(0).then(() => {
        return blockSound.current?.playAsync();
      }).catch(err => console.error('❌ Block sound error:', err));
    } else if (!soundEnabled) {
      console.log('🔇 Sound is disabled');
    } else {
      console.warn('⚠️ Block sound not loaded');
    }
    
    const keeperCenterX = getKeeperXPosition(keeperPosition);
    
    let bounceX = 0;
    if (currentBallX > keeperCenterX + 20) {
      bounceX = Math.random() * 60 + 40;
    } else if (currentBallX < keeperCenterX - 20) {
      bounceX = -(Math.random() * 60 + 40);
    } else {
      bounceX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 40 + 30);
    }
    
    Animated.parallel([
      Animated.timing(ballX, {
        toValue: bounceX,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(ballY, {
        toValue: -80,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(ballScale, {
        toValue: 0.9,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.sequence([
      Animated.timing(ballBounce, {
        toValue: -25,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: -18,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 5,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: -8,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 0,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();
    
    const currentRotation = (ballRotation as any)._value || 0;
    Animated.timing(ballRotation, {
      toValue: currentRotation + 360,
      duration: 700,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      setShowMessage('');
      if (newShots.length >= totalShots) {
        endGameWithShots(newShots);
      } else {
        resetForNextShot();
      }
    }, 2000);
  };

  const checkGoal = (finalBallX: number, finalBallY: number, shotTargetX: number) => {
    const goalLeft = SCREEN_WIDTH / 2 - GOAL_WIDTH / 2;
    const goalRight = SCREEN_WIDTH / 2 + GOAL_WIDTH / 2;
    const goalTop = SCREEN_HEIGHT * 0.3;
    const goalBottom = goalTop + GOAL_HEIGHT;

    let result: ShotResult;
    
    if (finalBallX < goalLeft || finalBallX > goalRight || finalBallY < goalTop || finalBallY > goalBottom) {
      result = 'missed';
      setShowMessage('WIDE!');
    } else {
      result = 'goal';
      setShowMessage('GOOOAL!');
      
      console.log('⚽ GOAL! Playing sounds...');
      if (soundEnabled && goalSound.current) {
        goalSound.current.setPositionAsync(0).then(() => {
          return goalSound.current?.playAsync();
        }).catch(err => console.error('❌ Goal sound error:', err));
      } else if (!soundEnabled) {
        console.log('🔇 Sound is disabled');
      } else {
        console.warn('⚠️ Goal sound not loaded');
      }
      
      if (soundEnabled && cheerSound.current) {
        setTimeout(() => {
          cheerSound.current?.setPositionAsync(0).then(() => {
            return cheerSound.current?.playAsync();
          }).catch(err => console.error('❌ Cheer sound error:', err));
        }, 500);
      } else if (!soundEnabled) {
        console.log('🔇 Sound is disabled');
      } else {
        console.warn('⚠️ Cheer sound not loaded');
      }
    }

    const newShots = [...shots, { result, attempt: shots.length + 1 }];
    console.log('CheckGoal - Adding shot:', { result, attempt: shots.length + 1 });
    console.log('CheckGoal - New shots array:', newShots);
    setShots(newShots);
    
    setTimeout(() => {
      setShowMessage('');
      if (newShots.length >= totalShots) {
        endGameWithShots(newShots);
      } else {
        resetForNextShot();
      }
    }, 1500);
  };

  const startKeeperIdleMovement = useCallback(() => {
    if (keeperIdleAnimation.current) {
      keeperIdleAnimation.current.stop();
    }
    
    keeperIdleAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(keeperX, {
          toValue: -15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(keeperX, {
          toValue: 15,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(keeperX, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    
    keeperIdleAnimation.current.start();
  }, [keeperX]);

  const stopKeeperIdleMovement = useCallback(() => {
    if (keeperIdleAnimation.current) {
      keeperIdleAnimation.current.stop();
      keeperIdleAnimation.current = null;
    }
  }, []);

  const resetForNextShot = () => {
    setGameState('aiming');
    setArrowAngle(0);
    
    ballX.setValue(0);
    ballY.setValue(0);
    ballScale.setValue(1);
    ballRotation.setValue(0);
    ballBounce.setValue(0);
    arrowOpacity.setValue(1);
    keeperX.setValue(0);
    keeperY.setValue(0);
    setKeeperPosition('center');
    
    setTimeout(() => {
      startKeeperIdleMovement();
    }, 500);
  };

  const endGameWithShots = (finalShots: Shot[]) => {
    console.log('EndGameWithShots - Final shots:', finalShots);
    console.log('EndGameWithShots - Total shots taken:', finalShots.length);
    
    const goals = finalShots.filter(s => s.result === 'goal').length;
    const saves = finalShots.filter(s => s.result === 'saved').length;
    
    console.log('EndGameWithShots - Goals scored:', goals);
    console.log('EndGameWithShots - Saves made:', saves);
    
    let message = '';
    let extraShots = 0;
    
    if (goals > saves) {
      message = `YOU WIN! ${goals} GOALS vs ${saves} SAVES!`;
    } else if (goals === saves) {
      message = `TIE GAME! ${goals}-${saves} - SUDDEN DEATH!`;
      extraShots = 1;
    } else {
      message = `KEEPER WINS! ${saves} SAVES vs ${goals} GOALS`;
    }
    
    console.log('EndGameWithShots - Final message:', message);
    setShowMessage(message);
    setGameState('gameOver');
    
    if (extraShots > 0) {
      setTimeout(() => {
        setTotalShots(totalShots + extraShots);
        resetForNextShot();
      }, 2000);
    }
  };

  const restartGame = () => {
    const goals = shots.filter(s => s.result === 'goal').length;
    const saves = shots.filter(s => s.result === 'saved').length;
    const won = goals > saves;
    
    console.log('Game ended - Won:', won, 'Goals:', goals, 'Saves:', saves, 'Total games:', totalGamesPlayed, 'Consecutive wins:', consecutiveWins);
    
    setTotalGamesPlayed(prev => prev + 1);
    setConsecutiveWins(won ? consecutiveWins + 1 : 0);
    
    console.log('Updated stats - Total games will be:', totalGamesPlayed + 1, 'Last game won:', won);
    
    setShots([]);
    setTotalShots(5);
    setShowMessage('');
    stopKeeperIdleMovement();
    resetForNextShot();
  };

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          const savedSettings = await AsyncStorage.getItem('gameSettings');
          if (savedSettings && typeof savedSettings === 'string' && savedSettings.trim()) {
            try {
              const trimmed = savedSettings.trim();
              if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                const settings = JSON.parse(trimmed);
                
                if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
                  if (settings.viewMode && ['day', 'night', 'rain'].includes(settings.viewMode)) {
                    setViewMode(settings.viewMode);
                    console.log('View mode updated to:', settings.viewMode);
                  }
                  if (settings.difficulty && ['easy', 'medium', 'hard'].includes(settings.difficulty)) {
                    setDifficulty(settings.difficulty);
                    console.log('Difficulty updated to:', settings.difficulty);
                  }
                  if (typeof settings.soundEnabled === 'boolean') {
                    setSoundEnabled(settings.soundEnabled);
                    console.log('Sound enabled updated to:', settings.soundEnabled);
                  }
                  console.log('Settings loaded successfully:', settings);
                } else {
                  console.log('Invalid settings format, using defaults');
                  await AsyncStorage.removeItem('gameSettings');
                }
              } else {
                console.log('Invalid JSON format, clearing storage');
                await AsyncStorage.removeItem('gameSettings');
              }
            } catch (parseError) {
              console.log('Settings parsing error, clearing corrupted settings:', parseError);
              await AsyncStorage.removeItem('gameSettings');
            }
          }
        } catch (error) {
          console.log('AsyncStorage error, using defaults:', error);
          try {
            await AsyncStorage.removeItem('gameSettings');
          } catch (clearError) {
            console.log('Could not clear corrupted settings:', clearError);
          }
        }
      };
      loadSettings();
      
      if (soundEnabled && crowdSound.current) {
        console.log('🔊 Starting crowd sound...');
        crowdSound.current.playAsync().catch(err => console.log('Could not play crowd sound:', err));
      }
      
      return () => {
        if (crowdSound.current) {
          console.log('🔇 Pausing crowd sound...');
          crowdSound.current.pauseAsync().catch(() => {});
        }
      };
    }, [soundEnabled])
  );

  useEffect(() => {
    const setupAudio = async () => {
      try {
        console.log('🔊 Setting up audio mode...');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio mode configured');

        console.log('🔊 Loading crowd sound...');
        try {
          const { sound: crowd } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3' },
            { isLooping: true, volume: 0.3, shouldPlay: false }
          );
          crowdSound.current = crowd;
          console.log('✅ Crowd sound loaded');
        } catch (err) {
          console.warn('⚠️ Could not load crowd sound:', err);
        }

        console.log('🔊 Loading goal commentator sound...');
        try {
          const { sound: goal } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3' },
            { volume: 0.8, shouldPlay: false }
          );
          goalSound.current = goal;
          console.log('✅ Goal commentator sound loaded');
        } catch (err) {
          console.warn('⚠️ Could not load goal sound:', err);
        }

        console.log('🔊 Loading crowd cheer sound...');
        try {
          const { sound: cheer } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' },
            { volume: 0.6, shouldPlay: false }
          );
          cheerSound.current = cheer;
          console.log('✅ Crowd cheer sound loaded');
        } catch (err) {
          console.warn('⚠️ Could not load cheer sound:', err);
        }

        console.log('🔊 Loading block sound...');
        try {
          const { sound: block } = await Audio.Sound.createAsync(
            { uri: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3' },
            { volume: 0.7, shouldPlay: false }
          );
          blockSound.current = block;
          console.log('✅ Block sound loaded');
        } catch (err) {
          console.warn('⚠️ Could not load block sound:', err);
        }

        console.log('🎉 Audio setup complete!');
      } catch (error) {
        console.error('❌ Audio setup error:', error);
      }
    };

    setupAudio();

    return () => {
      console.log('🔇 Cleaning up audio...');
      if (crowdSound.current) {
        crowdSound.current.unloadAsync().catch(() => {});
      }
      if (goalSound.current) {
        goalSound.current.unloadAsync().catch(() => {});
      }
      if (cheerSound.current) {
        cheerSound.current.unloadAsync().catch(() => {});
      }
      if (blockSound.current) {
        blockSound.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'rain') {
      if (rainAnimations.length === 0) {
        for (let i = 0; i < 50; i++) {
          rainAnimations.push(new Animated.Value(-20));
        }
      }
      
      const animations = rainAnimations.map((rainDrop, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(rainDrop, {
              toValue: SCREEN_HEIGHT + 20,
              duration: 1000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(rainDrop, {
              toValue: -20,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        );
      });
      
      animations.forEach((animation, index) => {
        setTimeout(() => animation.start(), Math.random() * 2000);
      });
      
      return () => {
        animations.forEach(animation => animation.stop());
      };
    }
  }, [viewMode, rainAnimations]);

  useEffect(() => {
    if (soundEnabled && crowdSound.current) {
      crowdSound.current.playAsync().catch(err => console.log('Could not play crowd sound:', err));
    } else if (!soundEnabled && crowdSound.current) {
      crowdSound.current.pauseAsync().catch(() => {});
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (gameState === 'aiming') {
      const interval = setInterval(() => {
        const oscillation = Math.sin(Date.now() / 500) * 30;
        setArrowAngle(oscillation);
      }, 50);
      
      const timeout = setTimeout(() => {
        startKeeperIdleMovement();
      }, 500);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
        stopKeeperIdleMovement();
      };
    } else {
      stopKeeperIdleMovement();
    }
  }, [gameState, startKeeperIdleMovement, stopKeeperIdleMovement]);

  const goals = shots.filter(s => s.result === 'goal').length;

  const getGradientColors = (): [string, string, string] => {
    switch (viewMode) {
      case 'night':
        return ['#0a1a2e', '#16213e', '#1a2332'];
      case 'rain':
        return ['#2c3e50', '#34495e', '#4a5f7a'];
      default:
        return ['#1a5f3f', '#2d8659', '#4CAF50'];
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={getGradientColors()}
        style={StyleSheet.absoluteFillObject}
      />
      
      {viewMode === 'rain' && rainAnimations.length > 0 && (
        <View style={styles.rainContainer} pointerEvents="none">
          {rainAnimations.map((rainDrop, i) => (
            <Animated.View
              key={i}
              style={[
                styles.rainDrop,
                {
                  left: `${(i * 7) % 100}%`,
                  opacity: 0.3 + (i % 3) * 0.2,
                  transform: [{ translateY: rainDrop }],
                }
              ]}
            />
          ))}
        </View>
      )}
      
      {viewMode === 'night' && (
        <View style={styles.starsContainer}>
          {[...Array(30)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.star,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 40}%`,
                  opacity: 0.4 + Math.random() * 0.6,
                }
              ]}
            />
          ))}
        </View>
      )}
      
      <View style={[styles.stadium, viewMode === 'night' && styles.stadiumNight]}>
        <View style={styles.crowd}>
          {[...Array(20)].map((_, i) => {
            const crowdColors = viewMode === 'night' 
              ? ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'].map(color => color + '80')
              : ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf'];
            
            return (
              <View
                key={i}
                style={[
                  styles.crowdDot,
                  {
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: crowdColors[i % 4],
                  },
                ]}
              />
            );
          })}
        </View>
        
        {viewMode === 'night' && (
          <View style={styles.stadiumLights}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stadiumLight,
                  {
                    left: `${15 + i * 14}%`,
                  }
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.settingsButton, { top: insets.top + 20 }]}
        onPress={() => router.push('/settings')}
      >
        <Settings size={24} color="#FFE66D" />
      </TouchableOpacity>

      <View style={[styles.scoreboard, { top: insets.top + 20 }]}>
        <View style={styles.scorePanel}>
          <Text style={styles.scoreTitle}>PENALTY SHOOTOUT'85</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>GOALS:</Text>
            <Text style={styles.scoreValue}>{goals}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>SAVES:</Text>
            <Text style={styles.scoreValue}>{shots.filter(s => s.result === 'saved').length}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>REMAINING:</Text>
            <Text style={styles.scoreValue}>{totalShots - shots.length}</Text>
          </View>
        </View>
        
        <View style={styles.shotsIndicator}>
          {[...Array(totalShots)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.shotDot,
                i < shots.length && {
                  backgroundColor: shots[i].result === 'goal' ? '#4CAF50' : '#f44336',
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.goalContainer}>
        <View style={[styles.goal, viewMode === 'night' && styles.goalNight]}>
          <View style={styles.goalNet}>
            {[...Array(12)].map((_, i) => (
              <View 
                key={`h-${i}`} 
                style={[
                  styles.netLineHorizontal,
                  { 
                    top: `${(i + 1) * 8}%`,
                    opacity: 0.3 - (i * 0.02),
                  }
                ]} 
              />
            ))}
            {[...Array(14)].map((_, i) => (
              <View 
                key={`v-${i}`} 
                style={[
                  styles.netLineVertical,
                  { 
                    left: `${(i + 1) * 7}%`,
                    opacity: 0.3 - (i * 0.02),
                  }
                ]} 
              />
            ))}
            {[...Array(8)].map((_, i) => (
              <View
                key={`d1-${i}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${i * 14}%`,
                  width: 1,
                  height: '141%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  transform: [{ rotate: '45deg' }],
                  transformOrigin: 'top left',
                }}
              />
            ))}
            {[...Array(8)].map((_, i) => (
              <View
                key={`d2-${i}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: `${i * 14}%`,
                  width: 1,
                  height: '141%',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  transform: [{ rotate: '-45deg' }],
                  transformOrigin: 'top right',
                }}
              />
            ))}
          </View>
          
          <Animated.View
            style={[
              styles.goalkeeper,
              {
                transform: [
                  { translateX: keeperX },
                  { translateY: keeperY },
                ],
              },
            ]}
          >
            <View style={styles.keeperHead}>
              <View style={styles.keeperHair} />
              <View style={styles.keeperHairSideLeft} />
              <View style={styles.keeperHairSideRight} />
              <View style={styles.keeperEyeLeft} />
              <View style={styles.keeperEyeRight} />
            </View>
            
            <View style={styles.keeperBody}>
              <View style={styles.keeperArmLeft}>
                <View style={styles.keeperGloveLeft} />
              </View>
              <View style={styles.keeperArmRight}>
                <View style={styles.keeperGloveRight} />
              </View>
            </View>
            
            <View style={styles.keeperLegs}>
              <View style={styles.keeperLegLeft}>
                <View style={styles.keeperShoeLeft} />
              </View>
              <View style={styles.keeperLegRight}>
                <View style={styles.keeperShoeRight} />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.ball,
          {
            transform: [
              { translateX: ballX },
              { translateY: Animated.add(ballY, ballBounce) },
              { scale: ballScale },
              { rotate: Animated.add(ballRotation, Animated.modulo(ballRotation, 360)).interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })},
            ],
          },
        ]}
      >
        <Text style={styles.ballEmoji}>⚽</Text>
      </Animated.View>

      {gameState === 'aiming' && (
        <Animated.View
          style={[
            styles.arrowContainer,
            {
              opacity: arrowOpacity,
              transform: [{ rotate: `${arrowAngle}deg` }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.arrow}>
            <View style={styles.arrowShaft} />
            <ArrowUp size={50} color="#FFE66D" strokeWidth={3} />
          </View>
          <View style={styles.arrowBase}>
            <View style={styles.arrowBaseDot} />
          </View>
        </Animated.View>
      )}

      {showMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{showMessage}</Text>
        </View>
      )}

      <View style={[styles.controls, { bottom: insets.bottom + 70 }]}>
        {gameState === 'aiming' && (
          <TouchableOpacity style={styles.shootButton} onPress={handleTap}>
            <Text style={styles.shootButtonText}>
              {tapCount === 0 ? 'TAP TWICE TO SHOOT' : 'TAP AGAIN!'}
            </Text>
          </TouchableOpacity>
        )}
        
        {gameState === 'gameOver' && (
          <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
            <RotateCcw size={24} color="#fff" />
            <Text style={styles.restartButtonText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomMenu, { bottom: insets.bottom + 10 }]}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push('/settings?section=stadium')}
        >
          <Text style={styles.menuButtonTitle}>FIELD CONDITIONS</Text>
        </TouchableOpacity>
        
        <View style={styles.menuDivider} />
        
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push('/settings?section=difficulty')}
        >
          <Text style={styles.menuButtonTitle}>LEVEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a5f3f',
  },
  stadium: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  crowd: {
    flex: 1,
    position: 'relative',
  },
  crowdDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  scoreboard: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  scorePanel: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFE66D',
    marginBottom: 10,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFE66D',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  shotsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shotDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#FFE66D',
  },
  goalContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH / 2 - GOAL_WIDTH / 2,
    width: GOAL_WIDTH,
    height: GOAL_HEIGHT,
  },
  goal: {
    flex: 1,
    borderWidth: 4,
    borderColor: '#fff',
    borderBottomWidth: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  goalNet: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  netLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    top: '12.5%',
  },
  netLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    left: '10%',
  },
  goalkeeper: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -KEEPER_WIDTH / 2,
    width: KEEPER_WIDTH,
    height: KEEPER_HEIGHT,
  },
  keeperHead: {
    width: 20,
    height: 20,
    backgroundColor: '#D4A574',
    alignSelf: 'center',
    marginBottom: 1,
    position: 'relative',
  },
  keeperHair: {
    position: 'absolute',
    top: -3,
    left: -2,
    right: -2,
    height: 10,
    backgroundColor: '#3D2817',
    borderRadius: 2,
  },
  keeperHairSideLeft: {
    position: 'absolute',
    top: 6,
    left: -4,
    width: 5,
    height: 16,
    backgroundColor: '#3D2817',
  },
  keeperHairSideRight: {
    position: 'absolute',
    top: 6,
    right: -4,
    width: 5,
    height: 16,
    backgroundColor: '#3D2817',
  },
  keeperEyeLeft: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#000',
    left: 4,
    top: 9,
  },
  keeperEyeRight: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#000',
    right: 4,
    top: 9,
  },
  keeperBody: {
    width: 32,
    height: 34,
    backgroundColor: '#FF1493',
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keeperArmLeft: {
    position: 'absolute',
    width: 8,
    height: 24,
    backgroundColor: '#FF1493',
    left: -9,
    top: 3,
  },
  keeperArmRight: {
    position: 'absolute',
    width: 8,
    height: 24,
    backgroundColor: '#FF1493',
    right: -9,
    top: 3,
  },
  keeperLegs: {
    width: 32,
    height: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  keeperLegLeft: {
    width: 10,
    height: 36,
    backgroundColor: '#FF1493',
    position: 'relative',
  },
  keeperLegRight: {
    width: 10,
    height: 36,
    backgroundColor: '#FF1493',
    position: 'relative',
  },
  keeperGloveLeft: {
    width: 11,
    height: 11,
    backgroundColor: '#FFE033',
    position: 'absolute',
    bottom: -3,
    left: -2,
  },
  keeperGloveRight: {
    width: 11,
    height: 11,
    backgroundColor: '#FFE033',
    position: 'absolute',
    bottom: -3,
    right: -2,
  },
  keeperShoeLeft: {
    width: 12,
    height: 7,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    bottom: 0,
    left: -1,
  },
  keeperShoeRight: {
    width: 12,
    height: 7,
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    bottom: 0,
    right: -1,
  },
  ball: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - BALL_SIZE / 2,
    top: SCREEN_HEIGHT * 0.7,
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  ballEmoji: {
    fontSize: BALL_SIZE - 2,
    textAlign: 'center',
    lineHeight: BALL_SIZE - 2,
  },

  arrowContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.25,
    left: SCREEN_WIDTH / 2 - 75,
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  arrowShaft: {
    position: 'absolute',
    bottom: -40,
    width: 4,
    height: 80,
    backgroundColor: '#FFE66D',
  },
  arrowBase: {
    position: 'absolute',
    bottom: -50,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 230, 109, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFE66D',
  },
  messageContainer: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFE66D',
  },
  messageText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFE66D',
    textAlign: 'center',
    letterSpacing: 2,
  },
  controls: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  shootButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFE66D',
  },
  shootButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFE66D',
    gap: 10,
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  settingsButton: {
    position: 'absolute',
    right: 20,
    zIndex: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFE66D',
  },

  rainContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  rainDrop: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(173, 216, 230, 0.6)',
    borderRadius: 1,
    transform: [{ rotate: '15deg' }],
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
    zIndex: 1,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#FFE66D',
    borderRadius: 1.5,
  },
  stadiumNight: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  stadiumLights: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 30,
    flexDirection: 'row',
  },
  stadiumLight: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#FFE66D',
    borderRadius: 10,
    shadowColor: '#FFE66D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  goalNight: {
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 3,
    borderTopColor: '#FFE66D',
  },
  menuButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFE66D',
    letterSpacing: 1,
  },
  menuDivider: {
    width: 2,
    backgroundColor: '#FFE66D',
  },
});
