import type { GeoCoord } from '../types';

export const ARCHIVAL_MEDIA = {
  alexandriaHero: {
    src: '/src/assets/images/hero_alexandria_archive_1794581549010.jpg',
    caption: 'Library & Observatory Colonnade Reconstruction — Hellenistic Alexandria',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  babylonGate: {
    src: '/src/assets/images/civ_mesopotamia_babylon_1794581548864.jpg',
    caption: 'Glazed Lapis-Lazuli Gate & Stepped Ziggurat — Ancient Mesopotamia',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  constantinople: {
    src: '/src/assets/images/civ_anatolia_constantinople_1794581548905.jpg',
    caption: 'Hagia Sophia & Historic Peninsula — Constantinople / Istanbul',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  gizaPlateau: {
    src: '/src/assets/images/civ_egypt_giza_1794581548774.jpg',
    caption: 'Great Pyramids & Limestone Sphinx — Giza Plateau, Egypt',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  imperialChina: {
    src: '/src/assets/images/civ_china_terracotta_1794581549944.jpg',
    caption: 'Imperial Courtyard & Terracotta Guardians — Classical China',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  romanForum: {
    src: '/src/assets/images/civ_rome_forum_1794581549884.jpg',
    caption: 'Marble Colonnades & Triumphal Arch — Roman Forum, Italy',
    attribution: 'Chronos Atlas Archival Visualization',
  },
  deepSpace: {
    src: '/src/assets/images/space_deep_nebula_1794581550058.jpg',
    caption: 'Deep Interstellar Starfield & Cosmic Dust Filaments',
    attribution: 'Chronos Atlas Astronomical Observatory',
  },
  astrolabe: {
    src: '/src/assets/images/artifact_bronze_astrolabe_1794584273742.jpg',
    caption: 'Engraved Brass Planispheric Astrolabe & Blued-Steel Armillary Sphere',
    attribution: 'Chronos Atlas Horological & Astronomical Vault',
  },
  samarkand: {
    src: '/src/assets/images/civ_silk_road_samarkand_1794584275750.jpg',
    caption: 'Cobalt-Glazed Madrasas & Ulugh Beg Observatory — Silk Road, Samarkand',
    attribution: 'Chronos Atlas Silk Road Archive',
  },
  machuPicchu: {
    src: '/src/assets/images/civ_inca_machu_picchu_1794584276039.jpg',
    caption: 'Intihuatana Solar Stone & Dry-Fitted Granite Terraces — Andes',
    attribution: 'Chronos Atlas Andean Epigraphy Survey',
  },
  saturnProbe: {
    src: '/src/assets/images/space_saturn_voyager_observatory_1794584276236.jpg',
    caption: 'Cassini-Class Deep Space Orbiter over Saturn’s Multi-Band Ice Rings',
    attribution: 'Chronos Atlas Planetary Telemetry Archive',
  },
} as const;

export const PLACE_PHOTOS = {
  parthenon: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/960px-The_Parthenon_in_Athens.jpg',
    attribution: 'Wikimedia Commons · Parthenon, Athens',
  },
  persepolis: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/2018-09-21_Iran%2C_Persepolis%2C_Tachara_%28from_the_southeast%29.jpg/960px-2018-09-21_Iran%2C_Persepolis%2C_Tachara_%28from_the_southeast%29.jpg',
    attribution: 'Wikimedia Commons · Persepolis, Iran',
  },
  tajMahal: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/960px-Taj_Mahal_%28Edited%29.jpeg',
    attribution: 'Wikimedia Commons · Taj Mahal, Agra',
  },
  statueOfLiberty: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/960px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg',
    attribution: 'Wikimedia Commons · Statue of Liberty, New York',
  },
  stonehenge: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Stonehenge2007_07_30.jpg/960px-Stonehenge2007_07_30.jpg',
    attribution: 'Wikimedia Commons · Stonehenge, United Kingdom',
  },
  louvre: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Louvre_Museum_Wikimedia_Commons.jpg/960px-Louvre_Museum_Wikimedia_Commons.jpg',
    attribution: 'Wikimedia Commons · Louvre Palace, Paris',
  },
  brandenburgGate: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/960px-Brandenburger_Tor_abends.jpg',
    attribution: 'Wikimedia Commons · Brandenburg Gate, Berlin',
  },
  alhambra: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg/960px-Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg',
    attribution: 'Wikimedia Commons · Alhambra, Granada',
  },
  saintBasils: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Saint_Basil%27s_Cathedral_in_Moscow.jpg/960px-Saint_Basil%27s_Cathedral_in_Moscow.jpg',
    attribution: 'Wikimedia Commons · St. Basil’s Cathedral, Moscow',
  },
  himejiCastle: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg',
    attribution: 'Wikimedia Commons · Himeji Castle, Japan',
  },
  gyeongbokgung: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg/960px-%EA%B4%91%ED%99%94%EB%AC%B8_%EC%9B%94%EB%8C%80.jpg',
    attribution: 'Wikimedia Commons · Gyeongbokgung Palace, Seoul',
  },
  teotihuacan: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/ZA77_Teotihuac%C3%A1n_edo_de_mex_Herberto_de_la_rosa.jpg/960px-ZA77_Teotihuac%C3%A1n_edo_de_mex_Herberto_de_la_rosa.jpg',
    attribution: 'Wikimedia Commons · Teotihuacan, Mexico',
  },
  lalibela: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Lalibela%2C_san_giorgio%2C_esterno_24.jpg/960px-Lalibela%2C_san_giorgio%2C_esterno_24.jpg',
    attribution: 'Wikimedia Commons · Lalibela, Ethiopia',
  },
  hattusa: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Lion_Gate%2C_Hattusa_13_%28cropped%29.jpg/960px-Lion_Gate%2C_Hattusa_13_%28cropped%29.jpg',
    attribution: 'Wikimedia Commons · Lion Gate, Hattusa',
  },
  mohenjoDaro: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Mohenjodaro_-_view_of_the_stupa_mound.JPG/960px-Mohenjodaro_-_view_of_the_stupa_mound.JPG',
    attribution: 'Wikimedia Commons · Mohenjo-daro, Indus Valley',
  },
  sanchiStupa: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/East_Gateway_-_Stupa_1_-_Sanchi_Hill_2013-02-21_4398.JPG/960px-East_Gateway_-_Stupa_1_-_Sanchi_Hill_2013-02-21_4398.JPG',
    attribution: 'Wikimedia Commons · Sanchi Stupa, Maurya Empire',
  },
  knossos: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Knossos_-_North_Portico_02.jpg/960px-Knossos_-_North_Portico_02.jpg',
    attribution: 'Wikimedia Commons · Palace of Knossos, Crete',
  },
  byblos: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Byblos_Libanon_2003.JPG/960px-Byblos_Libanon_2003.JPG',
    attribution: 'Wikimedia Commons · Ancient Byblos, Phoenicia',
  },
  taqKasra: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/001125-TaqKasra-Iraq-IMG_7914-2.jpg/960px-001125-TaqKasra-Iraq-IMG_7914-2.jpg',
    attribution: 'Wikimedia Commons · Taq Kasra (Ctesiphon), Sassanian Empire',
  },
  samarra: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Samrraa_05.jpg/960px-Samrraa_05.jpg',
    attribution: 'Wikimedia Commons · Great Mosque of Samarra, Abbasid Era',
  },
  konyaSeljuk: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ince_Minareli_Medrese_01.jpg/960px-Ince_Minareli_Medrese_01.jpg',
    attribution: 'Wikimedia Commons · İnce Minareli Madrasa, Konya',
  },
  topkapi: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Topkap%C4%B1_-_01.jpg/960px-Topkap%C4%B1_-_01.jpg',
    attribution: 'Wikimedia Commons · Topkapı Palace, Istanbul',
  },
  hagiaSophia: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/960px-Hagia_Sophia_%28228968325%29.jpeg',
    attribution: 'Wikimedia Commons · Hagia Sophia, Istanbul',
  },
  djenne: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Djenne_great_mud_mosque.jpg/960px-Djenne_great_mud_mosque.jpg',
    attribution: 'Wikimedia Commons · Great Mosque of Djenné, Mali',
  },
  karakorum: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Erdene_Zuu_Monastery_05.jpg/960px-Erdene_Zuu_Monastery_05.jpg',
    attribution: 'Wikimedia Commons · Erdene Zuu / Karakorum, Mongolia',
  },
  angkorWat: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/960px-Angkor_Wat.jpg',
    attribution: 'Wikimedia Commons · Angkor Wat, Cambodia',
  },
  borgundStave: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Borgund_Stave_Church_in_L%C3%A6rdalen%2C_2013_June.jpg/960px-Borgund_Stave_Church_in_L%C3%A6rdalen%2C_2013_June.jpg',
    attribution: 'Wikimedia Commons · Borgund Stave Church, Norway',
  },
  florenceDuomo: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg/960px-Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg',
    attribution: 'Wikimedia Commons · Cathedral of Florence, Renaissance Italy',
  },
  issOrbiter: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg/960px-The_station_pictured_from_the_SpaceX_Crew_Dragon_5.jpg',
    attribution: 'NASA / Wikimedia Commons · International Space Station',
  },
} as const;

export type MonumentPresetId =
  | 'dome-basilica'
  | 'pyramid-obelisk'
  | 'astrolabe-armillary'
  | 'ziggurat-gate'
  | 'voyager-probe';

export interface ExhibitionPlate {
  id: string;
  accessionId: string;
  title: string;
  subtitle: string;
  year: number;
  yearLabel: string;
  region: string;
  coords: GeoCoord;
  src: string;
  attribution: string;
  medium: string;
  dimensions: string;
  summary: string;
  primarySource: string;
  monumentPreset: MonumentPresetId;
  inspectorTarget?: { type: 'country' | 'civilization' | 'site'; id: string };
}

export const EXHIBITION_PLATES: ExhibitionPlate[] = [
  {
    id: 'plate-constantinople',
    accessionId: 'CA-537-BYZ',
    title: 'Hagia Sophia & Historic Peninsula',
    subtitle: 'Pendentive Dome Engineering & Imperial Continuity',
    year: 1453,
    yearLabel: '537 – 1453 CE',
    region: 'Anatolia & Bosphorus, Türkiye',
    coords: { lat: 41.0086, lng: 28.9802 },
    src: ARCHIVAL_MEDIA.constantinople.src,
    attribution: ARCHIVAL_MEDIA.constantinople.attribution,
    medium: 'Brick, volcanic ash mortar, Proconnesian marble & gold tesserae',
    dimensions: 'Dome Ø 31.8 m · Crown Height 55.6 m',
    summary:
      'Designed by mathematicians Anthemius of Tralles and Isidore of Miletus in 537 CE, its spherical pendentives solved the problem of resting a circular masonry dome on a square nave. Later reinforced by Mimar Sinan under the Ottoman Empire.',
    primarySource: 'Procopius, De Aedificiis (561 CE) & Evliya Çelebi, Seyahatnâme',
    monumentPreset: 'dome-basilica',
    inspectorTarget: { type: 'country', id: 'turkiye' },
  },
  {
    id: 'plate-giza',
    accessionId: 'CA-2560-EGY',
    title: 'Great Pyramid & Solar Causeway',
    subtitle: 'Fourth Dynasty Astronomical & Ashlar Engineering',
    year: -2560,
    yearLabel: 'c. 2560 BCE',
    region: 'Giza Plateau, Egypt',
    coords: { lat: 29.9792, lng: 31.1342 },
    src: ARCHIVAL_MEDIA.gizaPlateau.src,
    attribution: ARCHIVAL_MEDIA.gizaPlateau.attribution,
    medium: '2.3 million Mokattam limestone & Aswan red granite blocks',
    dimensions: 'Base 230.3 m · Original Height 146.6 m · True North ±0.05°',
    summary:
      'Constructed for Pharaoh Khufu with internal granite relieving chambers above the King’s Chamber and cardinal alignment accurate to within three-sixtieths of a degree.',
    primarySource: 'Wadi al-Jarf Papyri (Logbook of Inspector Merer, c. 2560 BCE)',
    monumentPreset: 'pyramid-obelisk',
    inspectorTarget: { type: 'site', id: 'site-giza' },
  },
  {
    id: 'plate-astrolabe',
    accessionId: 'CA-1020-AST',
    title: 'Planispheric Astrolabe & Armillary Sphere',
    subtitle: 'Stereographic Celestial Analog Computer',
    year: 1020,
    yearLabel: 'c. 200 BCE – 1580 CE',
    region: 'Alexandria, Baghdad, Toledo & Istanbul',
    coords: { lat: 33.3152, lng: 44.3661 },
    src: ARCHIVAL_MEDIA.astrolabe.src,
    attribution: ARCHIVAL_MEDIA.astrolabe.attribution,
    medium: 'Cast brass mater, interchangeable latitude tympans, blued-steel rings',
    dimensions: 'Disc Ø 21.4 cm · 360° Alidade & Rete Star Pointers',
    summary:
      'Used across Hellenistic, Islamic Golden Age, and Renaissance observatories to compute solar altitude, local sidereal time, planetary conjunctions, and maritime latitude.',
    primarySource: 'Al-Biruni, Book of Instruction in the Elements of Astrology (1029 CE)',
    monumentPreset: 'astrolabe-armillary',
    inspectorTarget: { type: 'civilization', id: 'islamic-golden-age' },
  },
  {
    id: 'plate-babylon',
    accessionId: 'CA-575-MES',
    title: 'Ishtar Gate & Stepped Ziggurat',
    subtitle: 'Glazed Brick Processional Sanctuary',
    year: -575,
    yearLabel: 'c. 575 BCE',
    region: 'Babylon, Mesopotamia',
    coords: { lat: 32.5422, lng: 44.421 },
    src: ARCHIVAL_MEDIA.babylonGate.src,
    attribution: ARCHIVAL_MEDIA.babylonGate.attribution,
    medium: 'Cobalt-blue vitreous-glazed kiln brick with low-relief bulls & mušḫuššu',
    dimensions: 'Portal Height 14.3 m · Etemenanki Base 91 × 91 m',
    summary:
      'Anchored the Processional Way into inner Babylon alongside the multi-tiered Etemenanki ziggurat where Babylonian astronomer-scribes compiled multi-century clay ephemerides.',
    primarySource: 'Nebuchadnezzar II Foundation Cylinder & Babylonian Astronomical Diaries',
    monumentPreset: 'ziggurat-gate',
    inspectorTarget: { type: 'civilization', id: 'sumer-babylon' },
  },
  {
    id: 'plate-samarkand',
    accessionId: 'CA-1420-SRK',
    title: 'Ulugh Beg Observatory & Registan',
    subtitle: 'Silk Road Trigonometry & Star Catalogues',
    year: 1420,
    yearLabel: '1420 – 1437 CE',
    region: 'Samarkand, Central Asia',
    coords: { lat: 39.6749, lng: 67.0053 },
    src: ARCHIVAL_MEDIA.samarkand.src,
    attribution: ARCHIVAL_MEDIA.samarkand.attribution,
    medium: 'Fakhri marble meridian sextant trench & cobalt-glazed tilework',
    dimensions: 'Sextant Arc Radius 40.2 m · 1,018 Catalogued Stars',
    summary:
      'Measured the length of the sidereal year to 365 days, 6 hours, 10 minutes, 8 seconds — within 58 seconds of modern atomic measurements — using a giant subterranean marble arc.',
    primarySource: 'Zij-i-Sultani (1437 CE), Ulugh Beg & Ali Qushji',
    monumentPreset: 'astrolabe-armillary',
    inspectorTarget: { type: 'civilization', id: 'silk-road' },
  },
  {
    id: 'plate-machupicchu',
    accessionId: 'CA-1450-INC',
    title: 'Intihuatana & Andean Terraces',
    subtitle: 'Seismic Dry-Stone Granite Engineering',
    year: 1450,
    yearLabel: 'c. 1450 CE',
    region: 'Cusco Region, Peru',
    coords: { lat: -13.1631, lng: -72.545 },
    src: ARCHIVAL_MEDIA.machuPicchu.src,
    attribution: ARCHIVAL_MEDIA.machuPicchu.attribution,
    medium: 'Interlocking mortarless Andean granite ashlar & agricultural terraces',
    dimensions: 'Elevation 2,430 m · 700+ Stone Retaining Terraces',
    summary:
      'Engineered to withstand Andean earthquakes via polygonal interlocking stone joints while the carved Intihuatana stone functioned as a solstice and equinox solar sighting pillar.',
    primarySource: 'Archaeological Stratigraphy & Quechua Oral Quipu Traditions',
    monumentPreset: 'pyramid-obelisk',
    inspectorTarget: { type: 'civilization', id: 'inca-empire' },
  },
  {
    id: 'plate-saturn',
    accessionId: 'CA-2004-SAT',
    title: 'Cassini–Huygens & Saturnian System',
    subtitle: 'Outer Solar System Deep-Space Reconnaissance',
    year: 2004,
    yearLabel: '1997 – 2017 CE',
    region: 'Saturnian Orbit (9.5 AU)',
    coords: { lat: 28.5729, lng: -80.649 },
    src: ARCHIVAL_MEDIA.saturnProbe.src,
    attribution: ARCHIVAL_MEDIA.saturnProbe.attribution,
    medium: '4 m Parabolic High-Gain Antenna, Kapton thermal foil, RTG & Huygens Probe',
    dimensions: 'Orbiter Mass 5,712 kg · 294 Orbits Completed',
    summary:
      'Revealed liquid hydrocarbon seas on Titan, water-ice geysers erupting from Enceladus’s subsurface ocean, and the hexagonal jet stream at Saturn’s north pole.',
    primarySource: 'NASA / ESA / ASI Cassini Grand Finale Telemetry (2017)',
    monumentPreset: 'voyager-probe',
  },
];

export interface DocumentaryChapter {
  id: string;
  title: string;
  yearLabel: string;
  year: number;
  region: string;
  coords: GeoCoord;
  image: string;
  monumentPreset: MonumentPresetId;
  durationSec: number;
  narration: string;
  telemetryNote: string;
  kenBurns: { startScale: number; endScale: number; panX: number; panY: number };
}

export interface DocumentaryReel {
  id: string;
  title: string;
  subtitle: string;
  totalLabel: string;
  chapters: DocumentaryChapter[];
}

export const DOCUMENTARY_REELS: DocumentaryReel[] = [
  {
    id: 'reel-cradles',
    title: 'Twelve Millennia of Stone, Vault & Horizon',
    subtitle: 'Animated Archival Documentary Reel · Synchronized with 3D Coordinates',
    totalLabel: '4 Chapters · Interactive Motion Cinema',
    chapters: [
      {
        id: 'ch-giza',
        title: '01. Solar Geometry at Giza',
        yearLabel: '2560 BCE',
        year: -2560,
        region: 'Nile Delta, Egypt',
        coords: { lat: 29.9792, lng: 31.1342 },
        image: ARCHIVAL_MEDIA.gizaPlateau.src,
        monumentPreset: 'pyramid-obelisk',
        durationSec: 10,
        narration:
          'Along the limestone escarpment of Giza, Old Kingdom surveyors aligned 2.3 million blocks within three-sixtieths of a degree of true north, turning monumental stone into a solar calendar.',
        telemetryNote: '29.98° N, 31.13° E · True North Δ 0.05° · Old Kingdom',
        kenBurns: { startScale: 1.02, endScale: 1.15, panX: -18, panY: -8 },
      },
      {
        id: 'ch-babylon',
        title: '02. Lapis Portals & Star Tablets of Babylon',
        yearLabel: '575 BCE',
        year: -575,
        region: 'Tigris–Euphrates Basin',
        coords: { lat: 32.5422, lng: 44.421 },
        image: ARCHIVAL_MEDIA.babylonGate.src,
        monumentPreset: 'ziggurat-gate',
        durationSec: 10,
        narration:
          'Above cobalt-glazed walls of the Ishtar Gate, temple astronomers tracked Jupiter’s arc in trapezoidal velocity tables on cuneiform clay tablets centuries before Hellenistic calculus.',
        telemetryNote: '32.54° N, 44.42° E · Sexagesimal Ephemerides · Neo-Babylonian',
        kenBurns: { startScale: 1.12, endScale: 1.0, panX: 14, panY: -10 },
      },
      {
        id: 'ch-rome',
        title: '03. Concrete Vaults & Mediterranean Roads',
        yearLabel: '117 CE',
        year: 117,
        region: 'Italian Peninsula & Mediterranean',
        coords: { lat: 41.8925, lng: 12.4853 },
        image: ARCHIVAL_MEDIA.romanForum.src,
        monumentPreset: 'dome-basilica',
        durationSec: 10,
        narration:
          'Pozzolana hydraulic concrete allowed Roman engineers to span unprecedented unreinforced domes and link 80,000 kilometers of paved highways from Britannia to Mesopotamia.',
        telemetryNote: '41.89° N, 12.49° E · 80,000 km Road Network · Pax Romana',
        kenBurns: { startScale: 1.0, endScale: 1.14, panX: 16, panY: 6 },
      },
      {
        id: 'ch-constantinople',
        title: '04. Pendentive Domes on the Bosphorus',
        yearLabel: '1453 CE',
        year: 1453,
        region: 'Constantinople / Istanbul',
        coords: { lat: 41.0086, lng: 28.9802 },
        image: ARCHIVAL_MEDIA.constantinople.src,
        monumentPreset: 'dome-basilica',
        durationSec: 10,
        narration:
          'At the hinge between Europe and Asia, Constantinople fused Roman dome mathematics with Seljuk and Ottoman spatial engineering, culminating in the skyline of the Golden Horn.',
        telemetryNote: '41.01° N, 28.98° E · Dome Ø 31.8 m · Imperial Crossroads',
        kenBurns: { startScale: 1.13, endScale: 1.02, panX: -14, panY: 8 },
      },
    ],
  },
  {
    id: 'reel-observatories',
    title: 'From Brass Astrolabes to Saturn’s Rings',
    subtitle: 'History of Astronomical Instrumentation & Deep-Space Telemetry',
    totalLabel: '4 Chapters · Interactive Motion Cinema',
    chapters: [
      {
        id: 'ch-alexandria',
        title: '01. Hellenistic Circumference of Earth',
        yearLabel: '240 BCE',
        year: -240,
        region: 'Alexandria & Syene',
        coords: { lat: 31.2001, lng: 29.9187 },
        image: ARCHIVAL_MEDIA.alexandriaHero.src,
        monumentPreset: 'astrolabe-armillary',
        durationSec: 10,
        narration:
          'Inside the Mouseion of Alexandria, Eratosthenes compared solstice noon shadows between Syene and Alexandria, calculating Earth’s circumference to within two percent.',
        telemetryNote: '31.20° N, 29.92° E · Shadow Angle 7.2° · Hellenistic Era',
        kenBurns: { startScale: 1.02, endScale: 1.15, panX: 12, panY: -6 },
      },
      {
        id: 'ch-astrolabe',
        title: '02. Stereographic Precision in Brass',
        yearLabel: '1020 CE',
        year: 1020,
        region: 'Baghdad, Córdoba & Istanbul',
        coords: { lat: 33.3152, lng: 44.3661 },
        image: ARCHIVAL_MEDIA.astrolabe.src,
        monumentPreset: 'astrolabe-armillary',
        durationSec: 10,
        narration:
          'By projecting the celestial sphere onto a flat brass plate, astronomers created a handheld analog computer capable of telling time, predicting eclipses, and navigating oceans.',
        telemetryNote: '33.31° N, 44.36° E · Stereographic Projection · Golden Age',
        kenBurns: { startScale: 1.12, endScale: 1.0, panX: -12, panY: 10 },
      },
      {
        id: 'ch-samarkand',
        title: '03. The Marble Sextant of Samarkand',
        yearLabel: '1428 CE',
        year: 1428,
        region: 'Samarkand, Silk Road',
        coords: { lat: 39.6749, lng: 67.0053 },
        image: ARCHIVAL_MEDIA.samarkand.src,
        monumentPreset: 'astrolabe-armillary',
        durationSec: 10,
        narration:
          'Using a 40-meter subterranean marble arc and precision trigonometry, Ulugh Beg and Ali Qushji compiled the Zij-i-Sultani star catalogue with sub-arcminute accuracy.',
        telemetryNote: '39.67° N, 67.00° E · 1,018 Stars · Timurid Renaissance',
        kenBurns: { startScale: 1.0, endScale: 1.14, panX: 16, panY: -8 },
      },
      {
        id: 'ch-cassini',
        title: '04. Cassini Beyond the Frost Line',
        yearLabel: '2017 CE',
        year: 2017,
        region: 'Saturnian Orbit · 9.5 AU',
        coords: { lat: 28.5729, lng: -80.649 },
        image: ARCHIVAL_MEDIA.saturnProbe.src,
        monumentPreset: 'voyager-probe',
        durationSec: 10,
        narration:
          'Five centuries after Samarkand’s marble arc, robotic radio dishes crossed 1.4 billion kilometers to sample Enceladus’s cryogenic plumes and map Saturn’s icy ring dynamics.',
        telemetryNote: '9.54 AU · 294 Saturn Orbits · Cassini–Huygens Mission',
        kenBurns: { startScale: 1.14, endScale: 1.02, panX: -14, panY: -6 },
      },
    ],
  },
];
