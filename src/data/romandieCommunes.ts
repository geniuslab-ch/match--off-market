// Localités et cantons de Suisse romande.
// Liste volontairement non exhaustive : le champ de saisie accepte aussi
// une localité qui n'y figure pas (voir CommuneSelect).

import { VAUD_COMMUNES } from './vaudCommunes';

const GENEVE = [
  'Genève', 'Carouge', 'Lancy', 'Vernier', 'Meyrin', 'Onex', 'Thônex', 'Versoix',
  'Le Grand-Saconnex', 'Chêne-Bougeries', 'Chêne-Bourg', 'Plan-les-Ouates', 'Bernex',
  'Veyrier', 'Cologny', 'Collonge-Bellerive', 'Vandœuvres', 'Satigny', 'Bellevue',
  'Pregny-Chambésy', 'Genthod', 'Confignon', 'Troinex', 'Anières', 'Corsier', 'Meinier',
  'Puplinge', 'Bardonnex', 'Perly-Certoux', 'Dardagny', 'Russin', 'Jussy', 'Choulex',
  'Presinge', 'Gy', 'Hermance', 'Céligny', 'Collex-Bossy', 'Avully', 'Avusy', 'Chancy',
  'Soral', 'Laconnex', 'Cartigny', 'Aire-la-Ville',
];

const FRIBOURG = [
  'Fribourg', 'Bulle', 'Villars-sur-Glâne', 'Marly', 'Granges-Paccot', 'Givisiez',
  'Belfaux', 'Corminboeuf', 'Matran', 'Avry', 'Neyruz', 'Cottens (FR)', 'Romont',
  'Châtel-Saint-Denis', 'Attalens', 'Bossonnens', 'Remaufens', 'Semsales', 'Estavayer',
  'Morat', 'Courtepin', 'Mont-Vully', 'Gruyères', 'Broc', 'Val-de-Charmey', 'Riaz',
  'Vuadens', 'Marsens', 'Sâles', 'Gibloux', 'Hauterive (FR)', 'Le Mouret', 'Treyvaux',
  'Ursy', 'Rue', 'Siviriez', 'Belmont-Broye', 'Cugy (FR)', 'Saint-Aubin (FR)',
  'Cheyres-Châbles', 'Delley-Portalban',
];

const VALAIS = [
  'Sion', 'Martigny', 'Monthey', 'Sierre', 'Conthey', 'Fully', 'Collombey-Muraz',
  'Val de Bagnes', 'Verbier', 'Savièse', 'Nendaz', 'Crans-Montana', 'Saint-Maurice',
  'Vétroz', 'Ayent', 'Saxon', 'Chamoson', 'Ardon', 'Riddes', 'Leytron', 'Saillon',
  'Orsières', 'Troistorrents', "Val-d'Illiez", 'Champéry', 'Port-Valais', 'Vouvry',
  'Saint-Gingolph', 'Vionnaz', 'Massongex', 'Evionnaz', 'Vernayaz', 'Salvan',
  'Martigny-Combe', 'Sembrancher', 'Veysonnaz', 'Vex', 'Hérémence', 'Evolène',
  'Grimisuat', 'Arbaz', 'Lens', 'Icogne', 'Chalais', 'Chippis', 'Grône',
  'Saint-Léonard', 'Anniviers', 'Noble-Contrée',
];

const NEUCHATEL = [
  'Neuchâtel', 'La Chaux-de-Fonds', 'Le Locle', 'Val-de-Ruz', 'Val-de-Travers', 'Boudry',
  'Milvignes', 'La Grande Béroche', 'Cortaillod', 'Saint-Blaise', 'Hauterive (NE)',
  'La Tène', 'Le Landeron', 'Cressier (NE)', 'Cornaux', 'Rochefort', 'Les Ponts-de-Martel',
  'La Sagne', 'La Brévine', 'Lignières', 'Les Verrières',
];

const JURA = [
  'Delémont', 'Porrentruy', 'Haute-Sorne', 'Val Terbi', 'Courrendlin',
  'Courroux', 'Courtételle', 'Develier', 'Saignelégier', 'Le Noirmont', 'Les Bois',
  'Les Breuleux', 'Alle', 'Courgenay', 'Fontenais', 'Boncourt', 'Haute-Ajoie',
  'Clos du Doubs',
];

// Jura bernois et Bienne : francophones mais dans le canton de Berne (proposés comme localités seulement)
const JURA_BERNOIS = [
  'Moutier', 'Bienne', 'Saint-Imier', 'Tramelan', 'Tavannes', 'Valbirse',
  'La Neuveville', 'Reconvilier', 'Court', 'Sonceboz-Sombeval', 'Corgémont', 'Courtelary',
  'Péry-La Heutte', 'Orvin', 'Evilard',
];

/** Cantons proposés comme zone de recherche (« tout le canton ») */
export const CANTONS = [
  { code: 'VD', label: 'Canton de Vaud', communes: VAUD_COMMUNES as readonly string[] },
  { code: 'GE', label: 'Canton de Genève', communes: GENEVE },
  { code: 'FR', label: 'Canton de Fribourg', communes: FRIBOURG },
  { code: 'VS', label: 'Canton du Valais', communes: VALAIS },
  { code: 'NE', label: 'Canton de Neuchâtel', communes: NEUCHATEL },
  { code: 'JU', label: 'Canton du Jura', communes: JURA },
] as const;

export type CantonCode = (typeof CANTONS)[number]['code'];

/** Canton d'une localité de la liste, ou null si elle n'y figure pas */
export function cantonOfCommune(commune: string): CantonCode | null {
  const c = commune.trim().toLowerCase();
  for (const canton of CANTONS) {
    if (canton.communes.some((x) => x.toLowerCase() === c)) return canton.code;
  }
  return null;
}

/** Code du canton si la zone choisie est un canton entier (« Canton de Vaud »), sinon null */
export function cantonOfZone(zone: string): CantonCode | null {
  const z = zone.trim().toLowerCase();
  return CANTONS.find((c) => c.label.toLowerCase() === z)?.code ?? null;
}

/** Toutes les localités proposées, sans doublon, par ordre alphabétique */
export const ROMANDIE_COMMUNES: string[] = Array.from(
  new Set<string>([
    ...(VAUD_COMMUNES as readonly string[]),
    ...GENEVE,
    ...FRIBOURG,
    ...VALAIS,
    ...NEUCHATEL,
    ...JURA,
    ...JURA_BERNOIS,
  ]),
).sort((a, b) => a.localeCompare(b, 'fr'));
