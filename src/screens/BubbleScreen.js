import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  PanResponder,
  Easing,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playSound } from '../utils/SoundManager';
import { AuthContext } from '../context/AuthContext';
import { GameContext, GAME_IDS } from '../context/GameContext';

const { width, height } = Dimensions.get('window');

// --- ULTRA MODERN OYUN AYARLARI ---
const BUBBLE_SIZE = Math.floor(width / 8.5); 
const ROW_HEIGHT = BUBBLE_SIZE * 0.866; // Petek dizilimi yüksekliği
const GRID_ROWS = 14; 
const GRID_COLS = 8;
const TOP_OFFSET = 60; 
const SHOOTER_X = width / 2;
const SHOOTER_Y = height - 140;
const SPEED = 28; 

// --- NEON CANLI RENKLER ---
const BUBBLE_COLORS = {
  RED: '#FF0055',
  GREEN: '#00FF66',
  BLUE: '#00DDFF',
  YELLOW: '#FFDD00',
  PURPLE: '#BD00FF',
};
const COLOR_LIST = Object.values(BUBBLE_COLORS);

// ÇEVİRİLER
const TRANSLATIONS = {
  TR: {
    title: 'Pito Bubble',
    score: 'PUAN',
    level: 'SEVİYE',
    best: 'REKOR',
    gameOver: 'OYUN BİTTİ!',
    saving: 'Skor Kaydediliyor...',
    saved: 'Puan Hesabına Eklendi! 🏆',
    playAgain: 'TEKRAR OYNA',
    exit: 'Çıkış Yap'
  },
  AU: {
    title: 'Pito Bubble',
    score: 'SCORE',
    level: 'LEVEL',
    best: 'BEST',
    gameOver: 'GAME OVER!',
    saving: 'Saving Score...',
    saved: 'Points Added to Account! 🏆',
    playAgain: 'PLAY AGAIN',
    exit: 'Exit'
  }
};

// --- 3D NEON BALONCUK BİLEŞENİ ---
const Bubble = ({ color, active, isPopping, style }) => {
  const scaleAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPopping) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1.8, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ]).start();
    } else if (active) {
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start();
    }
  }, [isPopping, active]);

  if (!active && !isPopping) return null;

  return (
    <Animated.View style={[styles.bubbleWrapper, style, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <View style={[styles.bubble, { backgroundColor: color, shadowColor: color }]}>
        <View style={styles.bubbleHighlight} />
        <View style={styles.bubbleInnerShadow} />
      </View>
    </Animated.View>
  );
};

const BubbleScreen = ({ navigation }) => {
  const { country } = useContext(AuthContext) || {};
  const { saveGameScore } = useContext(GameContext) || {};
  const t = TRANSLATIONS[country?.code === 'AU' ? 'AU' : 'TR'];

  // --- STATE ---
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);

  // --- HAYATİ REFLER (Closure Bug'ını Çözen Sistem) ---
  const scoreRef = useRef(0); // ✅ Puan kaydetme hatasını düzelten ref
  const bestScoreRef = useRef(0);
  const levelRef = useRef(1);

  const angleRef = useRef(0); 
  const isAnimating = useRef(false);
  const animationFrame = useRef(null);
  const gameOverRef = useRef(false); 
  
  const currentProjectileRef = useRef(COLOR_LIST[0]); 
  const [currentProjectileView, setCurrentProjectileView] = useState(COLOR_LIST[0]); 

  const projectileXY = useRef(new Animated.ValueXY({ x: SHOOTER_X - BUBBLE_SIZE / 2, y: SHOOTER_Y })).current;
  const projPos = useRef({ x: SHOOTER_X - BUBBLE_SIZE / 2, y: SHOOTER_Y });
  const projVel = useRef({ x: 0, y: 0 });
  const currentGrid = useRef([]);

  useEffect(() => {
    loadBestScore();
    resetGame();
    playSound('game_start');
    return () => cancelAnimationFrame(animationFrame.current);
  }, []);

  const loadBestScore = async () => {
    const saved = await AsyncStorage.getItem('pito_bubble_best');
    if (saved) {
      const val = parseInt(saved, 10);
      setBestScore(val);
      bestScoreRef.current = val;
    }
  };

  const getX = (row, col) => col * BUBBLE_SIZE + (row % 2 !== 0 ? BUBBLE_SIZE / 2 : 0);
  const getY = (row) => row * ROW_HEIGHT + TOP_OFFSET;

  // --- OYUNU BAŞLAT / SIFIRLA ---
  const resetGame = () => {
    const newGrid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      let cols = (r % 2 !== 0) ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (r < 4) { 
          newGrid.push({
            id: `b-${r}-${c}`,
            row: r, col: c,
            color: COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)],
            x: getX(r, c), y: getY(r),
            active: true, isPopping: false
          });
        }
      }
    }
    currentGrid.current = newGrid;
    setGrid([...newGrid]);
    loadNextProjectile();
    
    // Değerleri sıfırla
    scoreRef.current = 0;
    levelRef.current = 1;
    setScore(0);
    setLevel(1);
    
    gameOverRef.current = false;
    setIsSaving(false);
    setIsSaved(false);

    projPos.current = { x: SHOOTER_X - BUBBLE_SIZE / 2, y: SHOOTER_Y };
    projectileXY.setValue(projPos.current);
    angleRef.current = 0;
    setRenderTrigger(p => p + 1);
  };

  const loadNextProjectile = () => {
    const nextColor = COLOR_LIST[Math.floor(Math.random() * COLOR_LIST.length)];
    currentProjectileRef.current = nextColor; 
    setCurrentProjectileView(nextColor);      
  };

  // --- DOKUNMATİK VE NİŞAN ALMA ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (isAnimating.current || gameOverRef.current) return;
        const dx = gestureState.moveX - SHOOTER_X;
        const dy = SHOOTER_Y - Math.max(gestureState.moveY, 50); 
        let angle = Math.atan2(dx, dy) * (180 / Math.PI);
        if (angle > 75) angle = 75;
        if (angle < -75) angle = -75;
        angleRef.current = angle; 
        setRenderTrigger(p => p + 1); 
      },
      onPanResponderRelease: () => {
        if (!isAnimating.current && !gameOverRef.current) fireProjectile();
      },
    })
  ).current;

  const fireProjectile = () => {
    isAnimating.current = true;
    playSound('bubble_shoot');
    const rad = angleRef.current * (Math.PI / 180);
    projVel.current = {
      x: Math.sin(rad) * SPEED,
      y: -Math.cos(rad) * SPEED,
    };
    physicsLoop();
  };

  const physicsLoop = () => {
    projPos.current.x += projVel.current.x;
    projPos.current.y += projVel.current.y;

    if (projPos.current.x <= 0) {
      projPos.current.x = 0;
      projVel.current.x *= -1;
    } else if (projPos.current.x >= width - BUBBLE_SIZE) {
      projPos.current.x = width - BUBBLE_SIZE;
      projVel.current.x *= -1;
    }

    let hasCollided = false;
    if (projPos.current.y <= TOP_OFFSET) {
      projPos.current.y = TOP_OFFSET;
      hasCollided = true;
    } else {
      for (let i = 0; i < currentGrid.current.length; i++) {
        const b = currentGrid.current[i];
        if (!b.active) continue;
        const dist = Math.hypot((projPos.current.x + BUBBLE_SIZE/2) - (b.x + BUBBLE_SIZE/2), (projPos.current.y + BUBBLE_SIZE/2) - (b.y + BUBBLE_SIZE/2));
        if (dist < BUBBLE_SIZE - 5) { 
          hasCollided = true;
          break;
        }
      }
    }

    projectileXY.setValue(projPos.current);

    if (hasCollided) {
      snapToGridAndProcess();
    } else {
      animationFrame.current = requestAnimationFrame(physicsLoop);
    }
  };

  const getNeighbors = (r, c) => {
    const isOdd = r % 2 !== 0;
    const offsets = isOdd
      ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]]
      : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    return offsets.map(([dr, dc]) => ({ row: r + dr, col: c + dc }));
  };

  // --- YAPIŞTIRMA VE PATLATMA ---
  const snapToGridAndProcess = () => {
    let bestR = 0, bestC = 0, minDist = Infinity;
    
    for (let r = 0; r < GRID_ROWS; r++) {
      let cols = (r % 2 !== 0) ? GRID_COLS - 1 : GRID_COLS;
      for (let c = 0; c < cols; c++) {
        if (!currentGrid.current.some(b => b.row === r && b.col === c && b.active)) {
          let cx = getX(r, c);
          let cy = getY(r);
          let dist = Math.hypot(cx - projPos.current.x, cy - projPos.current.y);
          if (dist < minDist) {
            minDist = dist;
            bestR = r;
            bestC = c;
          }
        }
      }
    }

    const newBubble = {
      id: `new-${Date.now()}`,
      row: bestR, col: bestC,
      color: currentProjectileRef.current, 
      x: getX(bestR, bestC), y: getY(bestR),
      active: true, isPopping: false
    };

    currentGrid.current.push(newBubble);

    let cluster = [newBubble];
    let queue = [newBubble];
    let visited = new Set([`${newBubble.row},${newBubble.col}`]);

    while (queue.length > 0) {
      let curr = queue.shift();
      let neighbors = getNeighbors(curr.row, curr.col);

      neighbors.forEach(n => {
        let key = `${n.row},${n.col}`;
        if (!visited.has(key)) {
          let neighborBubble = currentGrid.current.find(b => b.row === n.row && b.col === n.col && b.active);
          if (neighborBubble && neighborBubble.color === newBubble.color) {
            visited.add(key);
            cluster.push(neighborBubble);
            queue.push(neighborBubble);
          }
        }
      });
    }

    if (cluster.length >= 3) {
      playSound('bubble_pop');
      let popCount = 0;
      
      currentGrid.current = currentGrid.current.map(b => {
        if (cluster.some(c => c.id === b.id)) {
          popCount++;
          return { ...b, active: false, isPopping: true };
        }
        return b;
      });

      // Skor Güncelleme ✅ Ref kullanarak!
      scoreRef.current += (popCount * 10);
      setScore(scoreRef.current);

      if (Math.floor(scoreRef.current / 300) + 1 > levelRef.current) {
        levelRef.current = Math.floor(scoreRef.current / 300) + 1;
        setLevel(levelRef.current);
        playSound('gamewin');
      }

      removeOrphans(); // Kopanları düşür

    } else {
      playSound('error'); 
      if (bestR >= GRID_ROWS - 1) {
        triggerGameOver();
        return; 
      }
    }

    setGrid([...currentGrid.current]);

    setTimeout(() => {
      currentGrid.current = currentGrid.current.filter(b => b.active);
      setGrid([...currentGrid.current]);

      projPos.current = { x: SHOOTER_X - BUBBLE_SIZE / 2, y: SHOOTER_Y };
      projectileXY.setValue(projPos.current);
      loadNextProjectile();
      isAnimating.current = false;
      setRenderTrigger(p => p + 1);
    }, 250); 
  };

  // --- KOPANLARI (HAVADA ASILI KALANLARI) DÜŞÜRME ---
  const removeOrphans = () => {
    let connected = new Set();
    let queue = [];

    currentGrid.current.forEach(b => {
      if (b.active && b.row === 0 && !b.isPopping) {
        connected.add(b.id);
        queue.push(b);
      }
    });

    while (queue.length > 0) {
      let curr = queue.shift();
      let neighbors = getNeighbors(curr.row, curr.col);
      
      neighbors.forEach(n => {
        let neighborBubble = currentGrid.current.find(b => b.row === n.row && b.col === n.col && b.active && !b.isPopping);
        if (neighborBubble && !connected.has(neighborBubble.id)) {
          connected.add(neighborBubble.id);
          queue.push(neighborBubble);
        }
      });
    }

    let orphanCount = 0;
    currentGrid.current = currentGrid.current.map(b => {
      if (b.active && !b.isPopping && !connected.has(b.id)) {
        orphanCount++;
        return { ...b, active: false, isPopping: true }; 
      }
      return b;
    });

    if (orphanCount > 0) {
      scoreRef.current += (orphanCount * 20); // Düşenler ekstra puan verir ✅
      setScore(scoreRef.current);
    }
  };

  // --- OYUN BİTİŞİ VE EKSİKSİZ KAYIT ---
  const triggerGameOver = async () => {
    gameOverRef.current = true;
    playSound('gameover');
    setRenderTrigger(p => p + 1); 
    
    // ✅ BURASI ÇOK ÖNEMLİ: Final skoru her zaman GÜNCEL ref'ten okunacak
    const finalScore = scoreRef.current;

    if (finalScore > bestScoreRef.current) {
      bestScoreRef.current = finalScore;
      setBestScore(finalScore);
      AsyncStorage.setItem('pito_bubble_best', finalScore.toString());
    }

    // Veritabanına Skoru Kaydet
    if (finalScore > 0 && saveGameScore) {
      setIsSaving(true);
      try {
        await saveGameScore(GAME_IDS?.BUBBLE || '5', finalScore);
        setIsSaved(true);
      } catch (err) {
        console.log("Kayıt Hatası:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // --- LAZER İZİ ---
  const renderTrajectoryLine = () => {
    if (isAnimating.current || gameOverRef.current) return null;
    const dots = [];
    let tx = SHOOTER_X;
    let ty = SHOOTER_Y;
    let rad = angleRef.current * (Math.PI / 180);
    let vx = Math.sin(rad) * (SPEED * 0.8);
    let vy = -Math.cos(rad) * (SPEED * 0.8);

    for (let i = 0; i < 30; i++) { 
      tx += vx;
      ty += vy;

      if (tx <= BUBBLE_SIZE / 2 || tx >= width - BUBBLE_SIZE / 2) vx *= -1; 
      if (ty <= TOP_OFFSET) break; 

      let hit = false;
      for (let b of currentGrid.current) {
        if (b.active && Math.hypot(tx - (b.x + BUBBLE_SIZE/2), ty - (b.y + BUBBLE_SIZE/2)) < BUBBLE_SIZE * 0.9) {
          hit = true; break;
        }
      }
      if (hit) break;

      dots.push(
        <View key={i} style={[styles.trajDot, { left: tx - 4, top: ty - 4, opacity: 1 - (i * 0.03) }]} />
      );
    }
    return dots;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.scoreBoard}>
          <Text style={styles.scoreLabel}>{t.score}</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.levelBadge}>
          <Ionicons name="star" size={14} color="#FFDD00" />
          <Text style={styles.levelText}>{t.level} {level}</Text>
        </View>
      </View>

      {/* OYUN ALANI */}
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        <View style={styles.bgGlow} />

        {renderTrajectoryLine()}

        {grid.map(b => (
          <Bubble key={b.id} color={b.color} active={b.active} isPopping={b.isPopping} style={{ position: 'absolute', left: b.x, top: b.y }} />
        ))}

        <Animated.View style={[styles.projectile, projectileXY.getLayout()]}>
          <Bubble color={currentProjectileView} active={true} />
        </Animated.View>

        {/* NİŞANCI OKU */}
        <View style={styles.shooterContainer}>
          <Animated.View style={[styles.cannonWrap, { transform: [{ rotate: `${angleRef.current}deg` }] }]}>
            <View style={styles.cannonBarrel} />
            <Ionicons name="caret-up" size={30} color="rgba(255,255,255,0.6)" style={{ marginTop: -15 }} />
          </Animated.View>
          <View style={styles.shooterBase}>
             <Bubble color={currentProjectileView} active={true} />
          </View>
        </View>
      </View>

      {/* OYUN BİTİŞ MODALI */}
      <Modal transparent={true} visible={gameOverRef.current} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="skull" size={45} color="#FF0055" />
            </View>
            <Text style={styles.modalTitle}>{t.gameOver}</Text>
            
            <View style={styles.modalScoreRow}>
              <View style={styles.modalScoreCol}>
                <Text style={styles.modalScoreLabel}>{t.score}</Text>
                <Text style={styles.modalScoreValue}>{score}</Text>
              </View>
              <View style={styles.modalScoreDivider} />
              <View style={styles.modalScoreCol}>
                <Text style={styles.modalScoreLabel}>{t.best}</Text>
                <Text style={styles.modalScoreValue}>{bestScore}</Text>
              </View>
            </View>

            {isSaving ? (
              <View style={styles.saveContainer}>
                <ActivityIndicator color="#00DDFF" />
                <Text style={styles.saveText}>{t.saving}</Text>
              </View>
            ) : isSaved ? (
              <Text style={styles.savedSuccessText}>{t.saved}</Text>
            ) : null}

            <TouchableOpacity style={styles.btnPrimary} onPress={resetGame} disabled={isSaving}>
              <Text style={styles.btnText}>{t.playAgain}</Text>
              <Ionicons name="refresh" size={20} color="#0B132B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()} disabled={isSaving}>
              <Text style={styles.btnSecText}>{t.exit}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B132B' }, 
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  iconBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  scoreBoard: { alignItems: 'center' },
  scoreLabel: { color: '#00DDFF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  scoreValue: { color: 'white', fontSize: 28, fontWeight: '900' },
  levelBadge: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,221,0,0.3)' },
  levelText: { color: '#FFDD00', fontWeight: 'bold', marginLeft: 5 },

  gameArea: { flex: 1, overflow: 'hidden' },
  bgGlow: { position: 'absolute', top: '40%', left: '-20%', width: width*1.5, height: width*1.5, borderRadius: 999, backgroundColor: 'rgba(0, 221, 255, 0.05)' },

  bubbleWrapper: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, justifyContent: 'center', alignItems: 'center' },
  bubble: { width: BUBBLE_SIZE - 2, height: BUBBLE_SIZE - 2, borderRadius: BUBBLE_SIZE / 2, elevation: 8, shadowOffset: {width: 0, height: 0}, shadowOpacity: 1, shadowRadius: 8, overflow: 'hidden' },
  bubbleHighlight: { position: 'absolute', top: '10%', left: '15%', width: '35%', height: '25%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 10, transform: [{ rotate: '-45deg' }] },
  bubbleInnerShadow: { position: 'absolute', bottom: -5, right: -5, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: BUBBLE_SIZE/2 },

  projectile: { position: 'absolute', zIndex: 100 },
  trajDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#00DDFF', shadowColor: '#00DDFF', shadowRadius: 5, shadowOpacity: 1, zIndex: 5 },

  shooterContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', zIndex: 10 },
  cannonWrap: { position: 'absolute', bottom: 35, alignItems: 'center', height: 100, justifyContent: 'flex-start' },
  cannonBarrel: { width: 6, height: 70, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 3 },
  shooterBase: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 19, 43, 0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1C2541', borderRadius: 30, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 221, 255, 0.3)' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,0,85,0.1)', justifyContent: 'center', alignItems: 'center', marginTop: -60, marginBottom: 15, borderWidth: 4, borderColor: '#1C2541' },
  modalTitle: { fontSize: 26, fontWeight: '900', color: 'white', marginBottom: 20 },
  modalScoreRow: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 15, paddingVertical: 15, marginBottom: 20 },
  modalScoreCol: { flex: 1, alignItems: 'center' },
  modalScoreLabel: { color: '#00DDFF', fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  modalScoreValue: { color: 'white', fontSize: 32, fontWeight: '900' },
  modalScoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  saveContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  saveText: { color: '#00DDFF', marginLeft: 10, fontWeight: 'bold' },
  savedSuccessText: { color: '#00FF66', fontWeight: 'bold', marginBottom: 15 },
  btnPrimary: { flexDirection: 'row', width: '100%', backgroundColor: '#00DDFF', paddingVertical: 16, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#0B132B', fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  btnSecondary: { width: '100%', paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  btnSecText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 'bold' }
});

export default BubbleScreen;