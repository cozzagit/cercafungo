# CercaFungo

Assistente AI per la cerca dei funghi in Valtellina. Utilizza la fotocamera dello smartphone per rilevare e identificare i funghi nel sottobosco in tempo reale.

## Funzionalita

- **Scanner**: fotocamera con rilevamento ML in tempo reale (2-5 metri di distanza)
- **Mappa**: visualizza tutti i ritrovamenti geolocalizzati su mappa terreno
- **Guida**: enciclopedia delle specie con filtri per commestibilita, stagione e habitat
- **Profilo**: statistiche di raccolta, impostazioni e preferenze

## Stack Tecnologico

- **Framework**: Expo SDK 52 + Expo Router
- **UI**: React Native + TypeScript + Reanimated
- **Camera**: react-native-vision-camera v4
- **ML**: YOLO (rilevamento) + Classificatore fine-grained (identificazione specie)
- **Storage**: expo-sqlite (ritrovamenti) + react-native-mmkv (impostazioni)
- **Mappe**: react-native-maps con stile terreno personalizzato
- **GPS**: expo-location con tracking sessione

## Setup Locale

```bash
# Installa dipendenze
npm install

# Avvia su iOS
npx expo run:ios

# Avvia su Android
npx expo run:android

# Avvia in Expo Go (funzionalita limitate)
npx expo start
```

## Architettura

```
app/            Screen Expo Router (tabs + detail)
components/     Componenti riutilizzabili (ui, scanner, map, guide)
lib/
  ml/           Wrapper modello ML (detector, classifier, frame processor)
  storage/      Persistenza (SQLite findings, MMKV settings, feedback)
  species/      Database specie fungine locale
  location/     GPS tracker per sessioni di ricerca
assets/         Modelli ML, immagini specie, font
```

## Nota Importante

CercaFungo e uno strumento di supporto alla ricerca. Non sostituisce in alcun caso la verifica da parte di un micologo professionista. Non consumare mai funghi senza identificazione certa da parte di un esperto.
