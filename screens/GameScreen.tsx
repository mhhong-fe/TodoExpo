import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  PanResponder,
  Animated,
  Alert,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLS = 20;
const GRID_ROWS = 20;
const GRID_SIZE = SCREEN_WIDTH - 32;
const CELL = Math.floor(GRID_SIZE / GRID_COLS);

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = [number, number]; // [row, col]

const OPPOSITE: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const MOVE: Record<Dir, Pos> = { UP: [-1, 0], DOWN: [1, 0], LEFT: [0, -1], RIGHT: [0, 1] };

const SPEEDS = [
  { label: '慢', ms: 250 },
  { label: '中', ms: 150 },
  { label: '快', ms: 80 },
];

function randFood(snake: Pos[]): Pos {
  let pos: Pos;
  do {
    pos = [Math.floor(Math.random() * GRID_ROWS), Math.floor(Math.random() * GRID_COLS)];
  } while (snake.some(([r, c]) => r === pos[0] && c === pos[1]));
  return pos;
}

const INIT_SNAKE: Pos[] = [[10, 10], [10, 9], [10, 8]];
const INIT_DIR: Dir = 'RIGHT';

export default function GameScreen() {
  const [snake, setSnake] = useState<Pos[]>(INIT_SNAKE);
  const [food, setFood] = useState<Pos>(randFood(INIT_SNAKE));
  const [dir, setDir] = useState<Dir>(INIT_DIR);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);

  // Refs 用于 setInterval 闭包内访问最新状态
  const snakeRef = useRef(INIT_SNAKE);
  const dirRef = useRef<Dir>(INIT_DIR);
  const foodRef = useRef<Pos>(randFood(INIT_SNAKE));
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);

  // 闪烁动画（食物）
  const foodAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(foodAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(foodAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, [foodAnim]);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;
    const [dr, dc] = MOVE[dirRef.current];
    const [hr, hc] = snakeRef.current[0];
    const newHead: Pos = [hr + dr, hc + dc];

    // 撞墙
    if (newHead[0] < 0 || newHead[0] >= GRID_ROWS || newHead[1] < 0 || newHead[1] >= GRID_COLS) {
      gameOverRef.current = true;
      setGameOver(true);
      setRunning(false);
      setBest((prev) => Math.max(prev, scoreRef.current));
      return;
    }
    // 撞自身（排除尾巴，因为尾巴会移走）
    if (snakeRef.current.slice(0, -1).some(([r, c]) => r === newHead[0] && c === newHead[1])) {
      gameOverRef.current = true;
      setGameOver(true);
      setRunning(false);
      setBest((prev) => Math.max(prev, scoreRef.current));
      return;
    }

    let newSnake: Pos[] = [newHead, ...snakeRef.current];
    const ateFood = newHead[0] === foodRef.current[0] && newHead[1] === foodRef.current[1];

    if (ateFood) {
      const newFood = randFood(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
      scoreRef.current += 10;
      setScore(scoreRef.current);
    } else {
      newSnake = newSnake.slice(0, -1);
    }

    snakeRef.current = newSnake;
    setSnake([...newSnake]);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const interval = setInterval(tick, SPEEDS[speedIdx].ms);
    return () => clearInterval(interval);
  }, [running, gameOver, tick, speedIdx]);

  const changeDir = useCallback((newDir: Dir) => {
    if (OPPOSITE[newDir] === dirRef.current) return; // 禁止反向
    dirRef.current = newDir;
    setDir(newDir);
  }, []);

  const resetGame = useCallback(() => {
    const initSnake: Pos[] = [[10, 10], [10, 9], [10, 8]];
    const initFood = randFood(initSnake);
    snakeRef.current = initSnake;
    dirRef.current = INIT_DIR;
    foodRef.current = initFood;
    gameOverRef.current = false;
    scoreRef.current = 0;
    setSnake(initSnake);
    setDir(INIT_DIR);
    setFood(initFood);
    setScore(0);
    setGameOver(false);
    setRunning(false);
  }, []);

  // 滑动手势
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        const { dx, dy } = gestureState;
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          changeDir(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          changeDir(dy > 0 ? 'DOWN' : 'UP');
        }
      },
    })
  ).current;

  // 蛇身颜色渐变
  const snakeColor = (i: number) => {
    if (i === 0) return '#6C63FF'; // 蛇头
    const ratio = i / snake.length;
    const r = Math.round(108 + (76 - 108) * ratio);
    const g = Math.round(99 + (175 - 99) * ratio);
    const b = Math.round(255 + (80 - 255) * ratio);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 顶部信息 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎮 贪吃蛇</Text>
        <View style={styles.headerRight}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>分数</Text>
            <Text style={styles.scoreVal}>{score}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>最高</Text>
            <Text style={[styles.scoreVal, { color: '#FF9800' }]}>{best}</Text>
          </View>
        </View>
      </View>

      {/* 速度选择 */}
      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>速度：</Text>
        {SPEEDS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.speedBtn, speedIdx === i && styles.speedBtnActive]}
            onPress={() => { if (!running) setSpeedIdx(i); }}>
            <Text style={[styles.speedBtnText, speedIdx === i && styles.speedBtnTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 游戏区域 */}
      <View style={styles.gridContainer} {...panResponder.panHandlers}>
        <View style={[styles.grid, { width: GRID_COLS * CELL, height: GRID_ROWS * CELL }]}>
          {/* 网格背景线 */}
          {Array.from({ length: GRID_ROWS }).map((_, r) =>
            Array.from({ length: GRID_COLS }).map((_, c) => (
              <View
                key={`${r}-${c}`}
                style={[styles.gridCell, { top: r * CELL, left: c * CELL, width: CELL, height: CELL }]}
              />
            ))
          )}

          {/* 食物 */}
          <Animated.View
            style={[
              styles.food,
              { top: food[0] * CELL + 1, left: food[1] * CELL + 1, width: CELL - 2, height: CELL - 2, opacity: foodAnim },
            ]}
          />

          {/* 蛇 */}
          {snake.map(([r, c], i) => (
            <View
              key={`snake-${i}`}
              style={[
                styles.snakeCell,
                { top: r * CELL + 1, left: c * CELL + 1, width: CELL - 2, height: CELL - 2, backgroundColor: snakeColor(i) },
                i === 0 && styles.snakeHead,
              ]}
            />
          ))}

          {/* 游戏结束遮罩 */}
          {gameOver && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>游戏结束</Text>
              <Text style={styles.overlayScore}>得分：{score}</Text>
              <TouchableOpacity style={styles.overlayBtn} onPress={resetGame}>
                <Text style={styles.overlayBtnText}>重新开始</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 未开始遮罩 */}
          {!running && !gameOver && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>贪吃蛇</Text>
              <Text style={styles.overlayHint}>滑动屏幕或使用方向键控制</Text>
              <TouchableOpacity style={styles.overlayBtn} onPress={() => setRunning(true)}>
                <Text style={styles.overlayBtnText}>开始游戏</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 方向控制 D-Pad */}
      <View style={styles.dpad}>
        <TouchableOpacity style={[styles.dpadBtn, styles.dpadUp]} onPress={() => changeDir('UP')}>
          <Text style={styles.dpadText}>▲</Text>
        </TouchableOpacity>
        <View style={styles.dpadMiddle}>
          <TouchableOpacity style={[styles.dpadBtn, styles.dpadLeft]} onPress={() => changeDir('LEFT')}>
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadCenter]}
            onPress={() => running ? setRunning(false) : (gameOver ? resetGame() : setRunning(true))}>
            <Text style={styles.dpadCenterText}>
              {running ? '⏸' : gameOver ? '🔄' : '▶'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dpadBtn, styles.dpadRight]} onPress={() => changeDir('RIGHT')}>
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.dpadBtn, styles.dpadDown]} onPress={() => changeDir('DOWN')}>
          <Text style={styles.dpadText}>▼</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D0D1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerRight: { flexDirection: 'row', gap: 12 },
  scoreBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  scoreLabel: { fontSize: 10, color: '#aaa', fontWeight: '500' },
  scoreVal: { fontSize: 20, fontWeight: '800', color: '#6C63FF', fontVariant: ['tabular-nums'] },
  speedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  speedLabel: { color: '#aaa', fontSize: 13, marginRight: 8 },
  speedBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#333', marginRight: 6 },
  speedBtnActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  speedBtnText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
  speedBtnTextActive: { color: '#fff' },
  gridContainer: { alignItems: 'center', marginVertical: 4 },
  grid: { backgroundColor: '#0A0A1A', borderWidth: 2, borderColor: '#2A2A4A', position: 'relative', borderRadius: 4, overflow: 'hidden' },
  gridCell: { position: 'absolute', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.03)' },
  food: { position: 'absolute', backgroundColor: '#FF4757', borderRadius: 3 },
  snakeCell: { position: 'absolute', borderRadius: 3 },
  snakeHead: { borderRadius: 4 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', gap: 10 },
  overlayTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  overlayScore: { fontSize: 18, color: '#FF9800', fontWeight: '600' },
  overlayHint: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingHorizontal: 30 },
  overlayBtn: { marginTop: 10, backgroundColor: '#6C63FF', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 30 },
  overlayBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // D-Pad
  dpad: { alignItems: 'center', marginTop: 8 },
  dpadMiddle: { flexDirection: 'row', alignItems: 'center' },
  dpadBtn: { width: 54, height: 54, backgroundColor: 'rgba(108,99,255,0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 4, borderWidth: 1, borderColor: 'rgba(108,99,255,0.3)' },
  dpadUp: {},
  dpadDown: {},
  dpadLeft: {},
  dpadRight: {},
  dpadCenter: { backgroundColor: 'rgba(108,99,255,0.3)', width: 58, height: 58, borderRadius: 29 },
  dpadText: { fontSize: 20, color: '#6C63FF' },
  dpadCenterText: { fontSize: 22 },
});
