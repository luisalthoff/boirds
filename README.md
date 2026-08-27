# Radar BR - v0.1

Primeiro protótipo funcional de um detector offline de radares para PWA.

## Recursos atuais

- HTML/CSS/JavaScript puro
- GPS contínuo com `watchPosition`
- IndexedDB para armazenamento local da base de radares
- Botão manual para atualização da base
- Service Worker para funcionamento offline
- Cálculo de distância por Haversine
- Filtro básico por direção
- Verificação simples se a distância está diminuindo
- Alertas em 1000 m, 500 m e 200 m
- Beep, vibração e voz quando suportados

## Importante

`data/radars.json` contém apenas coordenadas de TESTE.

Não use esta base para navegação real.

## GitHub Pages

Publique todo o conteúdo na raiz do repositório e habilite GitHub Pages.

A geolocalização e o Service Worker exigem HTTPS. GitHub Pages já fornece HTTPS.

## Próximo passo

Substituir `data/radars.json` por uma base normalizada com radares reais de RS, SC, PR, SP e RJ.
