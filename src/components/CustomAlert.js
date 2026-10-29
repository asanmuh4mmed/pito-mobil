import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', 
    navyBg: '#0B131E', 
};

const CustomAlert = ({ 
    visible, 
    title, 
    message, 
    onCancel, 
    onConfirm, 
    cancelText = "İptal", 
    confirmText = "Tamam", 
    theme,
    iconName = "paw" // Varsayılan ikon pati
}) => {
    return (
        <Modal 
            transparent={true} 
            visible={visible} 
            animationType="fade"
        >
            {/* Arka planı hafif karartan Pito Lacivert katmanı */}
            <View style={styles.overlay}>
                
                {/* Ana Uyarı Kutusu */}
                <View style={[styles.alertBox, { backgroundColor: theme.cardBg }]}>
                    
                    {/* Üstteki Altın İkon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name={iconName} size={40} color={PITO_COLORS.primary} />
                    </View>
                    
                    {/* Başlık ve Mesaj */}
                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: theme.subText }]}>{message}</Text>
                    
                    {/* Butonlar */}
                    <View style={styles.buttonContainer}>
                        {/* Eğer iptal fonksiyonu gönderilmişse İptal butonunu göster */}
                        {onCancel && (
                            <TouchableOpacity style={[styles.button, styles.cancelButton, { borderColor: theme.border }]} onPress={onCancel} activeOpacity={0.8}>
                                <Text style={[styles.cancelButtonText, { color: theme.text }]}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        
                        {/* Tamam / Onay Butonu */}
                        <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm} activeOpacity={0.8}>
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(11, 19, 30, 0.7)', // Pito Navy renginin saydam hali
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertBox: {
        width: '80%',
        borderRadius: 24,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: PITO_COLORS.primary,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    iconContainer: {
        marginBottom: 15,
        backgroundColor: 'rgba(197, 160, 89, 0.15)', // Pito Primary saydam hali
        padding: 15,
        borderRadius: 50,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    confirmButton: {
        backgroundColor: PITO_COLORS.primary,
        elevation: 3,
        shadowColor: PITO_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    cancelButtonText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmButtonText: {
        color: PITO_COLORS.navyBg, // Altın zemin üzerine lacivert metin mükemmel kontrast sağlar
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});

export default CustomAlert;