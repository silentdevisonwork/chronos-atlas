import type { LanguageCode } from '../types';

/**
 * World Monitor UI strings for all 20 supported languages.
 * Order: see MONITOR_KEYS. Topic labels follow the TOPICS order in MonitorView.
 */
export const MONITOR_KEYS = [
  'title', 'subtitle', 'live', 'allTopics', 'mapFocus', 'searchPh', 'search', 'refresh',
  'english', 'allLangs', 'liveFeed', 'stories',
  'top', 'conflict', 'aviation', 'terror', 'politics', 'economy', 'energy', 'disasters',
  'climate', 'health', 'migration', 'tech', 'inventions', 'space', 'talent', 'culture',
] as const;
export type MonitorKey = (typeof MONITOR_KEYS)[number];

const L: Record<LanguageCode, string[]> = {
  en: ['World Monitor', 'Live global news coverage from GDELT: hotspots, trends and tone.', 'Live', 'All topics', 'Map & focus', 'Search any news worldwide, e.g. earthquake Turkey', 'Search', 'Refresh', 'English', 'All languages', 'Live feed', 'stories',
    'Top stories', 'War & conflict', 'Aviation & aircraft', 'Terror & crime', 'Politics', 'Economy', 'Energy', 'Disasters', 'Climate', 'Health', 'Migration & crisis', 'Tech & cyber', 'Inventions & science', 'Space', 'Skills & achievements', 'Society & culture'],
  tr: ['Dünya Monitörü', 'GDELT ile canlı küresel haber akışı: sıcak noktalar, eğilimler ve ton.', 'Canlı', 'Tüm konular', 'Harita ve odak', 'Dünyadaki her haberi ara, örn. deprem Türkiye', 'Ara', 'Yenile', 'İngilizce', 'Tüm diller', 'Canlı akış', 'haber',
    'Öne çıkanlar', 'Savaş ve çatışma', 'Havacılık ve uçaklar', 'Terör ve suç', 'Siyaset', 'Ekonomi', 'Enerji', 'Afetler', 'İklim', 'Sağlık', 'Göç ve kriz', 'Teknoloji ve siber', 'İcatlar ve bilim', 'Uzay', 'Beceri ve başarılar', 'Toplum ve kültür'],
  ar: ['مراقب العالم', 'تغطية إخبارية عالمية مباشرة من GDELT: بؤر الأحداث والاتجاهات والنبرة.', 'مباشر', 'كل المواضيع', 'الخريطة والتركيز', 'ابحث في أي خبر حول العالم، مثل زلزال تركيا', 'بحث', 'تحديث', 'الإنجليزية', 'كل اللغات', 'البث المباشر', 'خبر',
    'أبرز الأخبار', 'الحرب والنزاع', 'الطيران والطائرات', 'الإرهاب والجريمة', 'السياسة', 'الاقتصاد', 'الطاقة', 'الكوارث', 'المناخ', 'الصحة', 'الهجرة والأزمات', 'التقنية والأمن السيبراني', 'الاختراعات والعلوم', 'الفضاء', 'المهارات والإنجازات', 'المجتمع والثقافة'],
  de: ['Weltmonitor', 'Globale Live-Nachrichten von GDELT: Brennpunkte, Trends und Tonfall.', 'Live', 'Alle Themen', 'Karte & Fokus', 'Beliebige Nachricht weltweit suchen, z. B. Erdbeben Türkei', 'Suchen', 'Aktualisieren', 'Englisch', 'Alle Sprachen', 'Live-Feed', 'Meldungen',
    'Top-Meldungen', 'Krieg & Konflikt', 'Luftfahrt & Flugzeuge', 'Terror & Kriminalität', 'Politik', 'Wirtschaft', 'Energie', 'Katastrophen', 'Klima', 'Gesundheit', 'Migration & Krisen', 'Technik & Cyber', 'Erfindungen & Wissenschaft', 'Weltraum', 'Fähigkeiten & Leistungen', 'Gesellschaft & Kultur'],
  fr: ['Moniteur du monde', 'Actualités mondiales en direct via GDELT : foyers, tendances et tonalité.', 'En direct', 'Tous les sujets', 'Carte et focus', 'Rechercher toute actualité mondiale, ex. séisme Turquie', 'Rechercher', 'Actualiser', 'Anglais', 'Toutes les langues', 'Flux en direct', 'articles',
    'À la une', 'Guerre et conflit', 'Aviation et avions', 'Terrorisme et crime', 'Politique', 'Économie', 'Énergie', 'Catastrophes', 'Climat', 'Santé', 'Migration et crises', 'Tech et cyber', 'Inventions et sciences', 'Espace', 'Talents et exploits', 'Société et culture'],
  es: ['Monitor Mundial', 'Noticias globales en vivo de GDELT: focos, tendencias y tono.', 'En vivo', 'Todos los temas', 'Mapa y enfoque', 'Busca cualquier noticia del mundo, p. ej. terremoto Turquía', 'Buscar', 'Actualizar', 'Inglés', 'Todos los idiomas', 'Noticias en vivo', 'noticias',
    'Titulares', 'Guerra y conflicto', 'Aviación y aeronaves', 'Terrorismo y crimen', 'Política', 'Economía', 'Energía', 'Desastres', 'Clima', 'Salud', 'Migración y crisis', 'Tecnología y ciberseguridad', 'Inventos y ciencia', 'Espacio', 'Talentos y logros', 'Sociedad y cultura'],
  it: ['Monitor Mondiale', 'Notizie globali in diretta da GDELT: focolai, tendenze e tono.', 'In diretta', 'Tutti gli argomenti', 'Mappa e focus', 'Cerca qualsiasi notizia nel mondo, es. terremoto Turchia', 'Cerca', 'Aggiorna', 'Inglese', 'Tutte le lingue', 'Flusso live', 'notizie',
    'In evidenza', 'Guerra e conflitti', 'Aviazione e aerei', 'Terrorismo e crimine', 'Politica', 'Economia', 'Energia', 'Disastri', 'Clima', 'Salute', 'Migrazione e crisi', 'Tecnologia e cyber', 'Invenzioni e scienza', 'Spazio', 'Talenti e traguardi', 'Società e cultura'],
  pt: ['Monitor Mundial', 'Notícias globais ao vivo do GDELT: focos, tendências e tom.', 'Ao vivo', 'Todos os temas', 'Mapa e foco', 'Pesquise qualquer notícia do mundo, ex. terremoto Turquia', 'Pesquisar', 'Atualizar', 'Inglês', 'Todos os idiomas', 'Feed ao vivo', 'notícias',
    'Destaques', 'Guerra e conflito', 'Aviação e aeronaves', 'Terrorismo e crime', 'Política', 'Economia', 'Energia', 'Desastres', 'Clima', 'Saúde', 'Migração e crises', 'Tecnologia e cibernética', 'Invenções e ciência', 'Espaço', 'Talentos e conquistas', 'Sociedade e cultura'],
  ru: ['Мировой монитор', 'Мировые новости в реальном времени от GDELT: очаги, тренды и тональность.', 'В эфире', 'Все темы', 'Карта и фокус', 'Ищите любые новости мира, напр. землетрясение Турция', 'Поиск', 'Обновить', 'Английский', 'Все языки', 'Лента', 'новостей',
    'Главное', 'Война и конфликты', 'Авиация и самолёты', 'Терроризм и преступность', 'Политика', 'Экономика', 'Энергетика', 'Катастрофы', 'Климат', 'Здоровье', 'Миграция и кризисы', 'Технологии и кибербезопасность', 'Изобретения и наука', 'Космос', 'Таланты и достижения', 'Общество и культура'],
  zh: ['世界监测', '来自 GDELT 的全球实时新闻：热点、趋势与语气。', '实时', '全部主题', '地图与聚焦', '搜索全球任何新闻，例如 地震 土耳其', '搜索', '刷新', '英语', '所有语言', '实时动态', '条新闻',
    '头条', '战争与冲突', '航空与飞机', '恐怖与犯罪', '政治', '经济', '能源', '灾害', '气候', '健康', '移民与危机', '科技与网络', '发明与科学', '太空', '技能与成就', '社会与文化'],
  ja: ['ワールドモニター', 'GDELT によるリアルタイムの世界ニュース：注目地点、傾向、論調。', 'ライブ', 'すべてのトピック', '地図と詳細', '世界中のニュースを検索（例：地震 トルコ）', '検索', '更新', '英語', 'すべての言語', 'ライブフィード', '件',
    'トップニュース', '戦争・紛争', '航空・航空機', 'テロ・犯罪', '政治', '経済', 'エネルギー', '災害', '気候', '健康', '移民・危機', '技術・サイバー', '発明・科学', '宇宙', '技能・功績', '社会・文化'],
  ko: ['월드 모니터', 'GDELT 기반 실시간 글로벌 뉴스: 핫스팟, 추세, 논조.', '실시간', '모든 주제', '지도 및 집중', '전 세계 뉴스 검색, 예: 지진 튀르키예', '검색', '새로고침', '영어', '모든 언어', '실시간 피드', '건',
    '주요 뉴스', '전쟁·분쟁', '항공·항공기', '테러·범죄', '정치', '경제', '에너지', '재난', '기후', '보건', '이주·위기', '기술·사이버', '발명·과학', '우주', '기술·업적', '사회·문화'],
  hi: ['वर्ल्ड मॉनिटर', 'GDELT से लाइव वैश्विक समाचार: हॉटस्पॉट, रुझान और लहजा।', 'लाइव', 'सभी विषय', 'नक्शा और फोकस', 'दुनिया की कोई भी खबर खोजें, जैसे भूकंप तुर्की', 'खोजें', 'रीफ्रेश', 'अंग्रेज़ी', 'सभी भाषाएँ', 'लाइव फ़ीड', 'खबरें',
    'मुख्य खबरें', 'युद्ध और संघर्ष', 'विमानन और विमान', 'आतंक और अपराध', 'राजनीति', 'अर्थव्यवस्था', 'ऊर्जा', 'आपदाएँ', 'जलवायु', 'स्वास्थ्य', 'प्रवास और संकट', 'तकनीक और साइबर', 'आविष्कार और विज्ञान', 'अंतरिक्ष', 'कौशल और उपलब्धियाँ', 'समाज और संस्कृति'],
  ur: ['ورلڈ مانیٹر', 'GDELT سے براہِ راست عالمی خبریں: گرم مقامات، رجحانات اور لہجہ۔', 'براہِ راست', 'تمام موضوعات', 'نقشہ اور توجہ', 'دنیا بھر کی کوئی بھی خبر تلاش کریں، مثلاً زلزلہ ترکی', 'تلاش', 'تازہ کریں', 'انگریزی', 'تمام زبانیں', 'براہِ راست فیڈ', 'خبریں',
    'اہم خبریں', 'جنگ اور تنازع', 'ہوابازی اور طیارے', 'دہشت اور جرائم', 'سیاست', 'معیشت', 'توانائی', 'آفات', 'موسمیات', 'صحت', 'ہجرت اور بحران', 'ٹیکنالوجی اور سائبر', 'ایجادات اور سائنس', 'خلا', 'مہارتیں اور کامیابیاں', 'معاشرہ اور ثقافت'],
  fa: ['دیده‌بان جهان', 'پوشش زنده اخبار جهانی از GDELT: کانون‌ها، روندها و لحن.', 'زنده', 'همه موضوعات', 'نقشه و تمرکز', 'هر خبری را در جهان جست‌وجو کنید، مثل زلزله ترکیه', 'جست‌وجو', 'تازه‌سازی', 'انگلیسی', 'همه زبان‌ها', 'خوراک زنده', 'خبر',
    'خبرهای برجسته', 'جنگ و درگیری', 'هوانوردی و هواپیما', 'تروریسم و جرم', 'سیاست', 'اقتصاد', 'انرژی', 'بلایا', 'اقلیم', 'سلامت', 'مهاجرت و بحران', 'فناوری و سایبری', 'اختراعات و علم', 'فضا', 'مهارت‌ها و دستاوردها', 'جامعه و فرهنگ'],
  el: ['Παγκόσμιος Παρατηρητής', 'Ζωντανή παγκόσμια είδηση από το GDELT: εστίες, τάσεις και τόνος.', 'Ζωντανά', 'Όλα τα θέματα', 'Χάρτης και εστίαση', 'Αναζητήστε οποιαδήποτε είδηση, π.χ. σεισμός Τουρκία', 'Αναζήτηση', 'Ανανέωση', 'Αγγλικά', 'Όλες οι γλώσσες', 'Ζωντανή ροή', 'ειδήσεις',
    'Κορυφαία νέα', 'Πόλεμος και σύγκρουση', 'Αεροπορία και αεροσκάφη', 'Τρομοκρατία και έγκλημα', 'Πολιτική', 'Οικονομία', 'Ενέργεια', 'Καταστροφές', 'Κλίμα', 'Υγεία', 'Μετανάστευση και κρίσεις', 'Τεχνολογία και κυβερνοασφάλεια', 'Εφευρέσεις και επιστήμη', 'Διάστημα', 'Δεξιότητες και επιτεύγματα', 'Κοινωνία και πολιτισμός'],
  nl: ['Wereldmonitor', 'Live wereldnieuws van GDELT: hotspots, trends en toon.', 'Live', 'Alle onderwerpen', 'Kaart & focus', 'Zoek elk nieuws wereldwijd, bijv. aardbeving Turkije', 'Zoeken', 'Vernieuwen', 'Engels', 'Alle talen', 'Livefeed', 'berichten',
    'Topnieuws', 'Oorlog en conflict', 'Luchtvaart en vliegtuigen', 'Terreur en misdaad', 'Politiek', 'Economie', 'Energie', 'Rampen', 'Klimaat', 'Gezondheid', 'Migratie en crises', 'Tech en cyber', 'Uitvindingen en wetenschap', 'Ruimtevaart', 'Talenten en prestaties', 'Samenleving en cultuur'],
  pl: ['Monitor Świata', 'Światowe wiadomości na żywo z GDELT: punkty zapalne, trendy i ton.', 'Na żywo', 'Wszystkie tematy', 'Mapa i fokus', 'Szukaj dowolnych wiadomości, np. trzęsienie ziemi Turcja', 'Szukaj', 'Odśwież', 'Angielski', 'Wszystkie języki', 'Kanał na żywo', 'wiadomości',
    'Najważniejsze', 'Wojna i konflikty', 'Lotnictwo i samoloty', 'Terroryzm i przestępczość', 'Polityka', 'Gospodarka', 'Energia', 'Katastrofy', 'Klimat', 'Zdrowie', 'Migracja i kryzysy', 'Technologia i cyber', 'Wynalazki i nauka', 'Kosmos', 'Umiejętności i osiągnięcia', 'Społeczeństwo i kultura'],
  id: ['Monitor Dunia', 'Berita global langsung dari GDELT: titik panas, tren, dan nada.', 'Langsung', 'Semua topik', 'Peta & fokus', 'Cari berita apa pun di dunia, mis. gempa Turki', 'Cari', 'Segarkan', 'Inggris', 'Semua bahasa', 'Umpan langsung', 'berita',
    'Berita utama', 'Perang & konflik', 'Penerbangan & pesawat', 'Terorisme & kejahatan', 'Politik', 'Ekonomi', 'Energi', 'Bencana', 'Iklim', 'Kesehatan', 'Migrasi & krisis', 'Teknologi & siber', 'Penemuan & sains', 'Luar angkasa', 'Keterampilan & prestasi', 'Masyarakat & budaya'],
  sw: ['Kifuatiliaji cha Dunia', 'Habari za dunia moja kwa moja kutoka GDELT: maeneo moto, mielekeo na sauti.', 'Moja kwa moja', 'Mada zote', 'Ramani na lengo', 'Tafuta habari yoyote duniani, mf. tetemeko Uturuki', 'Tafuta', 'Onyesha upya', 'Kiingereza', 'Lugha zote', 'Mtiririko wa moja kwa moja', 'habari',
    'Habari kuu', 'Vita na migogoro', 'Usafiri wa anga na ndege', 'Ugaidi na uhalifu', 'Siasa', 'Uchumi', 'Nishati', 'Maafa', 'Tabianchi', 'Afya', 'Uhamiaji na migogoro', 'Teknolojia na usalama mtandaoni', 'Uvumbuzi na sayansi', 'Anga za juu', 'Ujuzi na mafanikio', 'Jamii na utamaduni'],
};

export function mt(lang: LanguageCode, key: MonitorKey): string {
  const i = MONITOR_KEYS.indexOf(key);
  return (L[lang] ?? L.en)[i] || L.en[i];
}
export const MONITOR_LANGUAGE_COUNT = Object.keys(L).length;
