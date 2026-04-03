/**
 * CercaFungo — Database Specie Fungine
 *
 * Focus: specie della Valtellina e delle Alpi/Prealpi italiane.
 * Dati accurati per identificazione, sicurezza alimentare e ecologia.
 *
 * ATTENZIONE: Questo database e' uno strumento di supporto.
 * NON sostituisce il parere di un micologo esperto o dell'ASL.
 * In caso di dubbio, NON consumare il fungo.
 */

export interface Species {
  id: string;
  scientificName: string;
  italianName: string;
  alternativeNames: string[];
  family: string;

  edibility:
    | 'ottimo'
    | 'buono'
    | 'commestibile'
    | 'non_commestibile'
    | 'tossico'
    | 'mortale';
  edibilityNote: string;

  // Visual identification
  capDescription: string;
  capColor: string[];
  capDiameterCm: [number, number];
  stemDescription: string;
  gillsDescription: string;
  fleshDescription: string;
  sporeColor: string;

  // Ecology
  habitat: string[];
  altitude: [number, number];
  season: {
    start: number;
    end: number;
    peak: number;
  };
  substrate: string;
  symbioticTrees: string[];

  // Detection helpers
  typicalSize: 'piccolo' | 'medio' | 'grande';
  growthPattern: 'singolo' | 'gregario' | 'cespitoso';
  visibility: 'alta' | 'media' | 'bassa';

  // Lookalikes (CRITICAL for safety)
  confusableWith: {
    speciesId: string;
    dangerLevel: 'basso' | 'medio' | 'alto' | 'mortale';
    differences: string;
  }[];

  funFact: string;

  iNaturalistTaxonId: number;
  modelClassId: number;
}

/**
 * Backward-compatible type alias.
 * Consumer code that imported MushroomSpecies will continue to work.
 */
export type MushroomSpecies = Species;

export const SPECIES_DATABASE: Species[] = [
  // ============================================================
  // COMMESTIBILI PREGIATI — Focus Valtellina
  // ============================================================

  // 1. Boletus edulis
  {
    id: 'boletus-edulis',
    scientificName: 'Boletus edulis',
    italianName: 'Porcino',
    alternativeNames: [
      'Fungo porcino',
      'Brisa (Valtellina)',
      'Moro',
      'Ceppatello',
      'Funsc (dialetto valtellinese)',
    ],
    family: 'Boletaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente sia crudo (carpaccio) che cotto. Ottimo essiccato. Il re dei funghi della Valtellina, protagonista di pizzoccheri e risotti.',
    capDescription:
      'Cappello emisferico da giovane, poi convesso e infine piano-convesso a maturita. Cuticola liscia, leggermente viscida con umidita, opaca a secco. Margine sottile, regolare, spesso più chiaro. Nei giovani esemplari il bordo e spesso biancastro.',
    capColor: ['bruno', 'marrone', 'nocciola', 'bruno-rossastro', 'beige'],
    capDiameterCm: [5, 30],
    stemDescription:
      'Robusto, ventricoso (panciuto) soprattutto da giovane, poi più slanciato. Colore biancastro con reticolo a maglie chiare nella parte superiore. Pieno, sodo, mai cavo.',
    gillsDescription:
      'Tubuli e pori (non lamelle). Tubuli lunghi, liberi o quasi, bianchi da giovane poi giallo-verdastri a maturita. Pori piccoli, rotondi, dello stesso colore dei tubuli. MAI rosa o rossi.',
    fleshDescription:
      'Bianca, immutabile al taglio (non vira). Soda e compatta da giovane, poi più molle a maturita. Odore gradevole fungino, sapore dolce di nocciola.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['faggeta', 'abetaia', 'pecceta', 'bosco misto', 'castagneto'],
    altitude: [400, 1800],
    season: { start: 6, end: 11, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: [
      'faggio',
      'abete rosso',
      'abete bianco',
      'castagno',
      'quercia',
    ],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'boletus-satanas',
        dangerLevel: 'alto',
        differences:
          'Il Boletus satanas ha pori rossi/arancioni (mai verdi/gialli come il porcino) e la carne vira al blu al taglio. Il gambo ha reticolo rosso.',
      },
      {
        speciesId: 'tylopilus-felleus',
        dangerLevel: 'basso',
        differences:
          'Il Tylopilus felleus (Porcino falso/amaro) ha pori rosa a maturita, reticolo scuro sul gambo e sapore amarissimo. Basta assaggiare un pezzetto di carne (sputandolo) per distinguerlo.',
      },
    ],
    funFact:
      'In Valtellina il porcino e detto "brisa" ed e talmente importante che esistono sagre dedicate. Un singolo esemplare può pesare oltre 2 kg. Il record italiano supera i 3 kg.',
    iNaturalistTaxonId: 48701,
    modelClassId: 1,
  },

  // 2. Boletus aereus
  {
    id: 'boletus-aereus',
    scientificName: 'Boletus aereus',
    italianName: 'Porcino nero',
    alternativeNames: [
      'Porcino bronzino',
      'Bronzino',
      'Moreccio',
      'Porcino reale',
    ],
    family: 'Boletaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Considerato da molti il più pregiato tra i porcini. Carne compatta e profumata, eccezionale crudo a fettine sottili.',
    capDescription:
      'Cappello emisferico poi convesso. Cuticola asciutta, vellutata, talvolta screpolata. Piu scuro del B. edulis.',
    capColor: ['bruno-scuro', 'nerastro', 'bronzo', 'bruno-fuliggine'],
    capDiameterCm: [5, 25],
    stemDescription:
      'Robusto, ventricoso, color ocra-brunastro con reticolo fine concolore o leggermente più chiaro.',
    gillsDescription:
      'Tubuli e pori bianchi da giovane, poi giallo-olivastri. Pori piccoli, rotondi.',
    fleshDescription:
      'Bianca, soda, immutabile al taglio. Odore molto gradevole, sapore dolce di nocciola intenso.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['querceto', 'castagneto', 'bosco misto termofilo'],
    altitude: [200, 1200],
    season: { start: 6, end: 10, peak: 8 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'castagno', 'faggio', 'leccio'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'boletus-satanas',
        dangerLevel: 'alto',
        differences:
          'Il B. satanas ha pori rossi, carne che vira al blu e cappello biancastro/grigio. Il B. aereus ha pori giallo-verdastri e cappello scuro.',
      },
    ],
    funFact:
      "Detto \"re dei porcini\" per la consistenza superiore della carne. In Valtellina e meno comune dell'edulis perche predilige quote più basse e boschi termofili.",
    iNaturalistTaxonId: 116856,
    modelClassId: 2,
  },

  // 3. Boletus pinophilus
  {
    id: 'boletus-pinophilus',
    scientificName: 'Boletus pinophilus',
    italianName: 'Porcino dei pini',
    alternativeNames: ['Porcino rosso', 'Porcino delle conifere'],
    family: 'Boletaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente commestibile, paragonabile al B. edulis. Carne soda e profumata, ottimo trifolato.',
    capDescription:
      'Cappello emisferico poi convesso. Cuticola liscia o leggermente feltrata, con sfumature rosso-brune caratteristiche.',
    capColor: ['rosso-bruno', 'mattone', 'bruno-vinoso', 'mogano'],
    capDiameterCm: [6, 25],
    stemDescription:
      'Robusto, panciuto, color bruno-rossastro chiaro con reticolo fine, spesso poco evidente.',
    gillsDescription:
      'Tubuli e pori bianchi da giovane, giallo-olivastri a maturita.',
    fleshDescription:
      'Bianca, immutabile, soda. Sotto la cuticola leggermente rosata. Odore fungino intenso.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['pineta', 'pecceta', 'abetaia', 'bosco di conifere'],
    altitude: [800, 2000],
    season: { start: 6, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['pino silvestre', 'pino cembro', 'abete rosso'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'tylopilus-felleus',
        dangerLevel: 'basso',
        differences:
          'Il T. felleus ha pori rosa e sapore amaro. Il B. pinophilus ha pori giallo-verdastri e sapore dolce.',
      },
    ],
    funFact:
      'E il porcino più tipico delle alte quote in Valtellina, spesso trovato sotto pini cembri sopra i 1500 metri. Può raggiungere dimensioni notevoli.',
    iNaturalistTaxonId: 326763,
    modelClassId: 3,
  },

  // 4. Boletus reticulatus
  {
    id: 'boletus-reticulatus',
    scientificName: 'Boletus reticulatus',
    italianName: 'Porcino estivo',
    alternativeNames: [
      'Boletus aestivalis',
      'Porcino primaverile',
      'Ceppatello buono',
    ],
    family: 'Boletaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente commestibile, il primo porcino della stagione. Meglio consumato fresco, si deteriora velocemente.',
    capDescription:
      'Cappello convesso poi piano. Cuticola asciutta, finemente vellutata, spesso screpolata a secco con screpolature che lasciano vedere la carne bianca sottostante.',
    capColor: ['nocciola chiaro', 'beige', 'ocra', 'camoscio'],
    capDiameterCm: [5, 20],
    stemDescription:
      'Robusto, slanciato, con reticolo molto evidente e a maglie larghe su tutta la lunghezza. Color nocciola chiaro.',
    gillsDescription:
      'Tubuli bianchi poi giallo-olivastri. Pori piccoli, concolori.',
    fleshDescription:
      'Bianca, molle, immutabile. Odore gradevole, sapore dolce. Piu tenera degli altri porcini.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['querceto', 'castagneto', 'faggeta', 'bosco misto'],
    altitude: [200, 1200],
    season: { start: 5, end: 9, peak: 7 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'castagno', 'faggio', 'carpino'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'tylopilus-felleus',
        dangerLevel: 'basso',
        differences:
          'Il T. felleus ha pori rosa e reticolo più scuro. Assaggiare un pezzetto di carne: se amaro, e il felleus.',
      },
    ],
    funFact:
      'E il primo porcino a comparire, gia da maggio-giugno, anticipando i cugini di settembre. In annate favorevoli si trova gia a bassa quota in Valtellina.',
    iNaturalistTaxonId: 326762,
    modelClassId: 4,
  },

  // 5. Cantharellus cibarius
  {
    id: 'cantharellus-cibarius',
    scientificName: 'Cantharellus cibarius',
    italianName: 'Gallinaccio',
    alternativeNames: [
      'Finferlo',
      'Finferla (Valtellina)',
      'Galletto',
      'Giallino',
      'Garitola',
      'Cantarello',
    ],
    family: 'Cantharellaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente commestibile, praticamente privo di parassiti. Ottimo trifolato, in risotti e con la polenta. Non richiede precauzioni particolari.',
    capDescription:
      'Cappello inizialmente convesso poi imbutiforme a maturita, con margine ondulato e irregolare. Superficie liscia e asciutta.',
    capColor: ['giallo', 'giallo-uovo', 'giallo-arancio'],
    capDiameterCm: [3, 10],
    stemDescription:
      'Pieno, sodo, attenuato verso la base, concolore al cappello. Si restringe verso il basso.',
    gillsDescription:
      'Pseudolamelle (pliche) decorrenti sul gambo, spesse, distanziate, ramificate, concolori al cappello. NON sono vere lamelle ma costolature.',
    fleshDescription:
      'Giallina, soda, compatta. Odore fruttato di albicocca caratteristico. Sapore dolce con lieve nota pepata.',
    sporeColor: 'Giallo pallido',
    habitat: ['faggeta', 'bosco misto', 'castagneto', 'abetaia', 'querceto'],
    altitude: [300, 1600],
    season: { start: 6, end: 10, peak: 8 },
    substrate: 'terreno, muschio',
    symbioticTrees: [
      'faggio',
      'castagno',
      'quercia',
      'abete rosso',
      'betulla',
    ],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'omphalotus-olearius',
        dangerLevel: 'alto',
        differences:
          "L'Omphalotus olearius ha vere lamelle (non pliche), cresce su legno (ceppaie), e più grande e bioluminescente al buio. Il gallinaccio ha pseudolamelle spesse e decorrenti e cresce a terra.",
      },
      {
        speciesId: 'hygrophoropsis-aurantiaca',
        dangerLevel: 'basso',
        differences:
          "L'Hygrophoropsis aurantiaca (Falso gallinaccio) ha lamelle vere, sottili e fitte, colore arancione più intenso. Non tossico ma sgradevole.",
      },
    ],
    funFact:
      "In Valtellina i finferli si raccolgono abbondanti nei boschi di faggio. L'odore di albicocca e inconfondibile. Si conservano bene sott'olio o essiccati.",
    iNaturalistTaxonId: 48230,
    modelClassId: 5,
  },

  // 6. Amanita caesarea
  {
    id: 'amanita-caesarea',
    scientificName: 'Amanita caesarea',
    italianName: 'Ovolo buono',
    alternativeNames: [
      'Fungo reale',
      'Cocco',
      'Uovo reale',
      'Boleto dei cesari',
    ],
    family: 'Amanitaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Il più pregiato in assoluto. Eccellente crudo in insalata quando giovane. ATTENZIONE: da giovane (stadio di "uovo") e confondibile con le Amanite mortali.',
    capDescription:
      'Cappello inizialmente chiuso nell\'uovo (volva), poi emisferico, infine piano-convesso. Cuticola liscia, lucida, brillante, margine striato.',
    capColor: ['arancione vivo', 'rosso-arancio', 'giallo-arancio'],
    capDiameterCm: [8, 20],
    stemDescription:
      'Giallo, cilindrico, con anello giallo membranoso pendente. Base avvolta da una volva bianca ampia e persistente a forma di sacco.',
    gillsDescription:
      'Lamelle fitte, libere, giallo-oro. La sporata e bianca.',
    fleshDescription:
      'Gialla sotto la cuticola, bianca altrove. Tenera, sapore delicato dolce, odore tenue gradevole.',
    sporeColor: 'Bianco',
    habitat: ['querceto', 'castagneto', 'bosco termofilo', 'lecceta'],
    altitude: [100, 1000],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'castagno', 'leccio', 'faggio'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'amanita-muscaria',
        dangerLevel: 'alto',
        differences:
          "L'A. muscaria ha cappello rosso con verruche bianche (residui del velo), gambo bianco e anello bianco. L'A. caesarea ha gambo giallo, anello giallo e cappello arancione SENZA verruche.",
      },
      {
        speciesId: 'amanita-phalloides',
        dangerLevel: 'mortale',
        differences:
          "PERICOLO MORTALE allo stadio di uovo chiuso! L'uovo dell'A. phalloides, tagliato a meta, mostra cappello verdastro. L'uovo dell'A. caesarea mostra cappello arancione. MAI raccogliere Amanite allo stadio di uovo se non si e esperti.",
      },
    ],
    funFact:
      "Gia gli antichi Romani lo consideravano il fungo più pregiato. L'imperatore Claudio ne era ghiotto (e forse fu avvelenato con un piatto di ovoli dalla moglie Agrippina). In Valtellina e raro, più comune a basse quote.",
    iNaturalistTaxonId: 48683,
    modelClassId: 6,
  },

  // 7. Craterellus cornucopioides
  {
    id: 'craterellus-cornucopioides',
    scientificName: 'Craterellus cornucopioides',
    italianName: 'Trombetta dei morti',
    alternativeNames: [
      'Cornucopia',
      'Craterello',
      'Trombetta',
      'Fungo ferro',
    ],
    family: 'Cantharellaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente essiccato (il sapore si intensifica). Ottimo in risotti, salse e come condimento ridotto in polvere. Si conserva perfettamente.',
    capDescription:
      'Corpo a forma di tromba/imbuto, cavo fino alla base. Margine ondulato e lobato. Superficie interna brunastra e fibrillosa.',
    capColor: ['nero', 'grigio-nerastro', 'bruno-scuro'],
    capDiameterCm: [2, 8],
    stemDescription:
      'Praticamente assente, il corpo e un tubo cavo che si restringe verso la base.',
    gillsDescription:
      'Superficie esterna liscia o appena rugosa, grigio-cinerina, senza lamelle ne pori. Le spore si formano sulla superficie esterna.',
    fleshDescription:
      'Sottile, elastica, grigio-nerastra. Odore gradevole fruttato, sapore delicato.',
    sporeColor: 'Bianco-crema',
    habitat: ['faggeta', 'bosco misto', 'castagneto'],
    altitude: [300, 1400],
    season: { start: 9, end: 11, peak: 10 },
    substrate: 'lettiera, terreno umido',
    symbioticTrees: ['faggio', 'castagno', 'quercia', 'carpino'],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'bassa',
    confusableWith: [],
    funFact:
      "Chiamato \"trombetta dei morti\" perche appare verso il 1-2 novembre (giorno dei morti). Difficilissimo da trovare per il colore mimetico con la lettiera. Una volta individuato il primo, se ne trovano decine. In Valtellina abbonda nelle faggete.",
    iNaturalistTaxonId: 48229,
    modelClassId: 7,
  },

  // 8. Hydnum repandum
  {
    id: 'hydnum-repandum',
    scientificName: 'Hydnum repandum',
    italianName: 'Steccherino dorato',
    alternativeNames: ['Dentino', 'Lingua di gatto', 'Steccherino'],
    family: 'Hydnaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile. I giovani esemplari sono i migliori, quelli maturi possono essere amarognoli. Eliminare gli aculei nei funghi adulti.',
    capDescription:
      'Cappello irregolare, convesso poi piano, spesso lobato e con margine ondulato. Cuticola asciutta, liscia, opaca.',
    capColor: ['giallo-arancio', 'crema', 'ocra chiaro', 'salmone pallido'],
    capDiameterCm: [3, 15],
    stemDescription:
      'Corto, tozzo, eccentrico, biancastro o concolore al cappello. Pieno, sodo.',
    gillsDescription:
      'Aculei (idni) fitti, fragili, decorrenti sul gambo, bianchi poi crema. Si staccano facilmente con il dito — caratteristica diagnostica.',
    fleshDescription:
      'Bianca o crema, soda, fragile. Odore debole, sapore dolce nei giovani, amarognolo negli adulti.',
    sporeColor: 'Bianco-crema',
    habitat: ['faggeta', 'bosco misto', 'abetaia', 'querceto'],
    altitude: [300, 1500],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno, muschio',
    symbioticTrees: ['faggio', 'quercia', 'abete rosso', 'castagno'],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [],
    funFact:
      'Inconfondibile grazie agli aculei sotto il cappello (al posto delle lamelle). Nessun fungo tossico ha questo tipo di imenoforo. E uno dei funghi più sicuri da raccogliere per i principianti.',
    iNaturalistTaxonId: 47453,
    modelClassId: 8,
  },

  // 9. Macrolepiota procera
  {
    id: 'macrolepiota-procera',
    scientificName: 'Macrolepiota procera',
    italianName: 'Mazza di tamburo',
    alternativeNames: [
      'Parasole',
      'Puppola',
      'Ombrellone',
      'Bubbola maggiore',
    ],
    family: 'Agaricaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente il cappello impanato e fritto. Il gambo e troppo fibroso e va scartato. Consumare SOLO esemplari ben aperti per sicura identificazione. MAI raccogliere piccole Lepiota.',
    capDescription:
      'Cappello inizialmente ovoidale poi convesso e infine piano-espanso, come un ombrello. Cuticola brunastra che si rompe in squame grossolane su fondo chiaro. Umbone centrale brunastro.',
    capColor: ['bruno', 'crema con squame brune', 'beige', 'nocciola'],
    capDiameterCm: [10, 35],
    stemDescription:
      'Molto alto (fino a 40 cm), slanciato, fibroso e cavo. Superficie con screziature brunastre a bande (zebratura). Anello doppio, mobile, scorrevole lungo il gambo. Base ingrossata ma senza volva.',
    gillsDescription:
      'Lamelle fitte, libere (staccate dal gambo), bianche poi crema. Alte.',
    fleshDescription:
      'Bianca, molle nel cappello, fibrosa nel gambo. Immutabile. Odore e sapore gradevoli di nocciola.',
    sporeColor: 'Bianco',
    habitat: ['prato', 'margine del bosco', 'radure', 'pascolo', 'parco'],
    altitude: [100, 1400],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno, prati',
    symbioticTrees: [],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'chlorophyllum-rhacodes',
        dangerLevel: 'basso',
        differences:
          'Il Chlorophyllum rhacodes ha carne che vira al rosso-arancione al taglio e gambo senza zebratura. Commestibile ma causa disturbi in soggetti sensibili.',
      },
      {
        speciesId: 'amanita-phalloides',
        dangerLevel: 'mortale',
        differences:
          "ATTENZIONE: le piccole Lepiota (genere Lepiota) sono MORTALI. Non raccogliere MAI Macrolepiota sotto i 10 cm di diametro. L'A. phalloides ha volva, anello non mobile, lamelle bianche.",
      },
    ],
    funFact:
      'Può raggiungere i 40 cm di altezza, rendendola una delle specie più imponenti dei nostri prati. In Valtellina si trova nei prati montani e ai margini dei boschi. Il cappello impanato e detto "cotoletta di fungo".',
    iNaturalistTaxonId: 48178,
    modelClassId: 9,
  },

  // 10. Armillaria mellea
  {
    id: 'armillaria-mellea',
    scientificName: 'Armillaria mellea',
    italianName: 'Chiodino',
    alternativeNames: [
      'Famigliola buona',
      'Cioditt (dialetto lombardo)',
      'Agarico color miele',
    ],
    family: 'Physalacriaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile ma SOLO dopo cottura prolungata (almeno 15-20 minuti). TOSSICO DA CRUDO. Eliminare il gambo che e troppo fibroso. Raccogliere solo esemplari giovani.',
    capDescription:
      'Cappello convesso poi piano, con piccolo umbone. Superficie con squamette brunastre concentrate al centro. Cuticola leggermente viscida.',
    capColor: ['miele', 'giallo-brunastro', 'ocra', 'bruno chiaro'],
    capDiameterCm: [3, 10],
    stemDescription:
      'Slanciato, fibroso, con anello membranoso biancastro. Cresce spesso in cespiti dalla stessa base.',
    gillsDescription:
      'Lamelle adnate o poco decorrenti, biancastre poi macchiate di brunastro.',
    fleshDescription:
      'Biancastra, fibrosa nel gambo, tenera nel cappello. Odore debole fungino, sapore leggermente acidulo.',
    sporeColor: 'Bianco-crema',
    habitat: ['bosco misto', 'ceppaie', 'tronchi', 'radici'],
    altitude: [100, 1400],
    season: { start: 9, end: 11, peak: 10 },
    substrate: 'legno (vivo o morto), ceppaie, radici',
    symbioticTrees: [
      'quercia',
      'castagno',
      'faggio',
      'acero',
      'frassino',
      'olmo',
    ],
    typicalSize: 'piccolo',
    growthPattern: 'cespitoso',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'hypholoma-fasciculare',
        dangerLevel: 'alto',
        differences:
          "L'Hypholoma fasciculare (Falso chiodino) ha lamelle giallo-verdastre (mai bianche), colore più acceso giallo-zolfo, sapore amaro e manca di anello. I chiodini veri hanno anello e lamelle chiare.",
      },
      {
        speciesId: 'galerina-marginata',
        dangerLevel: 'mortale',
        differences:
          "La Galerina marginata e MORTALE (stesse tossine dell'A. phalloides). Cresce su legno, ha anello, ma e più piccola, brunastra uniforme, senza squame sul cappello e cresce in gruppetti ridotti (non in grossi cespi).",
      },
    ],
    funFact:
      "I chiodini sono in realta un parassita temibile delle piante forestali. L'Armillaria e considerata l'organismo vivente più grande del mondo: un singolo individuo nello stato dell'Oregon (USA) si estende per 9 km quadrati.",
    iNaturalistTaxonId: 48206,
    modelClassId: 10,
  },

  // 11. Lactarius deliciosus
  {
    id: 'lactarius-deliciosus',
    scientificName: 'Lactarius deliciosus',
    italianName: 'Sanguinello',
    alternativeNames: [
      'Sanguigno',
      'Fungo del sangue',
      'Lactario delizioso',
      'Rosella',
    ],
    family: 'Russulaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, ottimo alla griglia o trifolato. Il latice arancione e commestibile. Attenzione: macchia di verde le dita e le urine!',
    capDescription:
      'Cappello convesso poi depresso al centro, infine imbutiforme. Cuticola liscia, leggermente viscida, con zonature concentriche.',
    capColor: [
      'arancione',
      'arancio-rossastro',
      'arancione con zone verdastre',
    ],
    capDiameterCm: [4, 15],
    stemDescription:
      'Cilindrico, corto, presto cavo, arancione con scrobicoli (fossette) più scure.',
    gillsDescription:
      'Lamelle fitte, decorrenti, arancioni. Se spezzate emettono latice arancione carota che vira al verde dopo qualche ora.',
    fleshDescription:
      'Arancione pallido, granulosa (come le Russule). Latice arancione-carota abbondante, vira al verde. Odore fruttato, sapore dolce.',
    sporeColor: 'Crema-ocra',
    habitat: ['pineta', 'bosco di conifere'],
    altitude: [300, 1800],
    season: { start: 8, end: 11, peak: 10 },
    substrate: 'terreno',
    symbioticTrees: ['pino silvestre', 'pino nero', 'abete rosso'],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'lactarius-torminosus',
        dangerLevel: 'medio',
        differences:
          'Il L. torminosus ha cappello rosa-incarnato con margine peloso, latice bianco (non arancione) e sapore pepato. E tossico da crudo, causa forti disturbi gastrointestinali.',
      },
    ],
    funFact:
      "Il nome \"sanguinello\" deriva dal latice arancione che ricorda il sangue. In Spagna e il fungo più raccolto e consumato (\"niscalo\"). In Valtellina si trova nelle pinete da agosto a novembre.",
    iNaturalistTaxonId: 48425,
    modelClassId: 11,
  },

  // 12. Morchella esculenta
  {
    id: 'morchella-esculenta',
    scientificName: 'Morchella esculenta',
    italianName: 'Spugnola',
    alternativeNames: ['Spugnola gialla', 'Morchella', 'Spongitola'],
    family: 'Morchellaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente dopo cottura. TOSSICA DA CRUDA (contiene emolisine termolabili). Cuocere almeno 15 minuti. Mai essiccare e mangiare subito: reidratare e cuocere.',
    capDescription:
      "Corpo fruttifero a forma di spugna ovoidale con alveoli irregolari. Interamente cavo. Cappello saldato al gambo alla base.",
    capColor: ['giallo-ocra', 'bruno chiaro', 'miele'],
    capDiameterCm: [3, 10],
    stemDescription:
      'Cilindrico, cavo, biancastro o crema, con superficie finemente granulosa. Fragile.',
    gillsDescription:
      'Assenti. L\'imenoforo e costituito dagli alveoli (creste e depressioni) sulla superficie del cappello.',
    fleshDescription:
      'Sottile, fragile, cerosa, biancastra. Odore gradevole spermatico caratteristico. Sapore delicato.',
    sporeColor: 'Crema',
    habitat: [
      'frutteto',
      'parco',
      'bosco di latifoglie',
      'terreno sabbioso',
      'zone bruciate',
    ],
    altitude: [100, 1200],
    season: { start: 3, end: 5, peak: 4 },
    substrate: 'terreno, zone disturbate',
    symbioticTrees: ['frassino', 'olmo', 'melo', 'pioppo'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'bassa',
    confusableWith: [
      {
        speciesId: 'gyromitra-esculenta',
        dangerLevel: 'mortale',
        differences:
          "La Gyromitra esculenta ha cappello cerebroide (a forma di cervello, non alveolato), irregolare, non cavo internamente ma con setti. La Morchella ha alveoli regolari ed e completamente cava.",
      },
    ],
    funFact:
      'Appaiono misteriosamente dopo gli incendi boschivi. In Valtellina si trovano in primavera, spesso nei frutteti e lungo i torrenti. Sono tra i funghi più costosi al mondo: fino a 500 euro/kg da freschi.',
    iNaturalistTaxonId: 48577,
    modelClassId: 12,
  },

  // 13. Tricholoma terreum
  {
    id: 'tricholoma-terreum',
    scientificName: 'Tricholoma terreum',
    italianName: 'Moretta',
    alternativeNames: [
      'Tricoloma terrestre',
      'Moretta grigia',
      'Cicalotto',
    ],
    family: 'Tricholomataceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile discreto. Controverso: studi recenti suggeriscono possibile tossicita cumulativa (rabdomiolisi) in caso di consumo eccessivo. Non consumare in grandi quantita per più giorni consecutivi.',
    capDescription:
      'Cappello campanulato poi piano-convesso, con umbone basso. Cuticola asciutta, fibrillosa, con fibrille radiali grigio-scure.',
    capColor: ['grigio', 'grigio-topo', 'grigio-brunastro'],
    capDiameterCm: [4, 10],
    stemDescription:
      'Cilindrico, biancastro, fibrilloso, pieno poi cavo.',
    gillsDescription:
      'Lamelle smarginate, fitte, bianco-grigiastre, con filo irregolare.',
    fleshDescription:
      'Biancastra, fragile. Odore debole farinoso, sapore mite farinoso.',
    sporeColor: 'Bianco',
    habitat: ['pineta', 'bosco di conifere'],
    altitude: [300, 1500],
    season: { start: 9, end: 12, peak: 11 },
    substrate: 'terreno, lettiera di aghi',
    symbioticTrees: ['pino silvestre', 'pino nero', 'abete rosso'],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'bassa',
    confusableWith: [
      {
        speciesId: 'tricholoma-pardinum',
        dangerLevel: 'alto',
        differences:
          'Il T. pardinum (Agarico tigrino) e molto più grande (cap 8-15 cm), ha squame concentriche evidenti sul cappello e cresce sotto latifoglie, non conifere.',
      },
    ],
    funFact:
      'Una delle ultime specie a fruttificare prima dell\'inverno. In Valtellina la moretta si trova nelle pinete fino a dicembre inoltrato.',
    iNaturalistTaxonId: 53720,
    modelClassId: 13,
  },

  // 14. Russula cyanoxantha
  {
    id: 'russula-cyanoxantha',
    scientificName: 'Russula cyanoxantha',
    italianName: 'Colombina maggiore',
    alternativeNames: ['Russula buona', 'Verdone', 'Colombina'],
    family: 'Russulaceae',
    edibility: 'buono',
    edibilityNote:
      'Ottimo commestibile, il migliore del genere Russula. Buono crudo in insalata o cotto. Sapore dolce, nullo.',
    capDescription:
      'Cappello convesso poi piano-depresso. Cuticola viscida, lucida, con colori variabili mescolati. Margine liscio non striato.',
    capColor: [
      'viola',
      'lilla',
      'verdastro',
      'grigio-violaceo',
      'mescolanza di colori',
    ],
    capDiameterCm: [5, 15],
    stemDescription:
      'Bianco, sodo, cilindrico, pieno. Superficie liscia.',
    gillsDescription:
      'Lamelle fitte, annesse, bianche. Morbide e FLESSIBILI al tatto (non si spezzano — caratteristica unica tra le Russule).',
    fleshDescription:
      'Bianca, soda, immutabile. Sapore dolce, nessun sapore piccante. Odore debole.',
    sporeColor: 'Bianco',
    habitat: ['faggeta', 'bosco misto', 'querceto'],
    altitude: [300, 1400],
    season: { start: 6, end: 10, peak: 8 },
    substrate: 'terreno',
    symbioticTrees: ['faggio', 'quercia', 'castagno', 'betulla'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'russula-emetica',
        dangerLevel: 'medio',
        differences:
          'La R. emetica e tutta rossa con lamelle fragili e sapore MOLTO piccante. La R. cyanoxantha ha colori misti viola-verde e lamelle flessibili e sapore dolce.',
      },
    ],
    funFact:
      'Unica tra tutte le Russule ad avere lamelle elastiche (si piegano senza rompersi). Questo la rende facilissima da identificare anche per i principianti. Test semplice: premi una lamella con il dito.',
    iNaturalistTaxonId: 48344,
    modelClassId: 14,
  },

  // 15. Pleurotus ostreatus
  {
    id: 'pleurotus-ostreatus',
    scientificName: 'Pleurotus ostreatus',
    italianName: 'Orecchione',
    alternativeNames: [
      'Gelone',
      'Fungo ostrica',
      'Sbrise (Valtellina)',
      'Pleuroto',
    ],
    family: 'Pleurotaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, ottimo impanato, in umido o trifolato. Raccogliere solo esemplari giovani. Si coltiva facilmente.',
    capDescription:
      'Cappello a forma di conchiglia (ostrica), sovrapposto in mensole. Cuticola liscia, lucida, margine sottile involuto.',
    capColor: ['grigio', 'grigio-bruno', 'grigio-azzurro', 'nocciola'],
    capDiameterCm: [5, 20],
    stemDescription:
      'Corto o assente, laterale, eccentrico. Biancastro, pieno, sodo.',
    gillsDescription:
      'Lamelle fitte, decorrenti sul gambo, biancastre poi crema.',
    fleshDescription:
      'Bianca, soda da giovane, tenace e gommosa da adulto. Odore gradevole farinoso. Sapore delicato.',
    sporeColor: 'Bianco-lilla',
    habitat: ['tronchi', 'ceppaie', 'bosco misto', 'pioppo'],
    altitude: [0, 1200],
    season: { start: 10, end: 3, peak: 11 },
    substrate: 'legno morto o deperente',
    symbioticTrees: ['pioppo', 'salice', 'faggio', 'quercia', 'olmo'],
    typicalSize: 'medio',
    growthPattern: 'cespitoso',
    visibility: 'alta',
    confusableWith: [],
    funFact:
      'E il fungo coltivato più facile in assoluto: cresce sulla paglia, su fondi di caffe, perfino su libri vecchi! In Valtellina si trova su ceppaie di latifoglie fino a tarda stagione. Sopravvive anche al gelo.',
    iNaturalistTaxonId: 48210,
    modelClassId: 15,
  },

  // ============================================================
  // TOSSICI E MORTALI
  // ============================================================

  // 16. Amanita phalloides
  {
    id: 'amanita-phalloides',
    scientificName: 'Amanita phalloides',
    italianName: 'Tignosa verdognola',
    alternativeNames: [
      'Angelo della morte',
      'Amanita falloide',
      'Fungo della morte',
    ],
    family: 'Amanitaceae',
    edibility: 'mortale',
    edibilityNote:
      "FUNGO PIU MORTALE D'EUROPA. Responsabile del 90% delle morti da avvelenamento da funghi. Le tossine (amatossine) distruggono il fegato. I sintomi compaiono dopo 6-24 ore quando il danno e gia avanzato. NESSUN ANTIDOTO SICURO. UN SINGOLO CAPPELLO PUÒ UCCIDERE.",
    capDescription:
      'Cappello emisferico poi piano-convesso. Cuticola liscia, fibrillosa, viscida con umidita. Senza verruche o con rari residui di velo.',
    capColor: [
      'verde-oliva',
      'verdognolo',
      'giallo-verdastro',
      'bianco-verdastro',
      'olivastro',
    ],
    capDiameterCm: [5, 15],
    stemDescription:
      'Slanciato, bianco con zebrature verdastre, con anello membranoso bianco nella parte superiore. Base con volva bianca a sacco molto evidente.',
    gillsDescription:
      'Lamelle fitte, libere, bianche (MAI rosa, MAI verdi). Restano bianche anche a maturita.',
    fleshDescription:
      'Bianca, immutabile. Odore debole, dolciastro in vecchiaia (miele rancido). Sapore GRADEVOLE — questo e il pericolo: non sa di cattivo.',
    sporeColor: 'Bianco',
    habitat: [
      'querceto',
      'castagneto',
      'faggeta',
      'bosco misto',
      'parchi',
    ],
    altitude: [0, 1200],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'castagno', 'faggio', 'nocciolo', 'carpino'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'amanita-caesarea',
        dangerLevel: 'mortale',
        differences:
          "L'A. caesarea (commestibile) ha cappello arancione, gambo e lamelle GIALLI, volva bianca. L'A. phalloides ha cappello verdastro, gambo e lamelle BIANCHI. Allo stadio di uovo: tagliare a meta, se sotto il velo il cappello e verde = phalloides.",
      },
      {
        speciesId: 'russula-cyanoxantha',
        dangerLevel: 'mortale',
        differences:
          "Le Russule NON hanno mai anello ne volva. Se il fungo ha anello E volva, potrebbe essere un'Amanita. L'A. phalloides ha entrambi.",
      },
      {
        speciesId: 'agaricus-campestris',
        dangerLevel: 'mortale',
        differences:
          "Il prataiolo (A. campestris) ha lamelle rosa poi brune/nere e NON ha volva. L'A. phalloides ha lamelle SEMPRE bianche e volva a sacco.",
      },
      {
        speciesId: 'macrolepiota-procera',
        dangerLevel: 'mortale',
        differences:
          "La Macrolepiota non ha volva, ha anello doppio mobile, cappello squamoso e gambo zebrato. L'A. phalloides ha volva a sacco, anello semplice pendulo, cappello liscio.",
      },
    ],
    funFact:
      "L'imperatore romano Claudio, papa Clemente VII e probabilmente anche Carlo VI d'Asburgo morirono avvelenati da questo fungo. La cottura NON elimina le tossine. In Valtellina e presente nei boschi misti di latifoglie sotto i 1200 m.",
    iNaturalistTaxonId: 52135,
    modelClassId: 16,
  },

  // 17. Amanita verna
  {
    id: 'amanita-verna',
    scientificName: 'Amanita verna',
    italianName: 'Tignosa primaverile',
    alternativeNames: [
      'Amanita primaverile',
      'Angelo della morte primaverile',
    ],
    family: 'Amanitaceae',
    edibility: 'mortale',
    edibilityNote:
      "MORTALE come l'A. phalloides. Stesse tossine (amatossine). Particolarmente insidiosa perche tutta bianca e facilmente confusa con prataioli e agarici.",
    capDescription:
      'Cappello emisferico poi piano, interamente bianco. Cuticola liscia, sericea, leggermente viscida.',
    capColor: ['bianco puro', 'bianco-avorio'],
    capDiameterCm: [5, 10],
    stemDescription:
      'Bianco, slanciato, con anello bianco membranoso. Volva bianca a sacco alla base. Gambo pieno.',
    gillsDescription: 'Lamelle fitte, libere, bianche.',
    fleshDescription:
      'Bianca, immutabile. Odore debole, sapore gradevole — INSIDIOSO.',
    sporeColor: 'Bianco',
    habitat: ['querceto', 'bosco misto termofilo', 'castagneto'],
    altitude: [0, 800],
    season: { start: 4, end: 6, peak: 5 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'castagno', 'leccio'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'agaricus-campestris',
        dangerLevel: 'mortale',
        differences:
          "Il prataiolo (A. campestris) ha lamelle rosa poi brune/nere, NON ha volva. L'A. verna ha lamelle SEMPRE bianche e volva a sacco. Controllare SEMPRE la base del gambo.",
      },
    ],
    funFact:
      'Compare in primavera, quando pochi cercatori si aspettano funghi mortali. In Valtellina e rara, più presente in pianura e bassa collina.',
    iNaturalistTaxonId: 350086,
    modelClassId: 17,
  },

  // 18. Amanita virosa
  {
    id: 'amanita-virosa',
    scientificName: 'Amanita virosa',
    italianName: 'Tignosa bianca',
    alternativeNames: ['Angelo distruttore', 'Amanita virosa'],
    family: 'Amanitaceae',
    edibility: 'mortale',
    edibilityNote:
      "MORTALE. Stesse tossine dell'A. phalloides (amatossine). Tutta bianca, insidiosa. Cresce in montagna, quindi presente in Valtellina.",
    capDescription:
      'Cappello conico-campanulato, poi convesso, mai completamente piano. Bianco, spesso con residui di velo. Cuticola viscida.',
    capColor: ['bianco puro', 'bianco'],
    capDiameterCm: [4, 10],
    stemDescription:
      'Bianco, slanciato, spesso curvo, con fioccosita sulla superficie. Anello bianco fragile, a volte caduco. Volva bianca membranosa alla base.',
    gillsDescription: 'Lamelle libere, fitte, bianche.',
    fleshDescription:
      'Bianca, odore sgradevole dolciastro (miele rancido). Sapore dolciastro.',
    sporeColor: 'Bianco',
    habitat: [
      'pecceta',
      'abetaia',
      'bosco di conifere',
      'faggeta montana',
    ],
    altitude: [500, 1600],
    season: { start: 7, end: 10, peak: 8 },
    substrate: 'terreno acido',
    symbioticTrees: ['abete rosso', 'abete bianco', 'faggio', 'betulla'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'agaricus-campestris',
        dangerLevel: 'mortale',
        differences:
          "Il prataiolo ha lamelle rosa/brune e NON ha volva. L'A. virosa ha lamelle bianche, volva e anello. Se e bianco, ha anello e volva: NON raccogliere.",
      },
    ],
    funFact:
      "A differenza dell'A. phalloides (che predilige le latifoglie), l'A. virosa cresce nelle peccete montane, rendendola il pericolo mortale delle foreste alpine della Valtellina.",
    iNaturalistTaxonId: 48688,
    modelClassId: 18,
  },

  // 19. Amanita muscaria
  {
    id: 'amanita-muscaria',
    scientificName: 'Amanita muscaria',
    italianName: 'Ovolo malefico',
    alternativeNames: [
      'Fungo dei puffi',
      'Ovolaccio',
      'Cocco malefico',
    ],
    family: 'Amanitaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO. Causa sindrome panterinica (atropino-simile): agitazione, delirio, convulsioni. Raramente mortale negli adulti ma pericoloso per bambini e anziani. Effetto entro 30 min - 2 ore.',
    capDescription:
      'Cappello emisferico poi convesso e piano. Cuticola viscida, lucida, con verruche bianche (residui del velo universale) sparse sulla superficie.',
    capColor: ['rosso vivo', 'rosso-arancio', 'arancione'],
    capDiameterCm: [8, 20],
    stemDescription:
      'Bianco, robusto, cilindrico con base bulbosa. Anello bianco membranoso pendente. Volva ridotta a cercini (anelli concentrici) attorno al bulbo.',
    gillsDescription: 'Lamelle fitte, libere, bianche.',
    fleshDescription:
      'Bianca, arancione sotto la cuticola. Odore tenue. Sapore dolciastro.',
    sporeColor: 'Bianco',
    habitat: [
      'bosco di conifere',
      'betulleto',
      'pecceta',
      'abetaia',
      'bosco misto',
    ],
    altitude: [200, 1800],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: [
      'abete rosso',
      'betulla',
      'pino silvestre',
      'faggio',
    ],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'amanita-caesarea',
        dangerLevel: 'alto',
        differences:
          "L'A. caesarea ha cappello arancione SENZA verruche bianche, gambo e lamelle gialli, volva a sacco. L'A. muscaria ha verruche bianche sul cappello rosso, gambo e lamelle bianchi, volva a cercini.",
      },
    ],
    funFact:
      'Il fungo più iconico al mondo, protagonista di fiabe, videogiochi (Super Mario) e tradizioni sciamaniche siberiane. In Valtellina abbonda nelle peccete. Le verruche bianche possono essere lavate via dalla pioggia, complicando l\'identificazione.',
    iNaturalistTaxonId: 48715,
    modelClassId: 19,
  },

  // 20. Amanita pantherina
  {
    id: 'amanita-pantherina',
    scientificName: 'Amanita pantherina',
    italianName: 'Tignosa bruna',
    alternativeNames: ['Agarico panterino', 'Falsa golmotta'],
    family: 'Amanitaceae',
    edibility: 'tossico',
    edibilityNote:
      "TOSSICO. Sindrome panterinica più intensa dell'A. muscaria. Può essere grave, soprattutto nei bambini. Sintomi entro 30 minuti: delirio, allucinazioni, convulsioni.",
    capDescription:
      'Cappello emisferico poi convesso e piano. Cuticola liscia, brunastra, con verruche bianche piccole e regolari. Margine nettamente striato.',
    capColor: ['bruno', 'bruno-grigiastro', 'bruno-olivastro', 'nocciola'],
    capDiameterCm: [5, 12],
    stemDescription:
      'Bianco, slanciato, con anello liscio (senza striature). Base con bulbo circondato dalla volva ridotta a un cercine netto (collare).',
    gillsDescription: 'Lamelle libere, fitte, bianche.',
    fleshDescription:
      'Bianca, immutabile. Odore nullo o debole di rapa. Sapore dolciastro.',
    sporeColor: 'Bianco',
    habitat: [
      'bosco misto',
      'faggeta',
      'querceto',
      'bosco di conifere',
    ],
    altitude: [200, 1600],
    season: { start: 6, end: 10, peak: 8 },
    substrate: 'terreno',
    symbioticTrees: ['faggio', 'quercia', 'abete rosso', 'pino'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'amanita-rubescens',
        dangerLevel: 'alto',
        differences:
          "L'A. rubescens (Tignosa vinata, commestibile dopo cottura) ha carne che vira al rosa-vinoso, verruche grigiastre e anello striato. L'A. pantherina ha carne bianca immutabile, verruche bianche e anello liscio.",
      },
    ],
    funFact:
      "Piu tossica dell'A. muscaria ma meno appariscente: il colore bruno la rende meno vistosa e quindi più pericolosa. In Valtellina si trova sia in faggeta che in pecceta.",
    iNaturalistTaxonId: 48686,
    modelClassId: 20,
  },

  // 21. Cortinarius orellanus
  {
    id: 'cortinarius-orellanus',
    scientificName: 'Cortinarius orellanus',
    italianName: 'Cortinario orellano',
    alternativeNames: ['Cortinario color arancio'],
    family: 'Cortinariaceae',
    edibility: 'mortale',
    edibilityNote:
      'MORTALE. Contiene orellanina che distrugge i reni. I SINTOMI COMPAIONO DOPO 3-17 GIORNI (il più lungo periodo di latenza tra i funghi). Quando compaiono, il danno renale e spesso irreversibile. Necessita dialisi a vita o trapianto.',
    capDescription:
      'Cappello conico-convesso poi piano, con umbone. Cuticola asciutta, finemente fibrillosa-squamulosa.',
    capColor: ['arancio-rossiccio', 'bruno-arancio', 'fulvo'],
    capDiameterCm: [3, 8],
    stemDescription:
      'Slanciato, cilindrico, fibrilloso, giallo-arancione, senza anello (ha cortina aracnoide residua).',
    gillsDescription:
      'Lamelle spaziate, adnate, arancione-rugginose, spesse.',
    fleshDescription:
      'Giallastra, fibrosa. Odore debole di rapa. Sapore mite.',
    sporeColor: 'Bruno-rugginoso',
    habitat: ['querceto', 'faggeta', 'bosco di latifoglie'],
    altitude: [200, 1000],
    season: { start: 8, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'faggio', 'castagno'],
    typicalSize: 'piccolo',
    growthPattern: 'singolo',
    visibility: 'bassa',
    confusableWith: [
      {
        speciesId: 'cantharellus-cibarius',
        dangerLevel: 'mortale',
        differences:
          'Il Cantharellus cibarius ha pseudolamelle (pliche) e cresce in modo compatto. Il C. orellanus ha vere lamelle, cortina e sporata rugginosa. Colore simile ma struttura completamente diversa.',
      },
    ],
    funFact:
      "Il periodo di latenza di 3-17 giorni rende quasi impossibile collegare i sintomi al fungo mangiato. In Polonia negli anni '50 causo un'epidemia con decine di morti. In Valtellina e raro ma presente nei querceti a bassa quota.",
    iNaturalistTaxonId: 48576,
    modelClassId: 21,
  },

  // 22. Entoloma sinuatum
  {
    id: 'entoloma-sinuatum',
    scientificName: 'Entoloma sinuatum',
    italianName: 'Entoloma livido',
    alternativeNames: ['Fungo livido', 'Entoloma lividum'],
    family: 'Entolomataceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO. Causa grave sindrome gastrointestinale: vomito, diarrea, crampi. I sintomi compaiono entro 30 min - 2 ore. Raramente mortale ma causa disidratazione pericolosa.',
    capDescription:
      'Cappello convesso poi piano, largo, robusto, carnoso. Cuticola liscia, opaca, leggermente viscida.',
    capColor: [
      'bianco-grigiastro',
      'grigio-giallastro',
      'avorio',
      'livido',
    ],
    capDiameterCm: [5, 20],
    stemDescription:
      'Robusto, bianco, fibroso, pieno, senza anello ne volva.',
    gillsDescription:
      'Lamelle smarginate, inizialmente giallastre poi ROSA-SALMONE a maturita (per le spore rosa). Questa e la chiave identificativa.',
    fleshDescription:
      'Bianca, soda. Odore farinoso forte, sapore farinoso.',
    sporeColor: 'Rosa-salmone',
    habitat: ['bosco misto', 'querceto', 'faggeta', 'parchi'],
    altitude: [100, 1000],
    season: { start: 8, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['quercia', 'faggio', 'carpino'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'clitocybe-nebularis',
        dangerLevel: 'medio',
        differences:
          "La Clitocybe nebularis ha lamelle decorrenti biancastre (mai rosa) e odore forte. L'E. sinuatum ha lamelle rosa-salmone a maturita e portamento più robusto.",
      },
    ],
    funFact:
      "E il fungo tossico che più spesso viene confuso con specie commestibili. L'odore gradevole di farina fresca inganna. In Valtellina si trova nei boschi misti a bassa quota.",
    iNaturalistTaxonId: 346815,
    modelClassId: 22,
  },

  // 23. Gyromitra esculenta
  {
    id: 'gyromitra-esculenta',
    scientificName: 'Gyromitra esculenta',
    italianName: 'Falsa spugnola',
    alternativeNames: ['Spugnola bastarda', 'Gyromitra'],
    family: 'Discinaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO, potenzialmente MORTALE. Contiene giromitrina, che si trasforma in monometilidrazina (componente del carburante per razzi). Può causare insufficienza epatica e morte. Vendita VIETATA in Italia.',
    capDescription:
      'Corpo fruttifero con cappello irregolare, cerebroide (forma di cervello), con pieghe sinuose. NON cavo come la Morchella: contiene setti interni.',
    capColor: ['bruno-rossastro', 'bruno-castano', 'bruno scuro'],
    capDiameterCm: [4, 12],
    stemDescription:
      'Corto, tozzo, biancastro o rosato, irregolare, con solchi. Cavo o con camere.',
    gillsDescription:
      'Assenti. Imenoforo sulla superficie esterna del cappello.',
    fleshDescription:
      'Sottile, fragile, cerosa. Odore debole. Sapore non caratteristico.',
    sporeColor: 'Bianco',
    habitat: ['pineta', 'bosco di conifere', 'terreno sabbioso'],
    altitude: [300, 1500],
    season: { start: 3, end: 5, peak: 4 },
    substrate: 'terreno, lettiera di conifere',
    symbioticTrees: ['pino silvestre', 'abete rosso'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'morchella-esculenta',
        dangerLevel: 'mortale',
        differences:
          "La Morchella ha alveoli regolari (a nido d'ape) e corpo interamente cavo. La Gyromitra ha pieghe cerebrali irregolari e non e completamente cava (ha setti). Tagliare a meta per verificare.",
      },
    ],
    funFact:
      'Contiene una tossina chimicamente simile alla monometilidrazina, usata come propellente per razzi. In Scandinavia viene tradizionalmente consumata dopo bollitura (che elimina parte della tossina volatile), ma il metodo non e sicuro. In Valtellina si trova nelle pinete primaverili.',
    iNaturalistTaxonId: 48580,
    modelClassId: 23,
  },

  // 24. Omphalotus olearius
  {
    id: 'omphalotus-olearius',
    scientificName: 'Omphalotus olearius',
    italianName: "Fungo dell'olivo",
    alternativeNames: ['Falso gallinaccio', 'Jack-o-lantern'],
    family: 'Omphalotaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO. Causa grave sindrome gastrointestinale: nausea violenta, vomito, diarrea entro 30 minuti. Ricovero spesso necessario per disidratazione.',
    capDescription:
      'Cappello convesso poi imbutiforme, con margine involuto. Cuticola liscia.',
    capColor: ['arancione vivo', 'arancio-rossiccio', 'giallo-arancio'],
    capDiameterCm: [4, 12],
    stemDescription:
      'Eccentrico o centrale, pieno, fibroso, concolore al cappello. Spesso curvo.',
    gillsDescription:
      'Lamelle VERE (non pliche), fitte, decorrenti, arancione vivo. BIOLUMINESCENTI al buio (brillano di verde).',
    fleshDescription:
      'Arancione, fibrosa. Odore sgradevole. Sapore amaro.',
    sporeColor: 'Crema',
    habitat: [
      'oliveto',
      'querceto',
      'ceppaie',
      'bosco mediterraneo',
    ],
    altitude: [0, 800],
    season: { start: 9, end: 11, peak: 10 },
    substrate: 'legno (ceppaie, radici, olivo)',
    symbioticTrees: ['olivo', 'quercia', 'castagno'],
    typicalSize: 'medio',
    growthPattern: 'cespitoso',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'cantharellus-cibarius',
        dangerLevel: 'alto',
        differences:
          "Il Cantharellus cresce a TERRA, ha pseudolamelle (pliche) spesse e spaziate, profumo di albicocca. L'Omphalotus cresce su LEGNO, ha lamelle vere e fitte, odore sgradevole. Al buio le lamelle dell'Omphalotus brillano.",
      },
    ],
    funFact:
      'E uno dei pochi funghi bioluminescenti europei: le lamelle brillano di verde al buio. In Valtellina e raro (assenza di olivi), ma si trova su querce a bassa quota nel fondovalle.',
    iNaturalistTaxonId: 146720,
    modelClassId: 24,
  },

  // 25. Hypholoma fasciculare
  {
    id: 'hypholoma-fasciculare',
    scientificName: 'Hypholoma fasciculare',
    italianName: 'Falso chiodino',
    alternativeNames: ['Zolfino', 'Falsa famigliola'],
    family: 'Hymenogastraceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO. Causa grave sindrome gastrointestinale con possibili complicazioni epatiche. Sapore molto amaro — in teoria non si mangerebbe, ma nei misti si mimetizza.',
    capDescription:
      'Cappello convesso poi piano, liscio. Colore giallo-zolfo con centro più scuro.',
    capColor: ['giallo-zolfo', 'giallo-arancio', 'ocra al centro'],
    capDiameterCm: [2, 7],
    stemDescription:
      'Slanciato, fibroso, giallastro, presto cavo. SENZA ANELLO (o con residui molto ridotti).',
    gillsDescription:
      'Lamelle adnate, fitte, giallo-verdastre poi olivastre e infine bruno-porpora. Mai bianche.',
    fleshDescription:
      'Giallastra, fibrosa. Odore debole sgradevole. Sapore MOLTO AMARO.',
    sporeColor: 'Bruno-porpora',
    habitat: ['ceppaie', 'tronchi', 'bosco misto'],
    altitude: [0, 1400],
    season: { start: 4, end: 11, peak: 9 },
    substrate: 'legno morto, ceppaie',
    symbioticTrees: [],
    typicalSize: 'piccolo',
    growthPattern: 'cespitoso',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'armillaria-mellea',
        dangerLevel: 'alto',
        differences:
          "L'Armillaria mellea (chiodino vero) ha anello evidente, lamelle biancastre, squame sul cappello e sapore mite. L'H. fasciculare non ha anello, ha lamelle verdastro-olivastre e sapore amaro.",
      },
    ],
    funFact:
      'Uno degli avvelenamenti più comuni in Italia, perche viene raccolto assieme ai chiodini veri. Un consiglio: assaggiare sempre un pezzetto crudo (sputandolo) — il falso chiodino e disgustosamente amaro. In Valtellina abbonda sulle ceppaie.',
    iNaturalistTaxonId: 54042,
    modelClassId: 25,
  },

  // 26. Boletus satanas (Rubroboletus satanas)
  {
    id: 'boletus-satanas',
    scientificName: 'Rubroboletus satanas',
    italianName: 'Porcino malefico',
    alternativeNames: [
      'Boleto satana',
      'Boleto di Satana',
      'Porcino del diavolo',
    ],
    family: 'Boletaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO. Causa grave sindrome gastrointestinale entro poche ore. Vomito, diarrea, crampi intensi. Pericoloso soprattutto da crudo.',
    capDescription:
      'Cappello emisferico poi convesso, massiccio. Cuticola asciutta, feltrata, biancastra o grigiastra.',
    capColor: [
      'bianco-grigiastro',
      'grigio',
      'grigio chiaro',
      'beige pallido',
    ],
    capDiameterCm: [8, 25],
    stemDescription:
      'Robusto, panciuto, giallo nella parte superiore, rosso vivo nella parte mediana e inferiore. Reticolo rosso evidente.',
    gillsDescription:
      'Tubuli e pori. Pori piccoli, rosso-arancio vivo poi rosso sangue. Al tocco virano al blu.',
    fleshDescription:
      'Biancastra, VIRA AL BLU al taglio (lentamente). Odore sgradevole in eta avanzata. Sapore mite poi nauseante.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['querceto', 'bosco termofilo', 'terreno calcareo'],
    altitude: [100, 800],
    season: { start: 6, end: 9, peak: 7 },
    substrate: 'terreno calcareo',
    symbioticTrees: ['quercia', 'leccio', 'castagno', 'faggio'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'boletus-edulis',
        dangerLevel: 'alto',
        differences:
          'Il B. edulis ha pori bianchi poi giallo-verdastri (MAI rossi), carne che non vira al blu, gambo con reticolo chiaro. Il B. satanas ha pori rossi, carne che vira al blu e gambo con reticolo rosso.',
      },
    ],
    funFact:
      'Il nome "satanas" fu dato nel 1831 per il suo aspetto ingannatore: sembra un porcino ma e velenoso. In Valtellina e raro, limitato ai boschi termofili su suolo calcareo di bassa quota.',
    iNaturalistTaxonId: 352451,
    modelClassId: 26,
  },

  // 27. Russula emetica
  {
    id: 'russula-emetica',
    scientificName: 'Russula emetica',
    italianName: 'Colombina rossa',
    alternativeNames: ['Russula emetica', 'Rossella emetica'],
    family: 'Russulaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO da crudo. Causa vomito e diarrea. La cottura riduce la tossicita ma se ne sconsiglia comunque il consumo. Sapore estremamente piccante.',
    capDescription:
      'Cappello convesso poi piano-depresso. Cuticola viscida, lucida, facilmente pelabile. Margine striato a maturita.',
    capColor: ['rosso vivo', 'rosso-ciliegia', 'rosso brillante'],
    capDiameterCm: [4, 10],
    stemDescription:
      'Bianco, cilindrico, fragile, spugnoso, senza anello ne volva.',
    gillsDescription:
      'Lamelle bianche, annesse, fragili. Si rompono facilmente al tatto.',
    fleshDescription:
      'Bianca, granulosa, fragile. Odore fruttato. Sapore ESTREMAMENTE PICCANTE e bruciante.',
    sporeColor: 'Bianco',
    habitat: ['pecceta', 'bosco di conifere', 'sfagneto', 'torbiera'],
    altitude: [300, 1800],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno acido, muschio',
    symbioticTrees: ['abete rosso', 'pino silvestre', 'betulla'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [
      {
        speciesId: 'russula-cyanoxantha',
        dangerLevel: 'medio',
        differences:
          'La R. cyanoxantha ha colori viola-verdastri, lamelle flessibili e sapore dolce. La R. emetica e tutta rossa, ha lamelle fragili e sapore pepato insopportabile. Regola pratica: se una Russula rossa e piccante, non mangiarla.',
      },
    ],
    funFact:
      'Il nome "emetica" deriva dal greco "emeo" = vomitare. Regola aurea per le Russule: assaggiare un pezzetto di carne cruda (sputandolo). Se piccante: non commestibile. Se dolce: potenzialmente buona. In Valtellina abbonda nelle peccete umide.',
    iNaturalistTaxonId: 48352,
    modelClassId: 27,
  },

  // 28. Tricholoma pardinum
  {
    id: 'tricholoma-pardinum',
    scientificName: 'Tricholoma pardinum',
    italianName: 'Agarico tigrino',
    alternativeNames: ['Tricoloma tigrino', 'Tricholoma tigrato'],
    family: 'Tricholomataceae',
    edibility: 'tossico',
    edibilityNote:
      "TOSSICO. Causa grave sindrome gastrointestinale molto intensa: vomito, diarrea, crampi violenti entro 2-4 ore. Uno dei più comuni avvelenamenti in Italia.",
    capDescription:
      'Cappello convesso poi piano, grande, carnoso. Cuticola asciutta con squame concentriche grigio-brune su fondo chiaro (aspetto tigrato).',
    capColor: [
      'grigio',
      'grigio-brunastro',
      'argento con squame brune',
    ],
    capDiameterCm: [8, 15],
    stemDescription:
      'Robusto, bianco, pieno, cilindrico. Superficie liscia.',
    gillsDescription:
      'Lamelle fitte, smarginate, bianche o crema. Possono avere riflesso giallastro.',
    fleshDescription:
      'Bianca, soda. Odore farinoso. Sapore farinoso gradevole — INGANNEVOLE.',
    sporeColor: 'Bianco',
    habitat: ['faggeta', 'bosco misto', 'abetaia su calcare'],
    altitude: [400, 1600],
    season: { start: 8, end: 10, peak: 9 },
    substrate: 'terreno calcareo',
    symbioticTrees: ['faggio', 'abete bianco', 'abete rosso'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'tricholoma-terreum',
        dangerLevel: 'alto',
        differences:
          'Il T. terreum e molto più piccolo (4-10 cm), senza squame evidenti, e cresce esclusivamente sotto conifere. Il T. pardinum e grande, con squame tigrature evidenti e cresce sotto latifoglie e conifere su calcare.',
      },
    ],
    funFact:
      "Confuso frequentemente con specie commestibili per il suo aspetto \"onesto\" e il sapore gradevole. In Valtellina si trova nelle faggete su suolo calcareo. Uno dei più frequenti avvelenamenti dell'arco alpino.",
    iNaturalistTaxonId: 53714,
    modelClassId: 28,
  },

  // ============================================================
  // ALTRI COMMESTIBILI COMUNI NELLE ALPI (29-48)
  // ============================================================

  // 29. Agaricus campestris
  {
    id: 'agaricus-campestris',
    scientificName: 'Agaricus campestris',
    italianName: 'Prataiolo',
    alternativeNames: [
      'Fungo di prato',
      'Champignon selvatico',
      'Psalliota campestre',
    ],
    family: 'Agaricaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, il champignon selvatico. ATTENZIONE MASSIMA: confondibile con Amanite mortali. Raccogliere SOLO esemplari con lamelle rosa/brune, MAI bianche. Verificare SEMPRE assenza di volva.',
    capDescription:
      'Cappello emisferico poi convesso e piano. Cuticola bianca, sericea, con fibrille appressate.',
    capColor: ['bianco', 'crema', 'bianco sporco'],
    capDiameterCm: [4, 12],
    stemDescription:
      'Corto, pieno, bianco, con anello semplice sottile. Base senza volva.',
    gillsDescription:
      'Lamelle libere, fitte. ROSA da giovane, poi bruno-cioccolato e infine nerastre. MAI bianche (se bianche potrebbe essere Amanita).',
    fleshDescription:
      'Bianca, viraggio leggermente rosato al taglio. Odore gradevole anisato. Sapore dolce.',
    sporeColor: 'Bruno-nerastro',
    habitat: ['prato', 'pascolo', 'parco', 'margine del bosco'],
    altitude: [0, 1500],
    season: { start: 5, end: 10, peak: 9 },
    substrate: 'terreno ricco di humus, prati concimati',
    symbioticTrees: [],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'amanita-phalloides',
        dangerLevel: 'mortale',
        differences:
          "L'A. phalloides ha lamelle SEMPRE bianche, volva a sacco e cappello verdastro. Il prataiolo ha lamelle rosa/brune, niente volva e cappello bianco. CONTROLLARE SEMPRE LA BASE DEL GAMBO.",
      },
      {
        speciesId: 'amanita-verna',
        dangerLevel: 'mortale',
        differences:
          "L'A. verna ha lamelle bianche e volva. Il prataiolo ha lamelle rosa poi brune e niente volva.",
      },
    ],
    funFact:
      "E l'antenato selvatico dello champignon coltivato (A. bisporus). In Valtellina si trova nei pascoli montani fino a 1500 m. La raccolta richiede molta attenzione per evitare le Amanite bianche.",
    iNaturalistTaxonId: 57775,
    modelClassId: 29,
  },

  // 30. Suillus luteus
  {
    id: 'suillus-luteus',
    scientificName: 'Suillus luteus',
    italianName: 'Pinarolo',
    alternativeNames: ['Boleto giallo', 'Fungo lardaiolo', 'Pinuzzu'],
    family: 'Suillaceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile dopo rimozione della cuticola viscida (lassativa). Nessuna confusione con specie tossiche. Ideale per principianti.',
    capDescription:
      'Cappello convesso poi piano, molto viscido (glutinoso) con umidita. Cuticola facilmente asportabile.',
    capColor: ['bruno-cioccolato', 'castano', 'bruno-violaceo'],
    capDiameterCm: [4, 12],
    stemDescription:
      "Cilindrico, pieno, giallastro sopra l'anello, biancastro sotto. Anello membranoso violaceo-brunastro, persistente.",
    gillsDescription:
      'Tubuli e pori piccoli, gialli poi olivastri. Adnati o leggermente decorrenti.',
    fleshDescription:
      'Giallina, molle, immutabile. Odore debole fungino. Sapore dolce.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['pineta', 'bosco di conifere'],
    altitude: [300, 1800],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['pino silvestre', 'pino nero', 'pino cembro'],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [],
    funFact:
      'Il pinarolo e il fungo perfetto per i principianti: cresce in massa sotto i pini, e facilmente riconoscibile e non ha sosia tossici. In Valtellina abbonda nelle pinete di mezza montagna.',
    iNaturalistTaxonId: 48704,
    modelClassId: 30,
  },

  // 31. Imleria badia (Xerocomus badius)
  {
    id: 'xerocomus-badius',
    scientificName: 'Imleria badia',
    italianName: 'Boleto baio',
    alternativeNames: ['Xerocomus badius', 'Castagnino', 'Boleto castano'],
    family: 'Boletaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, simile al porcino ma meno pregiato. Ottimo nei misti. La carne vira leggermente al blu: e normale e non indica tossicita.',
    capDescription:
      'Cappello convesso poi piano. Cuticola liscia, viscida con umidita, asciutta a secco. Color castagno uniforme.',
    capColor: ['castano', 'marrone-rossiccio', 'bruno-baia'],
    capDiameterCm: [4, 15],
    stemDescription:
      'Cilindrico, slanciato, bruno chiaro con fibrille più scure. Pieno, sodo.',
    gillsDescription:
      'Tubuli e pori giallo-verdastri, angolati, che virano al blu al tocco.',
    fleshDescription:
      'Biancastra o giallina, vira lievemente al blu al taglio. Odore fungino gradevole. Sapore dolce.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['pecceta', 'pineta', 'bosco misto', 'abetaia'],
    altitude: [300, 1800],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: [
      'abete rosso',
      'pino silvestre',
      'faggio',
      'castagno',
    ],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'boletus-satanas',
        dangerLevel: 'alto',
        differences:
          'Il B. satanas ha pori rossi (il baio li ha giallo-verdastri) e cappello biancastro. Il boleto baio ha cappello bruno-castano e pori gialli.',
      },
    ],
    funFact:
      "Il viraggio al blu e causato da una reazione chimica dell'acido boletolo con l'ossigeno. Non e indice di tossicita. In Valtellina e comunissimo nelle peccete montane.",
    iNaturalistTaxonId: 48699,
    modelClassId: 31,
  },

  // 32. Coprinus comatus
  {
    id: 'coprinus-comatus',
    scientificName: 'Coprinus comatus',
    italianName: 'Coprino chiomato',
    alternativeNames: [
      "Fungo dell'inchiostro",
      'Agarico chiomato',
      'Sbrise',
    ],
    family: 'Agaricaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile SOLO da giovane (quando e bianco e chiuso). Va consumato SUBITO dopo la raccolta: in poche ore si autoliquefa in un inchiostro nero. MAI con alcol (il congenere C. atramentarius causa reazione con alcol).',
    capDescription:
      'Cappello cilindrico-ovoidale da giovane (come un uovo allungato), con squame bianche fibrose. Si apre e le lamelle si dissolvono in liquido nero.',
    capColor: ['bianco', 'bianco con squame ocracee al disco'],
    capDiameterCm: [3, 6],
    stemDescription:
      'Alto, slanciato, cavo, bianco, fragile. Anello basso, mobile, sottile.',
    gillsDescription:
      'Lamelle fittissime, libere. Bianche poi rosa poi nere. Si autolisano (si sciolgono in inchiostro nero).',
    fleshDescription:
      'Bianca, sottile, tenera. Odore debole gradevole. Sapore delicato.',
    sporeColor: 'Nero',
    habitat: [
      'prato',
      'bordo strada',
      'terreno concimato',
      'parco',
      'giardino',
    ],
    altitude: [0, 1200],
    season: { start: 4, end: 11, peak: 9 },
    substrate: 'terreno ricco, ruderale',
    symbioticTrees: [],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'alta',
    confusableWith: [],
    funFact:
      'La deliquescenza (autolisi) del cappello serve a disperdere le spore: il liquido nero le trasporta nel terreno. Anticamente il liquido nero veniva usato come inchiostro. In Valtellina si trova nei prati e ai bordi delle strade.',
    iNaturalistTaxonId: 48441,
    modelClassId: 32,
  },

  // 33. Amanita rubescens
  {
    id: 'amanita-rubescens',
    scientificName: 'Amanita rubescens',
    italianName: 'Tignosa vinata',
    alternativeNames: ['Amanita arrossante', 'Vinata'],
    family: 'Amanitaceae',
    edibility: 'buono',
    edibilityNote:
      "Buon commestibile ma SOLO dopo cottura prolungata. TOSSICO DA CRUDO (contiene emolisine). CONFONDIBILE con l'A. pantherina tossica: raccogliere solo se sicuri dell'identificazione. Verificare SEMPRE il viraggio al rosa.",
    capDescription:
      'Cappello emisferico poi convesso e piano. Cuticola liscia, brunastra, con verruche grigiastro-rosate (residui del velo).',
    capColor: ['bruno-vinoso', 'bruno-rossastro', 'rosso-brunastro'],
    capDiameterCm: [5, 15],
    stemDescription:
      'Biancastro con sfumature rosate, robusto, con anello STRIATO nella parte superiore. Base bulbosa senza volva evidente. Le zone mangiucchiate da larve virano al ROSA-VINOSO.',
    gillsDescription:
      'Lamelle libere, fitte, biancastre, con macchie rosa-vinose dove danneggiate.',
    fleshDescription:
      'Bianca che vira al ROSA-VINOSO al taglio e nei punti larvati. Odore debole. Sapore mite.',
    sporeColor: 'Bianco',
    habitat: [
      'bosco misto',
      'faggeta',
      'querceto',
      'bosco di conifere',
    ],
    altitude: [200, 1500],
    season: { start: 6, end: 10, peak: 8 },
    substrate: 'terreno',
    symbioticTrees: [
      'faggio',
      'quercia',
      'abete rosso',
      'pino',
      'castagno',
    ],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'amanita-pantherina',
        dangerLevel: 'alto',
        differences:
          "L'A. pantherina ha carne BIANCA immutabile, verruche bianche pure, anello LISCIO e volva a cercini. L'A. rubescens ha carne che vira al ROSA, verruche grigiastre, anello STRIATO e base senza vera volva.",
      },
    ],
    funFact:
      "La confusione con l'A. pantherina e uno degli errori più pericolosi per i raccoglitori nelle Alpi. Regola d'oro: se l'Amanita bruna arrossisce, e la vinata; se resta bianca, e la pantherina tossica. In Valtellina e molto comune.",
    iNaturalistTaxonId: 48685,
    modelClassId: 33,
  },

  // 34. Leccinum scabrum
  {
    id: 'leccinum-scabrum',
    scientificName: 'Leccinum scabrum',
    italianName: 'Porcinello grigio',
    alternativeNames: ['Gambasecca', 'Leccino', 'Boleto scabro'],
    family: 'Boletaceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile discreto. Il gambo e fibroso e va scartato o tagliato a pezzetti piccoli. Usare solo il cappello. Nessuna confusione con specie tossiche.',
    capDescription:
      'Cappello convesso poi piano. Cuticola liscia o leggermente viscida, opaca.',
    capColor: ['grigio', 'grigio-brunastro', 'beige-grigiastro'],
    capDiameterCm: [5, 15],
    stemDescription:
      'Slanciato, cilindrico, biancastro con squamule nere evidenti (scabre). Fibroso e duro.',
    gillsDescription:
      'Tubuli e pori bianchi poi grigiastri, piccoli, rotondi.',
    fleshDescription:
      'Biancastra, molle, vira leggermente al grigio-rosato. Odore debole. Sapore mite.',
    sporeColor: 'Bruno-ocraceo',
    habitat: ['betulleto', 'bosco misto con betulla'],
    altitude: [400, 1800],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['betulla'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [],
    funFact:
      "Cresce ESCLUSIVAMENTE sotto betulle — se trovi un porcinello grigio, c'e sicuramente una betulla nelle vicinanze. In Valtellina le betulle sono comuni ai margini dei boschi, quindi anche il porcinello grigio.",
    iNaturalistTaxonId: 48707,
    modelClassId: 34,
  },

  // 35. Leccinum aurantiacum
  {
    id: 'leccinum-aurantiacum',
    scientificName: 'Leccinum aurantiacum',
    italianName: 'Porcinello rosso',
    alternativeNames: [
      'Gambasecca rossa',
      'Leccino rosso',
      'Boleto rosso',
    ],
    family: 'Boletaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile. La carne annerisce alla cottura (normale, non pericoloso). Scartare il gambo fibroso. Ottimo nei misti e nei sughi.',
    capDescription:
      'Cappello emisferico poi convesso. Cuticola asciutta, leggermente feltrata, colore arancione intenso.',
    capColor: ['arancione', 'rosso-arancio', 'arancio vivo'],
    capDiameterCm: [5, 20],
    stemDescription:
      'Alto, robusto, biancastro con squamule brunastre o rossastre dense.',
    gillsDescription: 'Tubuli e pori bianchi poi grigiastri.',
    fleshDescription:
      'Bianca, vira al viola-nerastro al taglio. Odore debole. Sapore mite.',
    sporeColor: 'Bruno-giallastro',
    habitat: [
      'bosco misto',
      'pioppeto',
      'margine bosco con pioppo tremulo',
    ],
    altitude: [300, 1500],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['pioppo tremulo', 'betulla', 'faggio'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [],
    funFact:
      'Il viraggio al nero della carne spaventa i principianti ma e del tutto innocuo. In Valtellina si trova ai margini dei boschi dove cresce il pioppo tremulo.',
    iNaturalistTaxonId: 118839,
    modelClassId: 35,
  },

  // 36. Calocybe gambosa
  {
    id: 'calocybe-gambosa',
    scientificName: 'Calocybe gambosa',
    italianName: 'Prugnolo',
    alternativeNames: [
      'Fungo di San Giorgio',
      'Maggengo',
      'Spinarolo',
    ],
    family: 'Lyophyllaceae',
    edibility: 'ottimo',
    edibilityNote:
      'Eccellente commestibile, molto ricercato. Sapore e odore inconfondibili di farina fresca. Ottimo in risotti e frittate.',
    capDescription:
      'Cappello convesso poi piano, compatto e carnoso. Cuticola liscia, asciutta, opaca. Margine involuto.',
    capColor: ['bianco-crema', 'crema', 'bianco sporco'],
    capDiameterCm: [4, 12],
    stemDescription:
      'Robusto, pieno, bianco, cilindrico o leggermente clavato.',
    gillsDescription:
      'Lamelle fitte, annesse, bianche poi crema. Sottili.',
    fleshDescription:
      'Bianca, soda, compatta. Odore FORTE di farina fresca. Sapore di farina, molto gradevole.',
    sporeColor: 'Bianco',
    habitat: [
      'prato',
      'margine bosco',
      'siepe',
      'sotto prugnolo',
      'pascolo',
    ],
    altitude: [100, 1400],
    season: { start: 4, end: 6, peak: 5 },
    substrate: 'terreno erboso',
    symbioticTrees: [],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'bassa',
    confusableWith: [
      {
        speciesId: 'entoloma-sinuatum',
        dangerLevel: 'alto',
        differences:
          "L'E. sinuatum compare più tardi (estate-autunno), ha lamelle che diventano rosa-salmone e cresce nel bosco. Il prugnolo esce in primavera, ha lamelle bianche e cresce nei prati.",
      },
    ],
    funFact:
      'Il nome "Fungo di San Giorgio" viene dal fatto che appare intorno al 23 aprile (San Giorgio). Cresce in cerchi o file nei prati, spesso anno dopo anno nello stesso punto. In Valtellina i posti buoni sono gelosamente custoditi.',
    iNaturalistTaxonId: 55721,
    modelClassId: 36,
  },

  // 37. Lycoperdon perlatum
  {
    id: 'lycoperdon-perlatum',
    scientificName: 'Lycoperdon perlatum',
    italianName: 'Vescia gemmata',
    alternativeNames: ['Vescia', 'Lycoperdon', 'Peto di lupo'],
    family: 'Agaricaceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile SOLO da giovane, quando la carne interna (gleba) e completamente bianca e soda. Scartare se la gleba e gialla o olivastra (spore mature).',
    capDescription:
      'Corpo fruttifero a forma di pera rovesciata, senza cappello distinto. Superficie coperta da piccole spine/granuli che cadono lasciando un reticolo.',
    capColor: ['bianco', 'crema', 'bianco-grigiastro'],
    capDiameterCm: [2, 6],
    stemDescription:
      'Pseudogambo (parte basale sterile), corto, biancastro.',
    gillsDescription:
      'Assenti. Interno (gleba) bianco e compatto da giovane, poi giallo-verdastro e polverulento (spore).',
    fleshDescription:
      'Gleba bianca e soda da giovane (edibile), poi giallastra e infine olivastra e polverulenta (non edibile).',
    sporeColor: 'Bruno-olivastro',
    habitat: ['bosco misto', 'prato', 'margine bosco', 'sentiero'],
    altitude: [0, 1600],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno, lettiera',
    symbioticTrees: [],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'amanita-phalloides',
        dangerLevel: 'mortale',
        differences:
          "ATTENZIONE: un giovane \"uovo\" di Amanita phalloides chiuso può somigliare a una vescia! Tagliare SEMPRE a meta: la vescia e uniforme all'interno. L'uovo di Amanita mostra la sagoma del fungo (cappello, gambo) all'interno.",
      },
    ],
    funFact:
      "Quando matura, basta un tocco o una goccia di pioggia per far \"esplodere\" la nuvola di spore dal poro apicale. I bambini ci giocano come palloncini. In Valtellina e comunissima nei boschi e ai margini dei sentieri.",
    iNaturalistTaxonId: 48448,
    modelClassId: 37,
  },

  // 38. Lepista nuda
  {
    id: 'lepista-nuda',
    scientificName: 'Lepista nuda',
    italianName: 'Agarico violetto',
    alternativeNames: ['Lepista nuda', 'Piede blu', 'Fungo viola'],
    family: 'Tricholomataceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile dopo cottura. Non consumare crudo. Sapore dolce e profumato. Ottimo in umido e trifolato.',
    capDescription:
      "Cappello convesso poi piano-depresso. Cuticola liscia, leggermente viscida. Colore violaceo che sbiadisce con l'eta.",
    capColor: [
      'viola',
      'lilla',
      'violaceo-brunastro',
      'grigio-violaceo',
    ],
    capDiameterCm: [5, 15],
    stemDescription:
      'Cilindrico, fibrilloso, viola-lilla, pieno poi cavo. Base leggermente ingrossata.',
    gillsDescription:
      'Lamelle fitte, adnate o smarginate, viola-lilla poi sbiadiscono al brunastro.',
    fleshDescription:
      'Violacea, molle, acquosa. Odore fruttato (anice/arancio). Sapore dolce.',
    sporeColor: 'Rosa pallido',
    habitat: [
      'bosco misto',
      'giardino',
      'compostiera',
      'faggeta',
      'parco',
    ],
    altitude: [0, 1400],
    season: { start: 9, end: 12, peak: 11 },
    substrate: 'lettiera, terreno ricco di humus',
    symbioticTrees: [],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'cortinarius-orellanus',
        dangerLevel: 'mortale',
        differences:
          'Alcuni Cortinarius viola (es. C. purpurascens) possono assomigliare. I Cortinarius hanno cortina (velo aracnoide tra cappello e gambo) e sporata rugginosa. La Lepista ha sporata rosa e nessuna cortina.',
      },
    ],
    funFact:
      "Il colore viola intenso la rende inconfondibile quando e fresca. E una delle ultime specie a fruttificare prima dell'inverno: in Valtellina si trova fino a dicembre inoltrato, anche dopo le prime gelate.",
    iNaturalistTaxonId: 62637,
    modelClassId: 38,
  },

  // 39. Clitocybe nebularis
  {
    id: 'clitocybe-nebularis',
    scientificName: 'Clitocybe nebularis',
    italianName: 'Cimballo',
    alternativeNames: ['Fungo delle nebbie', 'Fumosa', 'Ordegno'],
    family: 'Tricholomataceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile dopo cottura, ma controverso. Causa problemi gastrointestinali in persone sensibili. Raccogliere solo giovani. Non consumare in grandi quantita.',
    capDescription:
      'Cappello convesso poi piano-depresso, ampio. Cuticola liscia, pruinosa (appannata come il vetro), grigio cenere.',
    capColor: ['grigio', 'grigio-cenere', 'grigio-brunastro'],
    capDiameterCm: [6, 20],
    stemDescription:
      'Robusto, fibroso, pieno, biancastro-grigiastro. Ingrossato alla base.',
    gillsDescription:
      'Lamelle fitte, decorrenti, bianche poi crema.',
    fleshDescription:
      'Biancastra, soda. Odore FORTE caratteristico (dolciastro, sgradevole per alcuni). Sapore dolciastro.',
    sporeColor: 'Crema',
    habitat: ['faggeta', 'bosco misto', 'abetaia'],
    altitude: [300, 1500],
    season: { start: 9, end: 12, peak: 11 },
    substrate: 'lettiera, terreno',
    symbioticTrees: ['faggio', 'abete rosso', 'quercia'],
    typicalSize: 'grande',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'entoloma-sinuatum',
        dangerLevel: 'medio',
        differences:
          "L'E. sinuatum ha lamelle che virano al rosa-salmone e portamento più compatto. Il cimballo ha lamelle sempre bianco-crema e odore forte caratteristico.",
      },
    ],
    funFact:
      'Spesso cresce in cerchi o file spettacolari (i "cerchi delle streghe"). In Valtellina abbonda in autunno inoltrato nelle faggete. L\'odore forte e il miglior carattere identificativo.',
    iNaturalistTaxonId: 54269,
    modelClassId: 39,
  },

  // 40. Calvatia gigantea
  {
    id: 'calvatia-gigantea',
    scientificName: 'Calvatia gigantea',
    italianName: 'Vescia gigante',
    alternativeNames: [
      'Palla di neve',
      'Lycoperdon gigantesco',
      'Testa di morto',
    ],
    family: 'Agaricaceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile da giovane quando la gleba e bianca e soda. Tagliare a fette e cuocere come una cotoletta. Scartare se ingiallita.',
    capDescription:
      'Corpo fruttifero sferico, enorme, senza gambo. Superficie liscia, bianca, poi screpolata.',
    capColor: ['bianco', 'crema', 'biancastro'],
    capDiameterCm: [10, 50],
    stemDescription:
      'Assente o ridotto a una base di attacco al terreno.',
    gillsDescription:
      'Assenti. Interno (gleba) bianco compatto poi giallo e infine oliva polverulento.',
    fleshDescription:
      'Gleba bianca come marshmallow da giovane. Odore debole. Sapore dolce delicato.',
    sporeColor: 'Bruno-olivastro',
    habitat: ['prato', 'pascolo', 'parco', 'margine bosco'],
    altitude: [0, 1200],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno erboso ricco',
    symbioticTrees: [],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [],
    funFact:
      'Un singolo esemplare può raggiungere i 50 cm di diametro e pesare diversi kg. Contiene circa 7 trilioni (7.000.000.000.000) di spore. Una fetta, impanata e fritta, e una delizia rustica in Valtellina.',
    iNaturalistTaxonId: 48449,
    modelClassId: 40,
  },

  // 41. Galerina marginata
  {
    id: 'galerina-marginata',
    scientificName: 'Galerina marginata',
    italianName: 'Galerina marginata',
    alternativeNames: ['Galerina autunnale', 'Galerina velenosa'],
    family: 'Hymenogastraceae',
    edibility: 'mortale',
    edibilityNote:
      "MORTALE. Contiene amatossine come l'Amanita phalloides. Anche un singolo cappello può essere fatale. Cresce su legno in cespitini simili a chiodini. Confusione frequente e letale.",
    capDescription:
      'Cappello convesso poi piano, igrofano (cambia colore con umidita). Liscio, viscido con umidita, lucido a secco. Margine striato da umido.',
    capColor: [
      'bruno-miele',
      'ocra',
      'bruno-arancio',
      'giallastro a secco',
    ],
    capDiameterCm: [1, 5],
    stemDescription:
      "Esile, fibroso, con anello membranoso sottile (spesso caduco). Brunastro, fibrilloso sotto l'anello.",
    gillsDescription:
      'Lamelle adnate, abbastanza fitte, brunastre, sporata rugginosa.',
    fleshDescription:
      'Brunastra, sottile. Odore farinoso debole. Sapore farinoso.',
    sporeColor: 'Bruno-rugginoso',
    habitat: ['tronchi', 'ceppaie', 'legno morto di conifere'],
    altitude: [200, 1600],
    season: { start: 8, end: 11, peak: 10 },
    substrate: 'legno morto (soprattutto conifere)',
    symbioticTrees: [],
    typicalSize: 'piccolo',
    growthPattern: 'cespitoso',
    visibility: 'bassa',
    confusableWith: [
      {
        speciesId: 'armillaria-mellea',
        dangerLevel: 'mortale',
        differences:
          "I chiodini veri crescono in grossi cespi, hanno squame sul cappello, lamelle biancastre e anello robusto. La Galerina e più piccola, bruno uniforme, con anello fragile e lamelle brune. Le lamelle brune sono il segnale d'allarme.",
      },
    ],
    funFact:
      "E il killer silenzioso dei boschi di conifere: piccola, banale, quasi invisibile ma mortale quanto l'Amanita phalloides. In Valtellina si trova nelle peccete su tronchi e ceppaie. Non raccogliere MAI funghi cespitosi su legno senza certezza assoluta.",
    iNaturalistTaxonId: 55931,
    modelClassId: 41,
  },

  // 42. Lactarius torminosus
  {
    id: 'lactarius-torminosus',
    scientificName: 'Lactarius torminosus',
    italianName: 'Lattario torminoso',
    alternativeNames: [
      'Latticcio rosa peloso',
      'Peveraccio delle betulle',
    ],
    family: 'Russulaceae',
    edibility: 'tossico',
    edibilityNote:
      'TOSSICO da crudo. Causa violenti disturbi gastrointestinali. In Scandinavia viene conservato sotto sale (tradizione locale), ma in Italia se ne sconsiglia il consumo.',
    capDescription:
      'Cappello convesso poi depresso al centro, con margine fortemente involuto e PELOSO (lanoso). Cuticola viscida con zonature concentriche.',
    capColor: ['rosa-incarnato', 'rosa-salmone', 'crema-rosato'],
    capDiameterCm: [4, 12],
    stemDescription:
      'Cilindrico, corto, rosa pallido, presto cavo, con scrobicoli.',
    gillsDescription:
      'Lamelle fitte, decorrenti, rosate. Latice BIANCO, abbondante, IMMUTABILE e PICCANTE.',
    fleshDescription:
      'Biancastra, granulosa. Latice bianco abbondante, molto piccante. Odore fruttato.',
    sporeColor: 'Crema',
    habitat: ['betulleto', 'bosco misto con betulla'],
    altitude: [400, 1600],
    season: { start: 8, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['betulla'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'lactarius-deliciosus',
        dangerLevel: 'medio',
        differences:
          'Il L. deliciosus ha latice ARANCIONE (non bianco), cappello arancione (non rosa) e margine non peloso. Il L. torminosus ha latice bianco, cappello rosa e margine lanoso.',
      },
    ],
    funFact:
      'Il margine del cappello cosi peloso e unico tra i Lactarius. Il nome "torminosus" deriva dal latino "tormina" = coliche. In Valtellina si trova sotto le betulle in estate-autunno.',
    iNaturalistTaxonId: 48421,
    modelClassId: 42,
  },

  // 43. Tylopilus felleus
  {
    id: 'tylopilus-felleus',
    scientificName: 'Tylopilus felleus',
    italianName: 'Porcino amaro',
    alternativeNames: [
      'Boleto amaro',
      'Porcino falso',
      'Fiele di bue',
    ],
    family: 'Boletaceae',
    edibility: 'non_commestibile',
    edibilityNote:
      'NON commestibile per il sapore DISGUSTOSO (amarissimo). Non tossico ma un solo esemplare rovina un intero piatto di porcini. Il peggior nemico del cercatore di porcini.',
    capDescription:
      'Cappello convesso poi piano, simile al porcino. Cuticola liscia, asciutta, brunastra.',
    capColor: ['bruno chiaro', 'nocciola', 'camoscio', 'bruno-grigiastro'],
    capDiameterCm: [5, 15],
    stemDescription:
      'Robusto, con reticolo SCURO (bruno) ben evidente (nel porcino vero il reticolo e chiaro). Pieno.',
    gillsDescription:
      'Tubuli e pori bianchi da giovane, poi ROSA a maturita (carattere chiave). Nel porcino i pori sono giallo-verdastri, mai rosa.',
    fleshDescription:
      'Biancastra, immutabile, soda. Odore debole. Sapore ESTREMAMENTE AMARO (assaggiare un pezzetto e sputare).',
    sporeColor: 'Rosa-brunastro',
    habitat: ['bosco misto', 'pecceta', 'faggeta', 'abetaia'],
    altitude: [300, 1500],
    season: { start: 7, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['abete rosso', 'faggio', 'quercia', 'pino'],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'boletus-edulis',
        dangerLevel: 'basso',
        differences:
          'Il B. edulis ha pori bianchi poi giallo-verdastri (MAI rosa) e reticolo chiaro. Il T. felleus ha pori rosa e reticolo scuro. In caso di dubbio, assaggiare un pezzetto crudo: se amaro, e il felleus.',
      },
    ],
    funFact:
      "In Valtellina e la \"maledizione del cercatore\": sembra un porcino perfetto ma rovina tutto. Un trucco: osservare la base del gambo, che nel felleus e spesso rosata. L'amarezza e tale che una fettina contamina kg di porcini buoni.",
    iNaturalistTaxonId: 48702,
    modelClassId: 43,
  },

  // 44. Hygrophoropsis aurantiaca
  {
    id: 'hygrophoropsis-aurantiaca',
    scientificName: 'Hygrophoropsis aurantiaca',
    italianName: 'Falso gallinaccio',
    alternativeNames: ['Cantarello falso', 'Finto finferlo'],
    family: 'Hygrophoropsidaceae',
    edibility: 'non_commestibile',
    edibilityNote:
      'Non tossico ma non commestibile: sapore sgradevole e consistenza gommosa. Può causare lievi disturbi gastrici in soggetti sensibili.',
    capDescription:
      'Cappello convesso poi imbutiforme, con margine involuto. Cuticola liscia, asciutta, vellutata.',
    capColor: ['arancione', 'arancione intenso', 'giallo-arancio'],
    capDiameterCm: [2, 8],
    stemDescription:
      'Sottile, flessibile, concolore, spesso eccentrico. Pieno poi cavo.',
    gillsDescription:
      'Lamelle VERE (sottili, fitte, forcate, regolari) a differenza delle pliche del gallinaccio. Decorrenti, arancione vivo.',
    fleshDescription:
      'Arancio pallido, molle. Odore debole. Sapore insignificante.',
    sporeColor: 'Bianco',
    habitat: [
      'bosco di conifere',
      'pecceta',
      'pineta',
      'lettiera acida',
    ],
    altitude: [300, 1600],
    season: { start: 8, end: 11, peak: 10 },
    substrate: 'lettiera di conifere, legno marcescente',
    symbioticTrees: [],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'cantharellus-cibarius',
        dangerLevel: 'basso',
        differences:
          "Il vero gallinaccio ha PSEUDOLAMELLE (pliche spesse, ramificate, spaziate) e cresce a terra nel bosco. Il falso ha LAMELLE VERE (sottili, fitte, regolari) e cresce spesso su lettiera di conifere. L'odore di albicocca del vero gallinaccio e assente nel falso.",
      },
    ],
    funFact:
      'La confusione tra gallinaccio vero e falso e tra le più comuni ma fortunatamente non pericolosa. La chiave sta nelle lamelle: vere (sottili, fitte) nel falso, pseudolamelle (spesse, ramificate) nel vero. In Valtellina si trova nelle peccete.',
    iNaturalistTaxonId: 54132,
    modelClassId: 44,
  },

  // 45. Chlorophyllum rhacodes
  {
    id: 'chlorophyllum-rhacodes',
    scientificName: 'Chlorophyllum rhacodes',
    italianName: 'Mazza di tamburo arrossante',
    alternativeNames: ['Lepiota arrossante', 'Macrolepiota arrossante'],
    family: 'Agaricaceae',
    edibility: 'commestibile',
    edibilityNote:
      'Commestibile per la maggior parte delle persone, ma causa disturbi gastrointestinali in soggetti sensibili (circa 10%). Consumare cotto. Il viraggio al rosso della carne e normale.',
    capDescription:
      'Cappello sferico da giovane poi convesso e piano. Squame larghe e grossolane, brune su fondo chiaro.',
    capColor: ['bruno chiaro con squame', 'crema con squame brunastre'],
    capDiameterCm: [6, 15],
    stemDescription:
      'Liscio (SENZA zebratura — a differenza della M. procera), con anello doppio mobile. Biancastro, vira al bruno-arancio al tocco. Base bulbosa.',
    gillsDescription:
      'Lamelle libere, fitte, bianche poi crema. Virano al rosa-arancio se danneggiate.',
    fleshDescription:
      'Bianca, vira al ROSSO-ARANCIO al taglio (differenza chiave). Odore e sapore gradevoli.',
    sporeColor: 'Bianco',
    habitat: [
      'parco',
      'giardino',
      'margine bosco',
      'terreno concimato',
    ],
    altitude: [0, 1200],
    season: { start: 7, end: 11, peak: 9 },
    substrate: 'terreno ricco di humus',
    symbioticTrees: [],
    typicalSize: 'medio',
    growthPattern: 'singolo',
    visibility: 'media',
    confusableWith: [
      {
        speciesId: 'macrolepiota-procera',
        dangerLevel: 'basso',
        differences:
          'La M. procera ha gambo ZEBRATO, carne bianca immutabile e taglia maggiore. Il C. rhacodes ha gambo liscio, carne che vira al rosso e taglia minore.',
      },
    ],
    funFact:
      'Il viraggio al rosso della carne e spettacolare: tagliando il gambo, diventa arancione in pochi minuti. In Valtellina si trova in parchi e giardini, meno comune nei boschi.',
    iNaturalistTaxonId: 348192,
    modelClassId: 45,
  },

  // 46. Craterellus tubaeformis
  {
    id: 'cantharellus-tubaeformis',
    scientificName: 'Craterellus tubaeformis',
    italianName: 'Finferla',
    alternativeNames: [
      'Cantarello a tromba',
      'Gallinaccio giallo',
      'Cantharellus tubaeformis',
    ],
    family: 'Cantharellaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, ottimo essiccato. Sapore delicato, si usa come condimento. Nessun rischio di confusione con specie tossiche.',
    capDescription:
      'Cappello imbutiforme, sottile, con margine ondulato e irregolare. Centro depresso fino a forare il gambo cavo.',
    capColor: ['bruno-giallastro', 'bruno-olivastro', 'grigio-brunastro'],
    capDiameterCm: [2, 6],
    stemDescription:
      'Sottile, cavo, compresso, giallo vivo (a volte arancio). Liscio.',
    gillsDescription:
      'Pseudolamelle (pliche) spaziate, decorrenti, grigio-giallastre, ramificate.',
    fleshDescription:
      'Sottile, elastica, giallastra. Odore fruttato debole. Sapore dolce delicato.',
    sporeColor: 'Bianco-crema',
    habitat: ['pecceta', 'faggeta', 'bosco misto umido', 'muschio'],
    altitude: [400, 1600],
    season: { start: 8, end: 11, peak: 10 },
    substrate: 'terreno umido, muschio, lettiera',
    symbioticTrees: ['abete rosso', 'faggio', 'betulla'],
    typicalSize: 'piccolo',
    growthPattern: 'gregario',
    visibility: 'bassa',
    confusableWith: [],
    funFact:
      "Cresce a centinaia nel muschio delle peccete umide. In Valtellina e un fungo autunnale tardivo molto apprezzato: si essicca perfettamente e si usa in risotti tutto l'inverno.",
    iNaturalistTaxonId: 48231,
    modelClassId: 46,
  },

  // 47. Sparassis crispa
  {
    id: 'sparassis-crispa',
    scientificName: 'Sparassis crispa',
    italianName: 'Sparasside crespa',
    alternativeNames: [
      'Fungo cavolfiore',
      'Griffola crespa',
      'Sparassis',
    ],
    family: 'Sparassidaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile, sapore delicato di nocciola. Difficile da pulire per la forma intricata. Meglio giovane.',
    capDescription:
      'Corpo fruttifero grande, ramificato, simile a un cavolfiore o a una spugna marina. Composto da lamelle appiattite e arricciate.',
    capColor: ['crema', 'giallo pallido', 'ocra chiaro'],
    capDiameterCm: [15, 40],
    stemDescription:
      "Base unica radicante, robusta, attaccata al legno o alle radici dell'albero ospite.",
    gillsDescription:
      'Assenti. Le spore si formano sulla superficie delle lamelle arricciate.',
    fleshDescription:
      'Bianca, elastica, croccante. Odore gradevole di nocciola. Sapore dolce.',
    sporeColor: 'Bianco-crema',
    habitat: ['pineta', 'pecceta', 'bosco di conifere'],
    altitude: [400, 1500],
    season: { start: 8, end: 11, peak: 9 },
    substrate: 'base di conifere vive, radici',
    symbioticTrees: ['pino silvestre', 'abete rosso', 'larice'],
    typicalSize: 'grande',
    growthPattern: 'singolo',
    visibility: 'alta',
    confusableWith: [],
    funFact:
      'Sembra un grosso cavolfiore bianco ai piedi degli alberi. Un singolo esemplare può pesare fino a 10 kg. In Valtellina e raro ma spettacolare, trovato alla base di grandi pini e larici.',
    iNaturalistTaxonId: 53760,
    modelClassId: 47,
  },

  // 48. Gomphus clavatus
  {
    id: 'gomphus-clavatus',
    scientificName: 'Gomphus clavatus',
    italianName: 'Cantarello viola',
    alternativeNames: ['Gomfo clavato', 'Finferla viola'],
    family: 'Gomphaceae',
    edibility: 'buono',
    edibilityNote:
      'Buon commestibile. Sapore delicato, leggermente amarognolo. Specie rara e protetta in molte regioni: verificare la regolamentazione locale prima di raccoglierlo.',
    capDescription:
      'Corpo fruttifero a forma di clava poi imbutiforme, con margine irregolare ondulato.',
    capColor: ['viola', 'viola-brunastro', 'lilla sbiadito'],
    capDiameterCm: [3, 10],
    stemDescription:
      'Corto, massiccio, attenuato verso la base, violaceo poi ocraceo.',
    gillsDescription:
      'Pliche (pseudolamelle) decorrenti, spaziate, violacee poi ocracee. Ramificate.',
    fleshDescription:
      'Biancastra-violacea, soda. Odore debole gradevole. Sapore mite, leggermente amarognolo.',
    sporeColor: 'Ocra',
    habitat: ['pecceta', 'abetaia', 'bosco di conifere'],
    altitude: [600, 1800],
    season: { start: 8, end: 10, peak: 9 },
    substrate: 'terreno',
    symbioticTrees: ['abete rosso', 'abete bianco'],
    typicalSize: 'medio',
    growthPattern: 'gregario',
    visibility: 'media',
    confusableWith: [],
    funFact:
      'Specie in rarefazione in tutta Europa, inserita nelle liste rosse di molti paesi. In Valtellina si trova nelle peccete mature ad alta quota. Se lo trovate, fotografatelo e lasciatelo crescere.',
    iNaturalistTaxonId: 54575,
    modelClassId: 48,
  },
];

/**
 * Conteggio rapido specie per categoria
 */
export function getAllSpecies(): Species[] {
  return SPECIES_DATABASE;
}

export function getSpeciesCount(): number {
  return SPECIES_DATABASE.length;
}

// ── Web-specific helpers ───────────────────────────────────

/**
 * Generate URL-friendly slug from species data.
 * Format: "porcino-boletus-edulis"
 */
export function getSpeciesSlug(species: Species): string {
  const namePart = species.italianName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${namePart}-${species.id}`;
}

/**
 * Find a species by its URL slug.
 */
export function getSpeciesBySlug(slug: string): Species | undefined {
  return SPECIES_DATABASE.find((s) => getSpeciesSlug(s) === slug);
}

/**
 * Lookup a species by ID.
 */
export function getSpeciesById(id: string): Species | undefined {
  return SPECIES_DATABASE.find((s) => s.id === id);
}

/**
 * Italian labels for edibility values.
 */
export const EDIBILITY_LABELS: Record<Species['edibility'], string> = {
  ottimo: 'Ottimo commestibile',
  buono: 'Buon commestibile',
  commestibile: 'Commestibile',
  non_commestibile: 'Non commestibile',
  tossico: 'Tossico',
  mortale: 'MORTALE',
};

export const EDIBILITY_COLORS: Record<Species['edibility'], string> = {
  ottimo: '#27AE60',
  buono: '#2ECC71',
  commestibile: '#F39C12',
  non_commestibile: '#95A5A6',
  tossico: '#E67E22',
  mortale: '#C0392B',
};

export const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/**
 * Split a differences string into readable bullet points.
 * Tries sentence boundaries first (". " followed by uppercase), then returns as-is.
 */
export function splitDifferences(text: string): string[] {
  const sentences = text
    .split(/(?<=\.)\s+(?=[A-ZÀÈÌÒÙ])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : [text];
}
