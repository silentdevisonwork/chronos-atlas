import type { LanguageCode, LanguageMeta, LocalizedStringMap } from '../types';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr' },
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', dir: 'ltr' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl' },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', dir: 'rtl' },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', dir: 'ltr' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', dir: 'ltr' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr' },
  { code: 'sw', nativeName: 'Kiswahili', englishName: 'Swahili', dir: 'ltr' },
];

export type UIMessageKey =
  | 'appName'
  | 'navHome'
  | 'navExplore'
  | 'navMap'
  | 'navTimeline'
  | 'navCivilizations'
  | 'navCountries'
  | 'navFigures'
  | 'navDiscover'
  | 'navSolarSystem'
  | 'navLearning'
  | 'navFavorites'
  | 'navSettings'
  | 'navProfile'
  | 'searchPlaceholder'
  | 'searchTrigger'
  | 'signInGoogle'
  | 'signOut'
  | 'guestMode'
  | 'skip'
  | 'continue'
  | 'back'
  | 'getStarted'
  | 'bce'
  | 'ce'
  | 'year'
  | 'hideControls'
  | 'showControls'
  | 'verifiedFacts'
  | 'scholarlyInterpretations'
  | 'disputedClaims'
  | 'askHistorian'
  | 'askPlaceholder'
  | 'saveFavorite'
  | 'savedFavorite'
  | 'startQuiz'
  | 'completeLesson'
  | 'lessonCompleted'
  | 'themeLight'
  | 'themeDark'
  | 'language'
  | 'graphicsQuality'
  | 'reducedMotion'
  | 'customCursor'
  | 'mode3DGlobe'
  | 'mode2DMap'
  | 'allEras'
  | 'ancestorsTitle'
  | 'continuityNote'
  | 'artisticScalingNotice';

type Dictionary = Record<UIMessageKey, string>;

const EN: Dictionary = {
  appName: 'Chronos Atlas',
  navHome: 'Home',
  navExplore: 'Explore',
  navMap: 'Historical Map',
  navTimeline: 'Timeline',
  navCivilizations: 'Civilizations',
  navCountries: 'Countries',
  navFigures: 'Figures',
  navDiscover: 'Discover',
  navSolarSystem: 'Solar System',
  navLearning: 'Learning',
  navFavorites: 'Favorites',
  navSettings: 'Settings',
  navProfile: 'Profile',
  searchPlaceholder: 'Search countries, empires, Constantinople, القسطنطينية, Mars...',
  searchTrigger: 'Search',
  signInGoogle: 'Continue with Google',
  signOut: 'Sign Out',
  guestMode: 'Guest Explorer',
  skip: 'Skip',
  continue: 'Continue',
  back: 'Back',
  getStarted: 'Get Started',
  bce: 'BCE',
  ce: 'CE',
  year: 'Year',
  hideControls: 'Hide Controls',
  showControls: 'Show Controls',
  verifiedFacts: 'Verified Facts',
  scholarlyInterpretations: 'Scholarly Interpretations',
  disputedClaims: 'Disputed Claims & Debates',
  askHistorian: 'Ask Historian Assistant',
  askPlaceholder: 'Ask about verified history, primary sources, or disputes...',
  saveFavorite: 'Save to Favorites',
  savedFavorite: 'Saved',
  startQuiz: 'Start Quiz',
  completeLesson: 'Mark Lesson Complete',
  lessonCompleted: 'Completed',
  themeLight: 'Archival Light',
  themeDark: 'Observatory Dark',
  language: 'Language',
  graphicsQuality: 'Graphics Quality',
  reducedMotion: 'Reduced Motion',
  customCursor: 'Observatory Cursor',
  mode3DGlobe: '3D Globe',
  mode2DMap: '2D Atlas',
  allEras: 'All Eras',
  ancestorsTitle: 'Ancestor Civilizations & Predecessor States',
  continuityNote: 'Territorial Succession vs. Cultural & Political Continuity',
  artisticScalingNotice:
    'Visual Approximation Notice: Planetary radii and orbital distances are logarithmically scaled for interactive legibility; physical telemetry values reflect real astronomical measurements.',
};

const TR: Dictionary = {
  appName: 'Chronos Atlas',
  navHome: 'Ana Sayfa',
  navExplore: 'Keşfet',
  navMap: 'Tarihi Harita',
  navTimeline: 'Zaman Çizelgesi',
  navCivilizations: 'Medeniyetler',
  navCountries: 'Ülkeler',
  navFigures: 'Tarihi Şahsiyetler',
  navDiscover: 'Öne Çıkanlar',
  navSolarSystem: 'Güneş Sistemi',
  navLearning: 'Öğrenme',
  navFavorites: 'Favoriler',
  navSettings: 'Ayarlar',
  navProfile: 'Profil',
  searchPlaceholder: 'Ülke, imparatorluk, İstanbul, Konstantiniyye, Mars ara...',
  searchTrigger: 'Ara',
  signInGoogle: 'Google ile Devam Et',
  signOut: 'Çıkış Yap',
  guestMode: 'Misafir Kaşif',
  skip: 'Atla',
  continue: 'Devam Et',
  back: 'Geri',
  getStarted: 'Keşfe Başla',
  bce: 'MÖ',
  ce: 'MS',
  year: 'Yıl',
  hideControls: 'Kontrolleri Gizle',
  showControls: 'Kontrolleri Göster',
  verifiedFacts: 'Doğrulanmış Bulgular',
  scholarlyInterpretations: 'Akademik Yorumlar',
  disputedClaims: 'Tartışmalı İddialar',
  askHistorian: 'Tarihçi Asistana Sor',
  askPlaceholder: 'Doğrulanmış tarih, kaynaklar veya tartışmalar hakkında sorun...',
  saveFavorite: 'Favorilere Ekle',
  savedFavorite: 'Kaydedildi',
  startQuiz: 'Testi Başlat',
  completeLesson: 'Dersi Tamamla',
  lessonCompleted: 'Tamamlandı',
  themeLight: 'Arşiv Aydınlık',
  themeDark: 'Gözlemevi Koyu',
  language: 'Dil',
  graphicsQuality: 'Grafik Kalitesi',
  reducedMotion: 'Azaltılmış Hareket',
  customCursor: 'Gözlemevi İmleci',
  mode3DGlobe: '3B Küre',
  mode2DMap: '2B Atlas',
  allEras: 'Tüm Çağlar',
  ancestorsTitle: 'Ata Medeniyetler ve Öncül Devletler',
  continuityNote: 'Toprak Ardıllığı ile Kültürel ve Siyasi Süreklilik Ayrımı',
  artisticScalingNotice:
    'Görsel Ölçeklendirme Notu: Gezegen yarıçapları ve yörünge mesafeleri etkileşimli görünürlük için logaritmik ölçeklenmiştir; bilimsel veriler gerçek astronomik ölçümleri yansıtır.',
};

const AR: Dictionary = {
  ...EN,
  navHome: 'الرئيسية',
  navExplore: 'استكشاف',
  navMap: 'الخريطة التاريخية',
  navTimeline: 'الخط الزمني',
  navCivilizations: 'الحضارات',
  navCountries: 'الدول',
  navFigures: 'الشخصيات',
  navDiscover: 'اكتشف',
  navSolarSystem: 'النظام الشمسي',
  navLearning: 'التعلّم',
  navFavorites: 'المفضلة',
  navSettings: 'الإعدادات',
  navProfile: 'الملف الشخصي',
  searchPlaceholder: 'ابحث عن الدول، الحضارات، القسطنطينية، المريخ...',
  searchTrigger: 'بحث',
  signInGoogle: 'المتابعة باستخدام Google',
  signOut: 'تسجيل الخروج',
  guestMode: 'مستكشف زائر',
  skip: 'تخطي',
  continue: 'متابعة',
  back: 'رجوع',
  getStarted: 'ابدأ الاستكشاف',
  bce: 'ق.م',
  ce: 'م',
  year: 'السنة',
  hideControls: 'إخفاء عناصر التحكم',
  showControls: 'إظهار عناصر التحكم',
  verifiedFacts: 'حقائق موثقة',
  scholarlyInterpretations: 'تفسيرات أكاديمية',
  disputedClaims: 'ادعاءات محل خلاف',
  askHistorian: 'اسأل المؤرخ المساعد',
  askPlaceholder: 'اسأل عن الحقائق التاريخية أو المصادر الأولية...',
  saveFavorite: 'حفظ في المفضلة',
  savedFavorite: 'تم الحفظ',
  startQuiz: 'بدء الاختبار',
  completeLesson: 'إتمام الدرس',
  lessonCompleted: 'مكتمل',
  themeLight: 'مظهر الأرشيف الفاتح',
  themeDark: 'مظهر المرصد الداكن',
  language: 'اللغة',
  mode3DGlobe: 'كرة ثلاثية الأبعاد',
  mode2DMap: 'أطلس ثنائي الأبعاد',
  allEras: 'جميع العصور',
  ancestorsTitle: 'الحضارات السلف والدول المتعاقبة',
  continuityNote: 'التمييز بين التعاقب الجغرافي والاستمرارية الثقافية والسياسية',
  artisticScalingNotice:
    'ملاحظة القياس البصري: أحجام الكواكب والمدارات مُقاسة لوغاريتمياً للعرض التفاعلي، بينما تعكس البيانات الفيزيائية القياسات الفلكية الحقيقية.',
};

const DE: Dictionary = {
  ...EN,
  navHome: 'Start',
  navExplore: 'Entdecken',
  navMap: 'Historische Karte',
  navTimeline: 'Zeitstrahl',
  navCivilizations: 'Zivilisationen',
  navCountries: 'Länder',
  navFigures: 'Persönlichkeiten',
  navDiscover: 'Empfehlungen',
  navSolarSystem: 'Sonnensystem',
  navLearning: 'Lernen',
  navFavorites: 'Favoriten',
  navSettings: 'Einstellungen',
  navProfile: 'Profil',
  searchPlaceholder: 'Länder, Reiche, Konstantinopel, Mars suchen...',
  searchTrigger: 'Suchen',
  signInGoogle: 'Mit Google fortfahren',
  signOut: 'Abmelden',
  guestMode: 'Gast-Entdecker',
  skip: 'Überspringen',
  continue: 'Weiter',
  back: 'Zurück',
  getStarted: 'Jetzt starten',
  bce: 'v. Chr.',
  ce: 'n. Chr.',
  year: 'Jahr',
  verifiedFacts: 'Gesicherte Fakten',
  scholarlyInterpretations: 'Wissenschaftliche Deutungen',
  disputedClaims: 'Umstrittene Thesen',
  askHistorian: 'Historiker-Assistent fragen',
  saveFavorite: 'Merken',
  savedFavorite: 'Gespeichert',
  language: 'Sprache',
};

const FR: Dictionary = {
  ...EN,
  navHome: 'Accueil',
  navExplore: 'Explorer',
  navMap: 'Carte historique',
  navTimeline: 'Chronologie',
  navCivilizations: 'Civilisations',
  navCountries: 'Pays',
  navFigures: 'Personnages',
  navDiscover: 'Découvrir',
  navSolarSystem: 'Système solaire',
  navLearning: 'Apprentissage',
  navFavorites: 'Favoris',
  navSettings: 'Paramètres',
  navProfile: 'Profil',
  searchPlaceholder: 'Rechercher pays, empires, Constantinople, Mars...',
  searchTrigger: 'Rechercher',
  signInGoogle: 'Continuer avec Google',
  signOut: 'Se déconnecter',
  guestMode: 'Explorateur invité',
  skip: 'Passer',
  continue: 'Continuer',
  back: 'Retour',
  getStarted: 'Commencer',
  bce: 'av. J.-C.',
  ce: 'apr. J.-C.',
  year: 'Année',
  verifiedFacts: 'Faits vérifiés',
  scholarlyInterpretations: 'Interprétations académiques',
  disputedClaims: 'Affirmations débattues',
  askHistorian: 'Demander à l’historien',
  saveFavorite: 'Enregistrer',
  savedFavorite: 'Enregistré',
  language: 'Langue',
};

const ES: Dictionary = {
  ...EN,
  navHome: 'Inicio',
  navExplore: 'Explorar',
  navMap: 'Mapa histórico',
  navTimeline: 'Línea temporal',
  navCivilizations: 'Civilizaciones',
  navCountries: 'Países',
  navFigures: 'Figuras',
  navDiscover: 'Descubrir',
  navSolarSystem: 'Sistema Solar',
  navLearning: 'Aprendizaje',
  navFavorites: 'Favoritos',
  navSettings: 'Ajustes',
  navProfile: 'Perfil',
  searchPlaceholder: 'Buscar países, imperios, Constantinopla, Marte...',
  searchTrigger: 'Buscar',
  signInGoogle: 'Continuar con Google',
  signOut: 'Cerrar sesión',
  guestMode: 'Explorador invitado',
  skip: 'Omitir',
  continue: 'Continuar',
  back: 'Atrás',
  getStarted: 'Comenzar',
  bce: 'a. C.',
  ce: 'd. C.',
  year: 'Año',
  verifiedFacts: 'Hechos verificados',
  scholarlyInterpretations: 'Interpretaciones académicas',
  disputedClaims: 'Debates historiográficos',
  language: 'Idioma',
};

const PARTIAL_OVERRIDES: Partial<Record<LanguageCode, Partial<Dictionary>>> = {
  it: {
    navHome: 'Home', navExplore: 'Esplora', navMap: 'Mappa storica', navTimeline: 'Linea del tempo',
    navCivilizations: 'Civiltà', navCountries: 'Paesi', navFigures: 'Personaggi', navSolarSystem: 'Sistema Solare',
    navLearning: 'Apprendimento', navFavorites: 'Preferiti', navSettings: 'Impostazioni', navProfile: 'Profilo',
    searchTrigger: 'Cerca', skip: 'Salta', continue: 'Continua', back: 'Indietro', getStarted: 'Inizia',
    bce: 'a.C.', ce: 'd.C.', language: 'Lingua', signInGoogle: 'Continua con Google',
  },
  pt: {
    navHome: 'Início', navExplore: 'Explorar', navMap: 'Mapa histórico', navTimeline: 'Linha do tempo',
    navCivilizations: 'Civilizações', navCountries: 'Países', navFigures: 'Figuras', navSolarSystem: 'Sistema Solar',
    navLearning: 'Aprendizado', navFavorites: 'Favoritos', navSettings: 'Configurações', navProfile: 'Perfil',
    searchTrigger: 'Buscar', skip: 'Pular', continue: 'Continuar', back: 'Voltar', getStarted: 'Começar',
    bce: 'a.C.', ce: 'd.C.', language: 'Idioma', signInGoogle: 'Continuar com Google',
  },
  ru: {
    navHome: 'Главная', navExplore: 'Обзор', navMap: 'Историческая карта', navTimeline: 'Лента времени',
    navCivilizations: 'Цивилизации', navCountries: 'Страны', navFigures: 'Личности', navDiscover: 'Открытия',
    navSolarSystem: 'Солнечная система', navLearning: 'Обучение', navFavorites: 'Избранное', navSettings: 'Настройки',
    navProfile: 'Профиль', searchTrigger: 'Поиск', skip: 'Пропустить', continue: 'Далее', back: 'Назад',
    getStarted: 'Начать', bce: 'до н.э.', ce: 'н.э.', year: 'Год', language: 'Язык', signInGoogle: 'Войти через Google',
  },
  zh: {
    navHome: '首页', navExplore: '探索', navMap: '历史地图', navTimeline: '时间轴',
    navCivilizations: '文明', navCountries: '国家', navFigures: '历史人物', navDiscover: '发现',
    navSolarSystem: '太阳系', navLearning: '学习', navFavorites: '收藏', navSettings: '设置',
    navProfile: '个人资料', searchTrigger: '搜索', skip: '跳过', continue: '继续', back: '返回',
    getStarted: '开始探索', bce: '公元前', ce: '公元', year: '年份', language: '语言', signInGoogle: '使用 Google 登录',
  },
  ja: {
    navHome: 'ホーム', navExplore: '探索', navMap: '歴史地図', navTimeline: '年表',
    navCivilizations: '文明', navCountries: '国別史', navFigures: '歴史人物', navDiscover: '発見',
    navSolarSystem: '太陽系', navLearning: '学習', navFavorites: 'お気に入り', navSettings: '設定',
    navProfile: 'プロフィール', searchTrigger: '検索', skip: 'スキップ', continue: '次へ', back: '戻る',
    getStarted: '始める', bce: '紀元前', ce: '西暦', year: '年', language: '言語', signInGoogle: 'Googleで続行',
  },
  ko: {
    navHome: '홈', navExplore: '탐험', navMap: '역사 지도', navTimeline: '연대표',
    navCivilizations: '문명', navCountries: '국가', navFigures: '역사 인물', navDiscover: '발견',
    navSolarSystem: '태양계', navLearning: '학습', navFavorites: '즐겨찾기', navSettings: '설정',
    navProfile: '프로필', searchTrigger: '검색', skip: '건너뛰기', continue: '계속', back: '뒤로',
    getStarted: '시작하기', bce: '기원전', ce: '서기', year: '연도', language: '언어', signInGoogle: 'Google로 계속하기',
  },
  hi: {
    navHome: 'होम', navExplore: 'खोजें', navMap: 'ऐतिहासिक मानचित्र', navTimeline: 'समयरेखा',
    navCivilizations: 'सभ्यताएँ', navCountries: 'देश', navFigures: 'प्रमुख व्यक्तित्व', navSolarSystem: 'सौर मंडल',
    navLearning: 'शिक्षण', navFavorites: 'पसंदीदा', navSettings: 'सेटिंग्स', navProfile: 'प्रोफ़ाइल',
    searchTrigger: 'खोजें', skip: 'छोड़ें', continue: 'आगे बढ़ें', back: 'पीछे', getStarted: 'शुरू करें',
    bce: 'ईसा पूर्व', ce: 'ईस्वी', language: 'भाषा', signInGoogle: 'Google से जारी रखें',
  },
  ur: {
    navHome: 'ہوم', navExplore: 'دریافت کریں', navMap: 'تاریخی نقشہ', navTimeline: 'ٹائم لائن',
    navCivilizations: 'تہذیبیں', navCountries: 'ممالک', navFigures: 'تاریخی شخصیات', navSolarSystem: 'نظام شمسی',
    navLearning: 'تعلیم', navFavorites: 'پسندیدہ', navSettings: 'ترتیبات', navProfile: 'پروفائل',
    searchTrigger: 'تلاش', skip: 'چھوڑیں', continue: 'جاری رکھیں', back: 'واپس', getStarted: 'شروع کریں',
    bce: 'قبل مسیح', ce: 'عیسوی', language: 'زبان', signInGoogle: 'Google کے ساتھ جاری رکھیں',
  },
  fa: {
    navHome: 'خانه', navExplore: 'کاوش', navMap: 'نقشه تاریخی', navTimeline: 'گاه‌شمار',
    navCivilizations: 'تمدن‌ها', navCountries: 'کشورها', navFigures: 'شخصیت‌ها', navSolarSystem: 'منظومه شمسی',
    navLearning: 'آموزش', navFavorites: 'علاقه‌مندی‌ها', navSettings: 'تنظیمات', navProfile: 'پروفایل',
    searchTrigger: 'جستجو', skip: 'رد کردن', continue: 'ادامه', back: 'بازگشت', getStarted: 'شروع کاوش',
    bce: 'ق.م', ce: 'م', language: 'زبان', signInGoogle: 'ورود با Google',
  },
  el: {
    navHome: 'Αρχική', navExplore: 'Εξερεύνηση', navMap: 'Ιστορικός Χάρτης', navTimeline: 'Χρονολόγιο',
    navCivilizations: 'Πολιτισμοί', navCountries: 'Χώρες', navFigures: 'Πρόσωπα', navSolarSystem: 'Ηλιακό Σύστημα',
    navLearning: 'Μάθηση', navFavorites: 'Αγαπημένα', navSettings: 'Ρυθμίσεις', navProfile: 'Προφίλ',
    searchTrigger: 'Αναζήτηση', skip: 'Παράλειψη', continue: 'Συνέχεια', back: 'Πίσω', getStarted: 'Έναρξη',
    bce: 'π.Χ.', ce: 'μ.Χ.', language: 'Γλώσσα', signInGoogle: 'Συνέχεια με Google',
  },
  nl: {
    navHome: 'Start', navExplore: 'Verkennen', navMap: 'Historische kaart', navTimeline: 'Tijdlijn',
    navCivilizations: 'Beschavingen', navCountries: 'Landen', navFigures: 'Figuren', navSolarSystem: 'Zonnestelsel',
    navLearning: 'Leren', navFavorites: 'Favorieten', navSettings: 'Instellingen', navProfile: 'Profiel',
    searchTrigger: 'Zoeken', skip: 'Overslaan', continue: 'Doorgaan', back: 'Terug', getStarted: 'Aan de slag',
    bce: 'v.Chr.', ce: 'n.Chr.', language: 'Taal', signInGoogle: 'Doorgaan met Google',
  },
  pl: {
    navHome: 'Start', navExplore: 'Odkrywaj', navMap: 'Mapa historyczna', navTimeline: 'Oś czasu',
    navCivilizations: 'Cywilizacje', navCountries: 'Kraje', navFigures: 'Postacie', navSolarSystem: 'Układ Słoneczny',
    navLearning: 'Nauka', navFavorites: 'Ulubione', navSettings: 'Ustawienia', navProfile: 'Profil',
    searchTrigger: 'Szukaj', skip: 'Pomiń', continue: 'Dalej', back: 'Wstecz', getStarted: 'Rozpocznij',
    bce: 'p.n.e.', ce: 'n.e.', language: 'Język', signInGoogle: 'Kontynuuj z Google',
  },
  id: {
    navHome: 'Beranda', navExplore: 'Jelajahi', navMap: 'Peta Sejarah', navTimeline: 'Linimasa',
    navCivilizations: 'Peradaban', navCountries: 'Negara', navFigures: 'Tokoh', navSolarSystem: 'Tata Surya',
    navLearning: 'Belajar', navFavorites: 'Favorit', navSettings: 'Pengaturan', navProfile: 'Profil',
    searchTrigger: 'Cari', skip: 'Lewati', continue: 'Lanjut', back: 'Kembali', getStarted: 'Mulai',
    bce: 'SM', ce: 'M', language: 'Bahasa', signInGoogle: 'Lanjutkan dengan Google',
  },
  sw: {
    navHome: 'Nyumbani', navExplore: 'Chunguza', navMap: 'Ramani ya Historia', navTimeline: 'Mstari wa Muda',
    navCivilizations: 'Ustaarabu', navCountries: 'Nchi', navFigures: 'Wahusika', navSolarSystem: 'Mfumo wa Jua',
    navLearning: 'Kujifunza', navFavorites: 'Vipendwa', navSettings: 'Mipangilio', navProfile: 'Wasifu',
    searchTrigger: 'Tafuta', skip: 'Ruka', continue: 'Endelea', back: 'Nyuma', getStarted: 'Anza',
    bce: 'KK', ce: 'BK', language: 'Lugha', signInGoogle: 'Endelea na Google',
  },
};

const DICTIONARIES: Record<LanguageCode, Dictionary> = {
  en: EN,
  tr: TR,
  ar: AR,
  de: DE,
  fr: FR,
  es: ES,
  it: { ...EN, ...PARTIAL_OVERRIDES.it },
  pt: { ...EN, ...PARTIAL_OVERRIDES.pt },
  ru: { ...EN, ...PARTIAL_OVERRIDES.ru },
  zh: { ...EN, ...PARTIAL_OVERRIDES.zh },
  ja: { ...EN, ...PARTIAL_OVERRIDES.ja },
  ko: { ...EN, ...PARTIAL_OVERRIDES.ko },
  hi: { ...EN, ...PARTIAL_OVERRIDES.hi },
  ur: { ...EN, ...PARTIAL_OVERRIDES.ur },
  fa: { ...EN, ...PARTIAL_OVERRIDES.fa },
  el: { ...EN, ...PARTIAL_OVERRIDES.el },
  nl: { ...EN, ...PARTIAL_OVERRIDES.nl },
  pl: { ...EN, ...PARTIAL_OVERRIDES.pl },
  id: { ...EN, ...PARTIAL_OVERRIDES.id },
  sw: { ...EN, ...PARTIAL_OVERRIDES.sw },
};

export function getLanguageMeta(code: LanguageCode): LanguageMeta {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[1];
}

export function t(lang: LanguageCode, key: UIMessageKey): string {
  return DICTIONARIES[lang]?.[key] ?? EN[key];
}

export function localize(map: LocalizedStringMap, lang: LanguageCode): string {
  return map[lang] ?? map.en;
}

export function formatHistoricalYear(year: number, lang: LanguageCode): string {
  if (year < 0) {
    return `${Math.abs(year).toLocaleString()} ${t(lang, 'bce')}`;
  }
  return `${year} ${t(lang, 'ce')}`;
}
