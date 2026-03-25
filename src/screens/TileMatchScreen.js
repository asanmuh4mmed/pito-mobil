import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { playSound } from '../utils/SoundManager';

const { width } = Dimensions.get('window');

const ICONS = ['🦴', '🐟', '🎾', '🧶', '🐈', '🐶', '🐭', '🐦', '🥩', '🦋', '🐢', '🐞', '🦊', '🐼'];
const TRAY_SIZE = 7; 
const TILE_SIZE = width / 7.5; 
const BOARD_WIDTH = width - 20;
const BOARD_HEIGHT = 450; 
const MAX_LEVEL = 5; // YENİ: Oyunun son seviyesi

const TileMatchScreen = ({ navigation }) => {
    const [tiles, setTiles] = useState([]);
    const [tray, setTray] = useState([]); 
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showTransition, setShowTransition] = useState(false);
    const [transitionBonus, setTransitionBonus] = useState(0); // YENİ: Ekranda gösterilecek bonus puan

    useEffect(() => {
        initGame(level);
    }, [level]);

    const initGame = (currentLevel) => {
        let initialTiles = [];
        
        const iconVariety = Math.min(4 + currentLevel, ICONS.length); 
        const selectedIcons = ICONS.slice(0, iconVariety);

        selectedIcons.forEach(icon => {
            for(let i = 0; i < 3; i++) {
                initialTiles.push({ 
                    id: Math.random().toString(), 
                    icon: icon, 
                    isCollected: false,
                    willHide: false 
                });
            }
        });
        
        for (let i = initialTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [initialTiles[i], initialTiles[j]] = [initialTiles[j], initialTiles[i]];
        }

        const hiddenCount = currentLevel === 1 ? 0 : Math.min(initialTiles.length, (currentLevel - 1) * 3);
        
        for(let i = 0; i < hiddenCount; i++) {
            initialTiles[i].willHide = true;
        }

        for (let i = initialTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [initialTiles[i], initialTiles[j]] = [initialTiles[j], initialTiles[i]];
        }
        
        const maxLayers = Math.min(2 + Math.floor(currentLevel / 2), 6); 
        
        const layeredTiles = initialTiles.map((tile, index) => {
            const zIndex = index % maxLayers; 
            
            const gridX = Math.floor(Math.random() * 6); 
            const gridY = Math.floor(Math.random() * 8); 
            
            const offsetX = (zIndex % 2 === 0) ? 0 : (TILE_SIZE / 2);
            const offsetY = (zIndex % 2 === 0) ? 0 : (TILE_SIZE / 2);

            const x = (gridX * TILE_SIZE) + offsetX;
            const y = (gridY * (TILE_SIZE * 0.8)) + offsetY + 20; 

            return { ...tile, x, y, z: zIndex };
        });

        layeredTiles.sort((a, b) => a.z - b.z);

        setTiles(layeredTiles);
        setTray([]);
        if(currentLevel === 1) setScore(0);
        
        if (hiddenCount > 0) {
            setIsPreviewing(true);
            setTimeout(() => {
                setIsPreviewing(false); 
            }, 3000); 
        } else {
            setIsPreviewing(false);
        }
    };

    const isTileBlocked = (targetTile, allTiles) => {
        const higherTiles = allTiles.filter(t => !t.isCollected && t.z > targetTile.z);
        
        for (let topTile of higherTiles) {
            const isOverlapX = Math.abs(topTile.x - targetTile.x) < (TILE_SIZE * 0.8); 
            const isOverlapY = Math.abs(topTile.y - targetTile.y) < (TILE_SIZE * 0.8);
            
            if (isOverlapX && isOverlapY) return true; 
        }
        return false; 
    };

    const handleTilePress = (clickedTile) => {
        if (isPreviewing || showTransition) return; 

        if (clickedTile.isCollected || tray.length >= TRAY_SIZE) return;
        if (isTileBlocked(clickedTile, tiles)) return;

        playSound('button_click');

        const updatedTiles = tiles.map(t => 
            t.id === clickedTile.id ? { ...t, isCollected: true } : t
        );
        setTiles(updatedTiles);

        const newTray = [...tray, clickedTile];
        newTray.sort((a, b) => a.icon.localeCompare(b.icon));
        
        setTray(newTray);
        checkMatch(newTray, updatedTiles);
    };

    const checkMatch = (currentTray, currentTiles) => {
        const counts = {};
        currentTray.forEach(tile => {
            counts[tile.icon] = (counts[tile.icon] || 0) + 1;
        });

        let matchedIcon = null;
        for (const icon in counts) {
            if (counts[icon] === 3) {
                matchedIcon = icon;
                break;
            }
        }

        if (matchedIcon) {
            setTimeout(() => {
                playSound('match_success');
                // ✨ GÜNCELLEME: Eşleşme başına 5 puan
                setScore(s => s + 5);
                
                setTray(prevTray => prevTray.filter(t => t.icon !== matchedIcon));

                const remainingTiles = currentTiles.filter(t => !t.isCollected).length;
                if (remainingTiles === 0 && currentTray.length === 3) {
                     setTimeout(() => {
                         playSound('jump'); 
                         
                         // ✨ GÜNCELLEME: Seviye atlama bonusu hesaplama
                         const isFinalLevel = level === MAX_LEVEL;
                         const bonus = isFinalLevel ? 100 : 50;
                         setTransitionBonus(bonus);
                         setScore(s => s + bonus);
                         
                         setShowTransition(true); 
                         
                         setTimeout(() => {
                             setShowTransition(false);
                             if (isFinalLevel) {
                                 Alert.alert("OYUN BİTTİ! 🏆", "Zekanla tüm seviyeleri yendin ve 100 Puanlık büyük ödülü kaptın!", [
                                     { text: "Baştan Oyna", onPress: () => { setLevel(1); initGame(1); } }
                                 ]);
                             } else {
                                 setLevel(l => l + 1); 
                             }
                         }, 2500);

                     }, 500);
                }
            }, 300);
            
        } else if (currentTray.length >= TRAY_SIZE) {
            setTimeout(() => {
                playSound('gameover');
                Alert.alert("Hamle Kalmadı!", "Tepsi Doldu. Stratejini baştan kurmalısın! 💥", [
                    { text: "Baştan Başla", onPress: () => { setLevel(1); initGame(1); } }
                ]);
            }, 300);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Ionicons name="close" size={26} color="#334155" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.levelText}>{level === MAX_LEVEL ? 'SON SEVİYE 🔥' : `SEVİYE ${level}`}</Text>
                    <View style={styles.scoreBadge}>
                        <Ionicons name="star" size={16} color="#f59e0b" style={{marginRight: 4}} />
                        <Text style={styles.scoreText}>{score}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => { setLevel(1); initGame(1); }} style={styles.iconBtn}>
                    <Ionicons name="refresh" size={26} color="#334155" />
                </TouchableOpacity>
            </View>

            {isPreviewing && (
                <View style={styles.previewBanner}>
                    <Text style={styles.previewText}>KARTLARI EZBERLE! 👀</Text>
                </View>
            )}

            {/* ✨ GÜNCELLEME: Bonus Puanları Gösteren Geçiş Ekranı */}
            {showTransition && (
                <View style={styles.transitionOverlay}>
                    <View style={styles.transitionBox}>
                        <Text style={styles.transitionEmoji}>🚀</Text>
                        <Text style={styles.transitionTitle}>HARİKA!</Text>
                        <Text style={styles.transitionBonus}>+{transitionBonus} BONUS PUAN</Text>
                        {level !== MAX_LEVEL && <Text style={styles.transitionSub}>Seviye {level + 1} Başlıyor...</Text>}
                    </View>
                </View>
            )}

            <View style={styles.boardContainer}>
                <View style={styles.board}>
                    {tiles.map((tile) => {
                        if (tile.isCollected) return null; 
                        
                        const isBlocked = isTileBlocked(tile, tiles);
                        const showBack = !isPreviewing && tile.willHide;
                        
                        return (
                            <TouchableOpacity 
                                key={tile.id} 
                                style={[
                                    styles.tile, 
                                    { 
                                        left: tile.x, 
                                        top: tile.y, 
                                        zIndex: tile.z,
                                        backgroundColor: isBlocked ? '#e2e8f0' : (showBack ? '#0984e3' : 'white'),
                                        borderColor: isBlocked ? '#cbd5e1' : (showBack ? '#74b9ff' : '#f8fafc'),
                                        shadowOpacity: isBlocked ? 0 : 0.3
                                    }
                                ]}
                                activeOpacity={isBlocked || isPreviewing ? 1 : 0.6}
                                onPress={() => handleTilePress(tile)}
                            >
                                <View style={[styles.tileBottom3D, { backgroundColor: isBlocked ? '#94a3b8' : (showBack ? '#0097e6' : '#cbd5e1') }]} />
                                <Text style={[styles.tileIcon, { opacity: isBlocked && showBack ? 0.2 : (isBlocked ? 0.3 : 1), color: showBack ? 'rgba(255,255,255,0.8)' : 'black' }]}>
                                    {showBack ? '🐾' : tile.icon}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.trayContainer}>
                <View style={styles.trayBackground}>
                     {[...Array(TRAY_SIZE)].map((_, i) => (
                         <View key={`slot-${i}`} style={styles.traySlot} />
                     ))}
                </View>
                
                <View style={styles.trayItems}>
                    {tray.map((tile) => (
                        <View key={`tray-${tile.id}`} style={styles.trayTile}>
                            <View style={[styles.tileBottom3D, { backgroundColor: '#cbd5e1', height: 4, bottom: -4 }]} />
                            <Text style={styles.trayTileIcon}>{tile.icon}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#301955' }, 
    
    header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
    iconBtn: { backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 15, elevation: 5 },
    headerCenter: { alignItems: 'center' },
    levelText: { fontSize: 13, fontWeight: '900', color: '#00cec9', letterSpacing: 2, marginBottom: 5 },
    scoreBadge: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    scoreText: { fontSize: 22, fontWeight: '900', color: 'white' },
    
    previewBanner: { position: 'absolute', top: 100, width: '100%', alignItems: 'center', zIndex: 100 },
    previewText: { backgroundColor: '#e84393', color: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, fontWeight: 'bold', fontSize: 16, elevation: 5, overflow: 'hidden' },

    transitionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(48, 25, 85, 0.9)', zIndex: 200, justifyContent: 'center', alignItems: 'center' },
    transitionBox: { backgroundColor: 'white', padding: 35, borderRadius: 25, alignItems: 'center', elevation: 10, borderWidth: 3, borderColor: '#00cec9' },
    transitionEmoji: { fontSize: 60, marginBottom: 10 },
    transitionTitle: { fontSize: 28, fontWeight: '900', color: '#0984e3', marginBottom: 5 },
    transitionBonus: { fontSize: 22, fontWeight: 'bold', color: '#f59e0b', marginBottom: 15 },
    transitionSub: { fontSize: 16, fontWeight: 'bold', color: '#636e72' },

    boardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT, position: 'relative' },
    
    tile: { 
        position: 'absolute', 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 5,
        elevation: 8,
        borderWidth: 1,
    },
    tileBottom3D: { position: 'absolute', bottom: -5, left: 0, right: 0, height: 5, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
    tileIcon: { fontSize: 26, zIndex: 2 },

    trayContainer: { height: 90, marginBottom: 40, paddingHorizontal: 15, justifyContent: 'center' },
    trayBackground: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 10, position: 'absolute', left: 15, right: 15, height: '100%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
    traySlot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 3, borderRadius: 10 },
    
    trayItems: { flexDirection: 'row', paddingHorizontal: 10, position: 'absolute', left: 15, height: '100%', alignItems: 'center' },
    trayTile: {
        width: (width - 60) / 7 - 6, 
        height: (width - 60) / 7 - 6,
        backgroundColor: 'white',
        marginHorizontal: 3,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        position: 'relative'
    },
    trayTileIcon: { fontSize: 22, zIndex: 2 }
});

export default TileMatchScreen;