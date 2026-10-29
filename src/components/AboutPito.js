import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const COPY = {
  TR: {
    about: 'Pito hakkında', back: 'Geri dön', tag: 'HER PATİNİN BİR HİKÂYESİ VAR',
    headline: 'Bir yuva.\nBir dost.\nYeni bir başlangıç.',
    intro: 'Pito, hayvanlarla insanların yollarını sevgi ve sorumlulukla buluşturmak için doğdu.',
    discover: 'Pito’yu keşfet', storyLabel: 'HİKÂYEMİZ', storyTitle: 'Küçük bir fikir,\nbüyük bir sorumluluk.',
    story: 'Bir hayvanın hayatına dokunmak bazen bir ilanı görmekle, bazen doğru kişiye ulaşmakla başlar. Pito’yu bu ilk adımı kolaylaştırmak için geliştirdim. Amacım; yuva arayan dostlarımızı görünür kılmak ve hayvanseverlerin birbirine ulaşabileceği bir alan oluşturmak.',
    quote: 'Birlikte, daha çok patinin hikâyesine güzel bir başlangıç ekleyebiliriz.',
    explore: 'Birlikte neler yapabiliriz?',
    features: [
      ['heart-outline', 'Bir dosta yuva ol', 'Sahiplendirme ilanlarını keşfet; yaşamını paylaşacağın dostunla tanış.', 'Home'],
      ['medical-outline', 'Yakındaki veterinerleri bul', 'Haritadan veteriner kliniklerini incele ve iletişim bilgilerine ulaş.', 'VetMapScreen'],
      ['people-outline', 'Hikâyeni paylaş', 'Petsgram’da dostunun anlarını paylaş, diğer hayvanseverlerle buluş.', 'Petsgram'],
    ],
    valuesTitle: 'Bizi bir araya getirenler',
    values: [['paw-outline', 'Sorumluluk', 'Sahiplenmek, bir ömür sürecek bakım ve sevgiyi üstlenmektir.'], ['chatbubbles-outline', 'Dayanışma', 'Deneyimlerimizi paylaşarak birbirimize destek olabiliriz.']],
    founderLabel: 'KURUCU & GELİŞTİRİCİ', founderText: 'Ben Muhammed Aşan. Hayvanlara duyduğum sevgiyi yazılımla birleştirerek Pito’yu geliştirdim. Bu yolculukta hedefim, günlük hayatta işe yarayan ve her geri bildirimle daha iyi hâle gelen bir uygulama oluşturmak.',
    brand: 'Fikirden, hayatın içine.', brandText: 'OXPİ Interactive çatısı altında, insanların günlük ihtiyaçlarına odaklanan mobil deneyimler geliştiriyorum. Pito da bu yaklaşımın hayvanseverlerle buluştuğu yer.',
    end: 'İyi ki aynı hikâyedeyiz.', endSub: 'Sevgiyle, tüm patiler için.',
  },
  EN: {
    about: 'About Pito', back: 'Go back', tag: 'EVERY PAW HAS A STORY',
    headline: 'A home.\nA friend.\nA new beginning.',
    intro: 'Pito was born to bring animals and people together through care and responsibility.',
    discover: 'Explore Pito', storyLabel: 'OUR STORY', storyTitle: 'A small idea.\nA lasting commitment.',
    story: 'Making a difference can start with seeing a listing or reaching the right person. I built Pito to make that first step easier: to help animals looking for a home be seen, and give animal lovers a place to connect.',
    quote: 'Together, we can give more paws a brighter beginning.',
    explore: 'What can we do together?',
    features: [
      ['heart-outline', 'Give a friend a home', 'Explore adoption listings and meet a companion to share your life with.', 'Home'],
      ['medical-outline', 'Find nearby vets', 'Explore veterinary clinics on the map and find their contact details.', 'VetMapScreen'],
      ['people-outline', 'Share your story', 'Share your companion’s moments on Petsgram and connect with other animal lovers.', 'Petsgram'],
    ],
    valuesTitle: 'What brings us together',
    values: [['paw-outline', 'Responsibility', 'Adoption means committing to a lifetime of care and love.'], ['chatbubbles-outline', 'Community', 'By sharing our experiences, we can support one another.']],
    founderLabel: 'FOUNDER & DEVELOPER', founderText: 'I’m Muhammed Aşan. I created Pito by bringing together my love of animals and software. My goal is to build an app that helps in everyday life and improves with every piece of feedback.',
    brand: 'From an idea to everyday life.', brandText: 'Under OXPI Interactive, I develop mobile experiences focused on everyday needs. Pito brings that approach to the animal-loving community.',
    end: 'Glad you’re part of the story.', endSub: 'Made with love, for every paw.',
  },
};

export default function AboutPito() {
  const { isDarkMode } = useContext(ThemeContext);
  const { country, language } = useContext(AuthContext);
  const navigation = useNavigation();
  const t = COPY[language === 'EN' || (!language && country?.code === 'AU') ? 'EN' : 'TR'];
  const c = isDarkMode
    ? { bg: '#0B131E', card: '#172332', text: '#F5F2EA', muted: '#B7C0CD', line: '#2C394A', tint: '#282A27' }
    : { bg: '#F8F5EF', card: '#FFFFFF', text: '#162435', muted: '#66717F', line: '#E7E1D7', tint: '#F0E7D4' };
  const back = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');
  return (
    <SafeAreaView style={[s.screen, { backgroundColor: c.bg }]}>
      <View style={s.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.back} onPress={back} style={[s.back, { backgroundColor: c.card, borderColor: c.line }]}>
          <Ionicons name="arrow-back" size={23} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>{t.about}</Text>
        <Ionicons name="paw" size={23} color="#B38D45" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <View pointerEvents="none" accessible={false} style={s.orbit} />
          <View style={s.brandRow}><Ionicons name="paw" size={27} color="#D7B875" /><Text style={s.wordmark}>pito</Text></View>
          <Text style={s.eyebrow}>{t.tag}</Text>
          <Text accessibilityRole="header" style={s.headline}>{t.headline}</Text>
          <Text style={s.heroIntro}>{t.intro}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Home')} activeOpacity={0.8} style={s.heroButton}>
            <Text style={s.heroButtonText}>{t.discover}</Text><Ionicons name="arrow-forward" size={21} color="#142334" />
          </TouchableOpacity>
          <View accessible={false} style={s.heroFoot}><View style={s.smallLine}/><Ionicons name="heart" size={14} color="#D7B875"/><View style={s.smallLine}/></View>
        </View>

        <View style={s.story}>
          <Text style={s.label}>{t.storyLabel}</Text>
          <Text accessibilityRole="header" style={[s.sectionTitle, { color: c.text }]}>{t.storyTitle}</Text>
          <Text style={[s.body, { color: c.muted }]}>{t.story}</Text>
          <View style={[s.quote, { borderColor: '#C5A059', backgroundColor: c.tint }]}>
            <Ionicons name="heart-outline" size={24} color="#B38D45"/>
            <Text style={[s.quoteText, { color: c.text }]}>{t.quote}</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={[s.blockTitle, { color: c.text }]}>{t.explore}</Text>
        {t.features.map(([icon, title, description, route], index) => (
          <TouchableOpacity key={route} accessibilityRole="button" onPress={() => navigation.navigate(route)} activeOpacity={0.75} style={[s.feature, { backgroundColor: c.card, borderColor: c.line }]}>
            <View style={[s.icon, { backgroundColor: c.tint }]}><Ionicons name={icon} size={25} color="#B38D45" /></View>
            <View style={s.flex}><Text style={[s.featureTitle, { color: c.text }]}>{title}</Text><Text style={[s.featureBody, { color: c.muted }]}>{description}</Text></View>
            <Ionicons name="chevron-forward" size={18} color="#B38D45" />
          </TouchableOpacity>
        ))}

        <View style={[s.values, { borderColor: c.line }]}>
          <Text accessibilityRole="header" style={[s.blockTitle, { color: c.text }]}>{t.valuesTitle}</Text>
          {t.values.map(([icon, title, description]) => <View key={title} style={s.valueRow}><Ionicons name={icon} size={22} color="#B38D45"/><View style={s.flex}><Text style={[s.featureTitle, { color: c.text }]}>{title}</Text><Text style={[s.featureBody, { color: c.muted }]}>{description}</Text></View></View>)}
        </View>

        <View style={[s.founder, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={s.founderTop}><View style={s.avatar}><Text style={s.initials}>MA</Text></View><View style={s.flex}><Text style={s.founderLabel}>{t.founderLabel}</Text><Text style={[s.founderName, { color: c.text }]}>Muhammed Aşan</Text></View></View>
          <Text style={[s.body, { color: c.muted }]}>{t.founderText}</Text>
          <View style={[s.signature, { borderColor: c.line }]}><Text style={[s.signatureText, { color: c.text }]}>Muhammed Aşan</Text><Ionicons name="paw-outline" size={23} color="#B38D45" /></View>
        </View>

        <View style={s.oxpi}>
          <View style={s.brandRow}><View style={s.codeIcon}><Ionicons name="code-slash" size={25} color="#D7B875"/></View><Text style={s.oxpiName}>OXPİ Interactive</Text></View>
          <Text style={s.oxpiTitle}>{t.brand}</Text><Text style={s.oxpiBody}>{t.brandText}</Text>
        </View>
        <View style={s.footer}><Ionicons name="paw" size={25} color="#B38D45"/><Text style={[s.end, { color: c.text }]}>{t.end}</Text><Text style={[s.endSub, { color: c.muted }]}>{t.endSub}</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  back: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '800' },
  scroll: { padding: 20, paddingTop: 10, paddingBottom: 32, width: '100%', maxWidth: 680, alignSelf: 'center' },
  hero: { backgroundColor: '#142334', borderRadius: 30, padding: 26, overflow: 'hidden' },
  orbit: { position: 'absolute', right: -110, top: -75, width: 285, height: 285, borderRadius: 150, borderWidth: 35, borderColor: '#203245' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontSize: 33, fontWeight: '900', color: '#FAF6ED', letterSpacing: -1 },
  eyebrow: { color: '#D7B875', fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginTop: 30, marginBottom: 14 },
  headline: { color: '#FAF6ED', fontSize: 35, lineHeight: 43, fontWeight: '800', letterSpacing: -1 },
  heroIntro: { color: '#C4CCD6', fontSize: 15, lineHeight: 24, marginTop: 17 },
  heroButton: { backgroundColor: '#D7B875', borderRadius: 17, minHeight: 52, padding: 15, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroButtonText: { color: '#142334', fontWeight: '800', fontSize: 15, flexShrink: 1 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 23 },
  smallLine: { width: 32, height: 1, backgroundColor: '#4B5260' },
  story: { paddingHorizontal: 3, paddingVertical: 30 },
  label: { color: '#A17C36', fontSize: 11, letterSpacing: 2, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { fontSize: 27, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6, marginBottom: 15 },
  body: { fontSize: 15, lineHeight: 26 },
  quote: { marginTop: 22, borderLeftWidth: 3, padding: 18, borderRadius: 12, gap: 10 },
  quoteText: { fontSize: 16, lineHeight: 25, fontWeight: '600' },
  blockTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  feature: { borderWidth: 1, borderRadius: 22, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 11 },
  icon: { width: 48, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  featureBody: { fontSize: 13, lineHeight: 21 },
  values: { marginTop: 17, paddingVertical: 23, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 28 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 13 },
  founder: { padding: 22, borderRadius: 26, borderWidth: 1, marginBottom: 20 },
  founderTop: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 },
  avatar: { width: 60, height: 66, borderRadius: 21, backgroundColor: '#EADCBC', justifyContent: 'center', alignItems: 'center' },
  initials: { color: '#182637', fontSize: 23, fontWeight: '800' },
  founderLabel: { color: '#A17C36', fontSize: 9, lineHeight: 15, letterSpacing: 1, fontWeight: '800', marginBottom: 4 },
  founderName: { fontSize: 20, fontWeight: '800' },
  signature: { marginTop: 20, paddingTop: 17, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signatureText: { fontSize: 16, fontStyle: 'italic', flexShrink: 1 },
  oxpi: { backgroundColor: '#142334', padding: 23, borderRadius: 26 },
  codeIcon: { padding: 10, borderRadius: 14, backgroundColor: '#25374A' },
  oxpiName: { color: '#FAF6ED', fontSize: 18, fontWeight: '800', flexShrink: 1 },
  oxpiTitle: { color: '#D7B875', fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 9 },
  oxpiBody: { color: '#C4CCD6', fontSize: 14, lineHeight: 24 },
  footer: { alignItems: 'center', paddingTop: 32, gap: 9 },
  end: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  endSub: { fontSize: 12, textAlign: 'center' },
});