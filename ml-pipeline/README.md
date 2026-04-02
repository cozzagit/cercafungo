# CercaFungo — ML Pipeline

Pipeline completa per addestrare i modelli di riconoscimento funghi dell'app CercaFungo.

## Architettura a 2 Stadi

Il riconoscimento funghi funziona in due fasi:

1. **Stage 1 — Detector (YOLOv8n)**: Rileva la presenza di funghi nell'immagine e ne localizza la posizione con bounding box. Classe singola: `fungo`.
2. **Stage 2 — Classificatore (EfficientNet-B0)**: Prende il ritaglio del fungo rilevato e ne identifica la specie tra 49 classi (48 specie + "sconosciuto").

### Specie Supportate (48)

| # | Specie | Nome Italiano | Commestibile |
|---|--------|--------------|-------------|
| 1 | Boletus edulis | Porcino | Si |
| 2 | Boletus aereus | Porcino nero | Si |
| 3 | Boletus pinophilus | Porcino dei pini | Si |
| 4 | Boletus reticulatus | Porcino estivo | Si |
| 5 | Cantharellus cibarius | Gallinaccio | Si |
| 6 | Amanita caesarea | Ovolo buono | Si |
| 7 | Craterellus cornucopioides | Trombetta dei morti | Si |
| 8 | Hydnum repandum | Steccherino dorato | Si |
| 9 | Macrolepiota procera | Mazza di tamburo | Si |
| 10 | Armillaria mellea | Chiodino | Si |
| 11 | Lactarius deliciosus | Sanguinello | Si |
| 12 | Morchella esculenta | Spugnola | Si |
| 13 | Tricholoma terreum | Moretta | Si |
| 14 | Russula cyanoxantha | Colombina maggiore | Si |
| 15 | Pleurotus ostreatus | Orecchione | Si |
| 16 | Amanita phalloides | Tignosa verdognola | **MORTALE** |
| 17 | Amanita verna | Tignosa primaverile | **MORTALE** |
| 18 | Amanita virosa | Tignosa bianca | **MORTALE** |
| 19 | Amanita muscaria | Ovolo malefico | **TOSSICO** |
| 20 | Amanita pantherina | Tignosa bruna | **TOSSICO** |
| 21 | Cortinarius orellanus | Cortinario orellano | **MORTALE** |
| 22 | Entoloma sinuatum | Entoloma livido | **TOSSICO** |
| 23 | Gyromitra esculenta | Falsa spugnola | **TOSSICO** |
| 24 | Omphalotus olearius | Fungo dell'olivo | **TOSSICO** |
| 25 | Hypholoma fasciculare | Falso chiodino | **TOSSICO** |
| 26 | Rubroboletus satanas | Porcino malefico | **TOSSICO** |
| 27 | Russula emetica | Colombina rossa | **TOSSICO** |
| 28 | Tricholoma pardinum | Agarico tigrino | **TOSSICO** |
| 29 | Agaricus campestris | Prataiolo | Si |
| 30 | Suillus luteus | Pinarolo | Si |
| 31 | Imleria badia | Boleto baio | Si |
| 32 | Coprinus comatus | Coprino chiomato | Si |
| 33 | Amanita rubescens | Tignosa vinata | Si |
| 34 | Leccinum scabrum | Porcinello grigio | Si |
| 35 | Leccinum aurantiacum | Porcinello rosso | Si |
| 36 | Calocybe gambosa | Prugnolo | Si |
| 37 | Lycoperdon perlatum | Vescia gemmata | Si |
| 38 | Lepista nuda | Agarico violetto | Si |
| 39 | Clitocybe nebularis | Cimballo | Si |
| 40 | Calvatia gigantea | Vescia gigante | Si |
| 41 | Galerina marginata | Galerina marginata | **MORTALE** |
| 42 | Lactarius torminosus | Lattario torminoso | **TOSSICO** |
| 43 | Tylopilus felleus | Porcino amaro | No |
| 44 | Hygrophoropsis aurantiaca | Falso gallinaccio | No |
| 45 | Chlorophyllum rhacodes | Mazza di tamburo arrossante | Si |
| 46 | Craterellus tubaeformis | Finferla | Si |
| 47 | Sparassis crispa | Sparasside crespa | Si |
| 48 | Gomphus clavatus | Cantarello viola | Si |
| 0 | — | Sconosciuto | — |

## Setup

### Requisiti

- Python 3.10+
- GPU consigliata (NVIDIA con CUDA) ma non obbligatoria
- 10+ GB di spazio su disco per dataset e modelli

### Installazione

```bash
cd cercafungo/ml-pipeline

# Crea ambiente virtuale
python -m venv venv

# Attiva (Windows)
venv\Scripts\activate
# Attiva (Linux/macOS)
source venv/bin/activate

# Installa dipendenze
pip install -r requirements.txt
```

### Note su GPU

- **NVIDIA GPU**: Installa PyTorch con CUDA: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121`
- **Apple Silicon**: PyTorch supporta MPS nativamente, basta il pip standard
- **Solo CPU**: Funziona tutto ma il training sara' molto piu' lento (ore invece di minuti)

### API Keys (opzionali)

Per scaricare dati da fonti esterne, configura queste variabili d'ambiente:

```bash
# Flickr (per download foto CC)
export FLICKR_API_KEY="la_tua_api_key"

# Unsplash (per sfondi sottobosco)
export UNSPLASH_ACCESS_KEY="la_tua_access_key"

# Roboflow (per dataset pubblici, opzionale)
export ROBOFLOW_API_KEY="la_tua_api_key"
```

## Pipeline Completa (un comando)

```bash
# Esegui TUTTA la pipeline dalla A alla Z
python -m scripts.run_pipeline --stage all

# Oppure stadio per stadio
python -m scripts.run_pipeline --stage download
python -m scripts.run_pipeline --stage prepare
python -m scripts.run_pipeline --stage train
python -m scripts.run_pipeline --stage evaluate
python -m scripts.run_pipeline --stage export

# Da uno stadio in poi
python -m scripts.run_pipeline --from-stage train
```

## Workflow Step-by-Step

### 1. Download Dataset

```bash
# Scarica da Roboflow Universe (dataset di mushroom detection)
python -m dataset.download_roboflow

# Scarica foto da iNaturalist (per classificazione specie)
python -m dataset.download_inaturalist

# Scarica foto Creative Commons da Flickr
python -m dataset.download_flickr

# Scarica sfondi di sottobosco per dati sintetici
python -m dataset.download_backgrounds

# Opzionale: scarica solo una specie specifica
python -m dataset.download_inaturalist --species boletus_edulis --max-photos 500
```

### 2. Raccolta Dati Manuale

```bash
# Raccogli foto con webcam/fotocamera
python -m tools.camera_collector

# Annota le foto manualmente (bounding box)
python -m tools.annotate_manual --images data/raw/manual/
```

### 3. Dati Sintetici (opzionale ma consigliato)

```bash
# Crea sfondi placeholder per test (sostituire con foto reali)
python -m dataset.synthetic_generator --create-placeholders

# Genera immagini sintetiche
python -m dataset.synthetic_generator --num-images 5000
```

### 4. Preparazione Dataset

```bash
# Unisci tutte le sorgenti, split train/val/test, formato YOLOv8
python -m dataset.prepare_dataset
```

### 5. Visualizzazione e Verifica

```bash
# Statistiche e preview annotazioni
python -m dataset.visualize

# Solo statistiche (senza preview grafica)
python -m dataset.visualize --stats-only
```

Oppure usa il notebook Jupyter:

```bash
jupyter notebook notebooks/exploration.ipynb
```

### 6. Training Detector (Stage 1)

```bash
# Training YOLOv8n (100 epoch di default)
python -m training.train_detector

# Con parametri custom
python -m training.train_detector --epochs 50 --batch-size 8 --device cpu

# Resume training interrotto
python -m training.train_detector --resume
```

### 7. Training Classificatore (Stage 2)

```bash
# Training EfficientNet-B0 (50 epoch di default)
python -m training.train_classifier

# Con parametri custom
python -m training.train_classifier --epochs 30 --batch-size 16 --lr 0.0001
```

### 8. Valutazione

```bash
# Valuta automaticamente gli ultimi modelli addestrati
python -m training.evaluate

# Valuta modelli specifici
python -m training.evaluate --detector-weights models/detector/best.pt --classifier-weights models/classifier/best_model.pt
```

### 9. Export per Mobile

```bash
# Esporta tutti i modelli (TFLite + CoreML + ONNX)
python -m training.export_mobile

# Salta il test di inferenza
python -m training.export_mobile --skip-test

# Non copiare nella cartella assets dell'app
python -m training.export_mobile --skip-copy
```

### 10. Quick Test

```bash
# Test rapido sul modello esportato
python -m scripts.quick_test

# Specifica modello e immagini
python -m scripts.quick_test --model exports/detector.onnx --images data/raw/manual/

# Salva risultati
python -m scripts.quick_test --save test_results.png
```

## Tools

### Annotazione Manuale (`tools/annotate_manual.py`)

Tool visivo per annotare bounding box sulle foto raccolte in campo:

```bash
python -m tools.annotate_manual --images data/raw/manual/
```

**Controlli**: mouse drag = bbox, n/p = naviga, u = undo, s = salva, q = esci, 0-9 = classe.
Il progresso viene salvato automaticamente: se interrompi, riparte da dove eri rimasto.

### Camera Collector (`tools/camera_collector.py`)

Raccolta foto di training con webcam o fotocamera del telefono:

```bash
python -m tools.camera_collector
python -m tools.camera_collector --camera 1 --resolution 1920 1080
```

**Controlli**: c = cattura, z = zoom, g = griglia, f = flip, q = esci.

## Struttura Output

Dopo l'esecuzione completa, la struttura sara':

```
ml-pipeline/
├── data/
│   ├── raw/
│   │   ├── roboflow/          # Dataset detection scaricati
│   │   ├── inaturalist/       # Foto specie da iNaturalist
│   │   │   ├── boletus_edulis/
│   │   │   ├── cantharellus_cibarius/
│   │   │   └── ... (48 specie)
│   │   ├── flickr/            # Foto da Flickr CC
│   │   └── manual/            # Foto aggiunte manualmente
│   ├── annotations/           # Annotazioni manuali YOLO
│   ├── backgrounds/           # Sfondi per dati sintetici
│   ├── synthetic/             # Immagini sintetiche generate
│   └── processed/             # Dataset finale unificato
│       ├── dataset.yaml
│       ├── train/
│       ├── val/
│       └── test/
├── models/
│   ├── detector/              # Checkpoint YOLOv8
│   ├── classifier/            # Checkpoint EfficientNet
│   └── evaluation/            # Report e metriche
└── exports/                   # Modelli esportati per mobile
    ├── detector.onnx
    ├── detector.tflite
    ├── detector.mlpackage/
    ├── classifier.onnx
    ├── classifier.tflite
    ├── classifier.mlpackage/
    └── classifier_metadata.json
```

## Configurazione

Tutte le impostazioni sono centralizzate in `config.yaml`:

- **Percorsi**: directory di input/output
- **iNaturalist**: area geografica, specie, limiti download
- **Flickr**: API key, termini di ricerca, licenze CC
- **Roboflow**: progetti da scaricare
- **Sfondi**: fonti e target per dati sintetici
- **Training**: iperparametri per detector e classificatore
- **Export**: formati, quantizzazione, piattaforme target
- **Annotation**: impostazioni tool di annotazione
- **Camera**: impostazioni camera collector
- **Pipeline**: configurazione stadi per l'orchestratore

## Note Importanti

- **Sicurezza**: Il modello include un'analisi specifica degli errori sulle specie tossiche. Un fungo tossico classificato come commestibile e' un errore CRITICO. Il sistema deve restituire "sconosciuto" quando non e' sicuro.
- **Rate Limits**: I download da iNaturalist rispettano il limite di 1 richiesta/secondo. Non modificare questo valore.
- **Licenze Foto**: Le foto di iNaturalist e Flickr hanno licenze diverse (CC-BY, CC-BY-NC, etc.). Verificare le licenze prima dell'uso commerciale.
- **GPU Memory**: YOLOv8n richiede circa 4 GB di VRAM. Riduci il batch_size se hai meno memoria.
- **48 Specie**: La lista specie in config.yaml e' allineata con `lib/species/data.ts` dell'app (48 specie + sconosciuto, class_id 0-48).
