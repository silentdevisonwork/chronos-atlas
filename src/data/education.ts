import type { AchievementDef, LessonModule, QuizQuestion } from '../types';

export const LEARNING_LESSONS: LessonModule[] = [
  {
    id: 'lesson-anatolia-strata',
    title: {
      en: 'Layers of Anatolia: From Göbekli Tepe to the Republic of Türkiye',
      tr: 'Anadolu’nun Katmanları: Göbekli Tepe’den Türkiye Cumhuriyeti’ne',
    },
    era: '9600 BCE – 1923 CE',
    durationMinutes: 6,
    summary: {
      en: 'Trace how territorial succession across Hattians, Hittites, Lydians, Greeks, Romans, Byzantines, Seljuks, and Ottomans shaped modern Türkiye.',
      tr: 'Hattiler, Hititler, Lidyalılar, Yunanlar, Romalılar, Bizanslılar, Selçuklular ve Osmanlıların Anadolu coğrafyasındaki mirasını ve devlet sürekliliğini inceleyin.',
    },
    sections: [
      {
        heading: 'Prehistory & Bronze Age Empires',
        body: 'Monumental T-pillar sanctuaries at Göbekli Tepe (c. 9600 BCE) predate pottery and agriculture. Millennia later, the Hittites established Hattusa and authored the Treaty of Kadesh (1259 BCE) with Egypt.',
        factType: 'verified',
      },
      {
        heading: 'Classical Crossroads & Medieval Synthesis',
        body: 'Lydia introduced standardized electrum coinage at Sardis; Ionian thinkers like Thales pioneered natural philosophy; Constantinople served as Roman-Byzantine capital from 330 to 1453 CE.',
        factType: 'verified',
      },
      {
        heading: 'Seljuk, Ottoman & Republican Continuity',
        body: 'Following Manzikert (1071), Anatolian Seljuks built caravanserai trade networks. From 1299 to 1922, the Ottoman Empire bridged three continents before Atatürk proclaimed the Republic of Türkiye in 1923.',
        factType: 'interpretation',
      },
    ],
    relatedCivId: 'ottoman-empire',
    relatedCountryId: 'turkiye',
    targetYear: 1453,
  },
  {
    id: 'lesson-river-cradles',
    title: {
      en: 'River Valley Cradles: Mesopotamia, Nile & Indus',
      tr: 'Nehir Vadisi Uygarlıkları: Mezopotamya, Nil ve İndus',
    },
    era: '3500 BCE – 1500 BCE',
    durationMinutes: 5,
    summary: {
      en: 'Compare how Tigris-Euphrates, Nile, and Indus floodplains catalyzed writing, irrigation mathematics, and monumental architecture.',
      tr: 'Dicle-Fırat, Nil ve İndus taşkın ovalarının yazıyı, matematiği ve anıtsal mimariyi nasıl tetiklediğini karşılaştırın.',
    },
    sections: [
      {
        heading: 'Independent Scripts & Urban Planning',
        body: 'Uruk cuneiform tablets and Egyptian hieroglyphs emerged independently around 3200 BCE, while Mohenjo-daro engineered covered municipal drainage by 2500 BCE.',
        factType: 'verified',
      },
      {
        heading: 'Environmental Predictability & Cosmology',
        body: 'Scholars note the contrast between the Nile’s predictable annual flood and the Tigris-Euphrates’ sudden inundations may have shaped differing legal and mythological worldviews.',
        factType: 'interpretation',
      },
    ],
    relatedCivId: 'sumer-babylon',
    relatedCountryId: 'iraq',
    targetYear: -2500,
  },
  {
    id: 'lesson-cosmic-cartography',
    title: {
      en: 'From Alexandria & Samarkand to Space Probes',
      tr: 'İskenderiye ve Semerkant’tan Uzay Sondalarına',
    },
    era: '240 BCE – 2026 CE',
    durationMinutes: 5,
    summary: {
      en: 'Follow humanity’s evolving measurement of Earth and the Solar System from Eratosthenes and Ulugh Beg to Galileo and Parker Solar Probe.',
      tr: 'Eratosthenes ve Uluğ Bey’den Galileo ve modern uzay sondalarına kadar Dünya’nın ve Güneş Sistemi’nin ölçüm serüvenini keşfedin.',
    },
    sections: [
      {
        heading: 'Pre-Telescopic Precision',
        body: 'Eratosthenes estimated Earth’s circumference in Alexandria (c. 240 BCE); Ulugh Beg’s 40m marble sextant in Samarkand (1420) measured the sidereal year within ~60 seconds.',
        factType: 'verified',
      },
      {
        heading: 'Telescopic & Robotic Era',
        body: 'Galileo’s 1610 observation of Jupiter’s moons shattered geocentrism, paving the path to Voyager, Cassini, Perseverance, and JWST.',
        factType: 'verified',
      },
    ],
    targetYear: 1610,
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-kadesh',
    topicId: 'anatolia-history',
    difficulty: 'foundational',
    question: {
      en: 'Which two Bronze Age powers signed the Treaty of Kadesh (c. 1259 BCE), the oldest surviving parity peace treaty?',
      tr: 'Bilinen en eski eşitlikçi yazılı barış antlaşması olan Kadeş Antlaşması (MÖ 1259) hangi iki Tunç Çağı gücü arasında imzalandı?',
    },
    options: [
      { en: 'Hittite Empire & Ancient Egypt', tr: 'Hitit İmparatorluğu ve Antik Mısır' },
      { en: 'Roman Republic & Carthage', tr: 'Roma Cumhuriyeti ve Kartaca' },
      { en: 'Assyria & Urartu', tr: 'Asur ve Urartu' },
      { en: 'Persia & Classical Athens', tr: 'Pers İmparatorluğu ve Atina' },
    ],
    correctIndex: 0,
    explanation: {
      en: 'Ramesses II of Egypt and Hattusili III of Hatti concluded the Treaty of Kadesh; copies survive in both Akkadian cuneiform (Hattusa) and Egyptian hieroglyphs (Karnak).',
      tr: 'Mısır Firavunu II. Ramses ile Hitit Kralı III. Hattuşili arasında imzalanmıştır; hem Hattuşa’daki Akadca tablet hem Karnak hiyeroglifi günümüze ulaşmıştır.',
    },
    verifiedSource: 'Istanbul Archaeology Museums & Karnak Epigraphic Survey',
  },
  {
    id: 'q-lydia-coins',
    topicId: 'anatolia-history',
    difficulty: 'scholar',
    question: {
      en: 'Which Anatolian kingdom minted the world’s earliest standardized electrum coinage around 600 BCE?',
      tr: 'MÖ 600 civarında dünyanın ilk standart damgalı elektrum sikkelerini basan Anadolu krallığı hangisidir?',
    },
    options: [
      { en: 'Phrygia', tr: 'Frigya' },
      { en: 'Lydia', tr: 'Lidya' },
      { en: 'Urartu', tr: 'Urartu' },
      { en: 'Caria', tr: 'Karya' },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Lydian kings centered at Sardis (near modern Manisa, Türkiye) stamped lion-emblem electrum coins of controlled weight.',
      tr: 'Başkenti Sardes olan Lidya Krallığı standart ağırlıklı aslan damgalı elektrum paraları bastı.',
    },
    verifiedSource: 'British Museum / Sardis Archaeological Expedition',
  },
  {
    id: 'q-khwarizmi',
    topicId: 'science-history',
    difficulty: 'foundational',
    question: {
      en: 'The modern mathematical word "algorithm" derives from the Latinized name of which Abbasid scholar?',
      tr: 'Modern matematik ve bilgisayar bilimindeki "algoritma" sözcüğü hangi Abbasi bilgininin Latinceleşmiş adından türemiştir?',
    },
    options: [
      { en: 'Ibn Sina (Avicenna)', tr: 'İbn Sina' },
      { en: 'Al-Khwarizmi', tr: 'El-Harezmi' },
      { en: 'Ibn al-Haytham', tr: 'İbnü’l-Heysem' },
      { en: 'Ulugh Beg', tr: 'Uluğ Bey' },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Muhammad ibn Musa al-Khwarizmi’s treatise on Hindu-Arabic numerals was translated into Latin as "Algoritmi de numero Indorum".',
      tr: 'El-Harezmi’nin eserinin Latince çevirisi "Algoritmi" adıyla yayıldığı için algoritma kavramına adını vermiştir.',
    },
    verifiedSource: 'Bodleian Library / History of Mathematics Archives',
  },
  {
    id: 'q-solar-voyager',
    topicId: 'solar-system',
    difficulty: 'scholar',
    question: {
      en: 'Which spacecraft remains the only mission to have flown past both Uranus (1986) and Neptune (1989)?',
      tr: 'Hem Uranüs (1986) hem de Neptün (1989) yakınından geçen tek uzay aracı hangisidir?',
    },
    options: [
      { en: 'Cassini', tr: 'Cassini' },
      { en: 'Voyager 2', tr: 'Voyager 2' },
      { en: 'New Horizons', tr: 'New Horizons' },
      { en: 'Pioneer 10', tr: 'Pioneer 10' },
    ],
    correctIndex: 1,
    explanation: {
      en: 'Launched in 1977, Voyager 2 completed the Grand Tour of all four outer giant planets and entered interstellar space in 2018.',
      tr: '1977’de fırlatılan Voyager 2 dört dev gezegeni de ziyaret ederek 2018’de yıldızlararası uzaya çıktı.',
    },
    verifiedSource: 'NASA Jet Propulsion Laboratory (JPL)',
  },
  {
    id: 'q-turkiye-republic',
    topicId: 'anatolia-history',
    difficulty: 'foundational',
    question: {
      en: 'On what date was the Republic of Türkiye formally proclaimed in Ankara?',
      tr: 'Türkiye Cumhuriyeti Ankara’da hangi tarihte resmen ilan edilmiştir?',
    },
    options: [
      { en: 'April 23, 1920', tr: '23 Nisan 1920' },
      { en: 'October 29, 1923', tr: '29 Ekim 1923' },
      { en: 'July 24, 1923', tr: '24 Temmuz 1923' },
      { en: 'May 19, 1919', tr: '19 Mayıs 1919' },
    ],
    correctIndex: 1,
    explanation: {
      en: 'The Grand National Assembly of Türkiye proclaimed the Republic on October 29, 1923 and elected Mustafa Kemal Atatürk as its first President.',
      tr: 'TBMM, 29 Ekim 1923’te Cumhuriyeti ilan etmiş ve Mustafa Kemal Atatürk ilk Cumhurbaşkanı seçilmiştir.',
    },
    verifiedSource: 'Grand National Assembly of Türkiye Historical Records',
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach-first-epoch',
    title: { en: 'Time Traveler', tr: 'Zaman Yolcusu' },
    description: { en: 'Explore 3 different locations on the 3D Globe or Historical Map.', tr: '3B Küre veya Tarihi Harita üzerinde 3 farklı bölge keşfedin.' },
    thresholdLabel: '3 Locations',
  },
  {
    id: 'ach-scholar-quiz',
    title: { en: 'Archival Scholar', tr: 'Arşiv Bilgini' },
    description: { en: 'Score 80% or higher on any Historical & Astronomical Quiz.', tr: 'Herhangi bir Tarih ve Astronomi testinde %80+ başarı elde edin.' },
    thresholdLabel: '80% Quiz',
  },
  {
    id: 'ach-polyglot',
    title: { en: 'Polyglot Curator', tr: 'Çok Dilli Küratör' },
    description: { en: 'Complete at least 1 interactive lesson module.', tr: 'En az 1 etkileşimli ders modülünü tamamlayın.' },
    thresholdLabel: '1 Lesson',
  },
  {
    id: 'ach-astronomer',
    title: { en: 'Celestial Cartographer', tr: 'Gök Haritacısı' },
    description: { en: 'Bookmark or inspect celestial bodies in the 3D Solar System.', tr: '3B Güneş Sistemi’nde gök cisimlerini inceleyin veya favorileyin.' },
    thresholdLabel: 'Solar Explorer',
  },
];
