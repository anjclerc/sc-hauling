# SC Hauling

🇫🇷 Outil de commerce et de hauling pour **Star Citizen**, basé sur les prix publiés par [UEX](https://uexcorp.space).
🇬🇧 Trading and hauling tool for **Star Citizen**, based on prices published by [UEX](https://uexcorp.space).

**▶ https://anjclerc.github.io/sc-hauling/**

📖 [Wiki — mode d'emploi / user guide](https://github.com/anjclerc/sc-hauling/wiki) · 🐞 [Signaler un bug / Report a bug](https://github.com/anjclerc/sc-hauling/issues/new?template=bug.yml) · 💡 [Proposer une idée / Suggest an idea](https://github.com/anjclerc/sc-hauling/issues/new?template=suggestion.yml)

---

## 🇫🇷 Français

L'application tient dans un seul fichier, `index.html`. Elle s'ouvre dans le navigateur, sans installation ni serveur.

- **Ressources** : pour chaque marchandise, le lieu le moins cher à l'achat et le plus cher à la vente. Elle donne le bénéfice par SCU et par chargement plein, le pire des cas, les tailles de caisses et le temps de trajet. Un clic sur une carte affiche tous les lieux, et on peut y choisir sa propre route.
- **Contrats / Route** : vos contrats de hauling, la charge par trajet comparée à la soute, et un itinéraire optimisé.
- **Signatures** : identification d'une valeur de scan de minage, et lieux où trouver chaque minerai.
- **📍 Lieu** : tout ce qui s'achète et se vend à un terminal (avec les bonnes affaires en surbrillance), ou les minerais d'une zone de minage avec leur pourcentage d'apparition.
- **Contrôles** : fiche de vérification d'une route après un vol à vide, avec historique et rappel pour la recontrôler.

**Token UEX** : il n'est pas obligatoire, car les prix sont publics. Un token personnel est conseillé : créez-le sur [uexcorp.space/api/apps](https://uexcorp.space/api/apps), puis collez-le dans **Réglages**. Il reste dans votre navigateur. Chaque joueur crée le sien et ne le partage pas.

**Langue** : français si votre navigateur est en français, anglais sinon. Modifiable dans **Réglages › Langue / Language**.

Vos contrats, contrôles et réglages sont enregistrés dans votre navigateur. Ils ne sont envoyés nulle part.

## 🇬🇧 English

The whole app is a single file, `index.html`. It runs in your browser with no install and no server.

- **Resources**: for each commodity, the cheapest place to buy and the best place to sell. It shows profit per SCU and per full load, the worst case, box sizes and trip time. Click a card to see every location and pick your own route.
- **Contracts / Route**: your hauling contracts, the load per trip compared with your hold, and an optimized itinerary.
- **Signatures**: identify a mining scan value and see where each ore can be found.
- **📍 Location**: everything bought and sold at a terminal (good deals highlighted), or the ores of a mining area with their spawn percentage.
- **Checks**: a check sheet to verify a route after an empty run, with history and a reminder to recheck it.

**UEX token**: it is optional, because prices are public. A personal token is recommended: create it at [uexcorp.space/api/apps](https://uexcorp.space/api/apps) and paste it in **Settings**. It stays in your browser. Every player creates their own and does not share it.

**Language**: French if your browser is in French, English otherwise. You can change it in **Settings › Language**.

Your contracts, checks and settings are stored in your browser. They are never sent anywhere.

---

## Données mises à jour automatiquement / Automatic data updates

Le script [`scripts/update-data.mjs`](scripts/update-data.mjs) est lancé chaque jour par GitHub Actions ([`update-data.yml`](.github/workflows/update-data.yml)), ou à la main depuis l'onglet **Actions › Mise à jour des données › Run workflow**. Il récupère ce que l'API UEX ne fournit pas et le publie dans [`data/`](data) :

- `mining.json` : minerais, signatures et lieux de minage d'après [scmdb.net](https://scmdb.net), via leur miroir GitHub [KrovaxCode/SCMDB_DATA](https://github.com/KrovaxCode/SCMDB_DATA) (scmdb.net en secours), dernière version « live » du jeu ;
- `blueprints.json` : blueprints de fabrication, ingrédients et missions qui les donnent (onglet 🎯 Missions › 🛠 Blueprints), d'après scmdb ;
- `missions.json` : missions par faction, rangs requis, prérequis et ce qu'elles débloquent (onglet 🎯 Missions), d'après scmdb ;
- `sctrade.json` : derniers prix relevés sur [SC Trade Tools](https://sc-trade.tools), pour les comparer avec UEX (désactivé tant que SC Trade Tools n'a pas donné son accord : `SCTT_ENABLED` dans le workflow).

L'application lit ces fichiers au démarrage et garde ses données intégrées si elles sont indisponibles.

*A daily GitHub Action fetches the data the UEX API does not provide (mining data from scmdb.net, community prices from SC Trade Tools) into `data/`. The app loads these files at startup and falls back to its built-in data.*

## Crédits / Credits

🇫🇷 D'une idée de **Akumetsu86**, fait par **Claude** (IA d'Anthropic).
🇬🇧 An idea by **Akumetsu86**, made by **Claude** (Anthropic's AI).

🙏 Un grand merci à **[UEX](https://uexcorp.space)** et à sa communauté de joueurs, qui relèvent les prix du commerce en jeu et les partagent gratuitement avec leur API. Merci aussi à **[scmdb.net](https://scmdb.net)** pour les données de minage.
🙏 Many thanks to **[UEX](https://uexcorp.space)** and its player community, who record in-game trade prices and share them for free through their API. Thanks also to **[scmdb.net](https://scmdb.net)** for the mining data.

---

Données / Data: prix / prices © [UEX](https://uexcorp.space) · minage / mining © [scmdb.net](https://scmdb.net). Star Citizen® est une marque de / is a trademark of Cloud Imperium Rights LLC. Projet de fan non officiel / unofficial fan project.
