// Principales localités de Suisse romande hors canton de Vaud.
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
  'Belfaux', 'Corminboeuf', 'Matran', 'Avry', 'Neyruz', 'Cottens', 'Romont',
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

const JURA_ET_JURA_BERNOIS = [
  'Delémont', 'Porrentruy', 'Moutier', 'Haute-Sorne', 'Val Terbi', 'Courrendlin',
  'Courroux', 'Courtételle', 'Develier', 'Saignelégier', 'Le Noirmont', 'Les Bois',
  'Les Breuleux', 'Alle', 'Courgenay', 'Fontenais', 'Boncourt', 'Haute-Ajoie',
  'Clos du Doubs', 'Bienne', 'Saint-Imier', 'Tramelan', 'Tavannes', 'Valbirse',
  'La Neuveville', 'Reconvilier', 'Court', 'Sonceboz-Sombeval', 'Corgémont', 'Courtelary',
  'Péry-La Heutte', 'Orvin', 'Evilard',
];

/** Toutes les localités proposées, sans doublon, par ordre alphabétique */
export const ROMANDIE_COMMUNES: string[] = Array.from(
  new Set<string>([
    ...(VAUD_COMMUNES as readonly string[]),
    ...GENEVE,
    ...FRIBOURG,
    ...VALAIS,
    ...NEUCHATEL,
    ...JURA_ET_JURA_BERNOIS,
  ]),
).sort((a, b) => a.localeCompare(b, 'fr'));
