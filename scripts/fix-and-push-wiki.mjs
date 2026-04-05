import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@libsql/client";

// --- 1. Load and fix wiki.json ---
let wiki = JSON.parse(readFileSync("data/wiki.json", "utf8"));

// Pages to REMOVE
const toRemove = [
  "wiki144", // Enchères Discord (n'existe pas)
  "wiki145", // Mini-Jeux Discord (n'existe pas)
  "wiki129", // Liaison de Compte in-game (plus de link discord)
  "wiki022", // Dimension Glace (n'existe plus)
  "wiki023", // Dimension Feu (n'existe plus)
];

wiki = wiki.filter((p) => !toRemove.includes(p.id));

// Fix Bot Discord section - remove references to enchères/mini-jeux
const botDiscordRoot = wiki.find((p) => p.id === "wiki136");
if (botDiscordRoot) {
  botDiscordRoot.content = `Le Bot Discord officiel de Linesia est une extension complete du serveur. Il vous permet de jouer au casino, gerer votre economie, et bien plus, directement depuis Discord.

Toutes les fonctionnalites sont synchronisees en temps reel avec votre compte Minecraft.`;
}

// Fix order of remaining bot discord children (after removing enchères/mini-jeux)
// wiki137 Casino = 0, wiki142 Éco = 1, wiki143 Infos = 2, wiki146 Tickets = 3
const botChildrenOrder = { wiki137: 0, wiki142: 1, wiki143: 2, wiki146: 3 };
for (const [id, order] of Object.entries(botChildrenOrder)) {
  const p = wiki.find((x) => x.id === id);
  if (p) p.order = order;
}

// Fix Gameplay General children order (after removing dimensions)
// Reorder from order 7 onwards since we removed 7 (glace) and 8 (feu)
const gameplayChildren = wiki
  .filter((p) => p.parentId === "wiki014")
  .sort((a, b) => a.order - b.order);
gameplayChildren.forEach((p, i) => {
  p.order = i;
});

// Fix Commandes children order (after removing wiki129)
const commandeChildren = wiki
  .filter((p) => p.parentId === "wiki097")
  .sort((a, b) => a.order - b.order);
commandeChildren.forEach((p, i) => {
  p.order = i;
});

// Update Zone Combat (wiki020) to mention zombies, pigmen, wither
const zoneCombat = wiki.find((p) => p.id === "wiki020");
if (zoneCombat) {
  zoneCombat.content = `***

## **Zone Combat sur Linesia**

La **Zone Combat** est une zone dédiée à l'affrontement contre des mobs variés. Accessible via la commande \`/combat\` (aliases : \`/mobs\`, \`/forest\`), elle vous permet de farmer de l'XP, des drops et de progresser dans le métier de Guerrier.

***

### Mobs présents

La forêt de combat contient trois types de mobs :

#### 🧟 **Zombies**
* Mob de base, idéal pour débuter
* Drops : équipements basiques, XP
* Spawne en grande quantité

#### 🐷 **Pigmen (Zombies Piglin)**
* Mob intermédiaire, plus résistant
* Drops : or, équipements améliorés
* Plus dangereux que les zombies classiques

#### 💀 **Wither Squelettes**
* Mob avancé, le plus dangereux de la zone
* Drops : charbon d'os, crânes de Wither, items rares
* Dégâts élevés, à affronter bien équipé

***

### Fonctionnement

* Le **PvP est désactivé** dans la zone Combat
* Les mobs respawnent automatiquement
* Les drops sont personnalisés pour Linesia
* Vous gagnez de l'XP de métier **Guerrier** en tuant des mobs

***

### Commandes

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/combat\` | \`/mobs\`, \`/forest\` | Se téléporter à la zone Combat |

***

### Conseils

* Équipez-vous correctement avant d'affronter les Wither Squelettes
* Utilisez les drops pour le shop ou l'HDV
* Combinez avec les spawners de votre base pour maximiser vos gains`;
}

// Update Spawners page (wiki029) - it's in the forest now
const spawners = wiki.find((p) => p.id === "wiki029");
if (spawners) {
  spawners.content = `***

## **Les Spawners sur Linesia**

Les spawners sont des générateurs de mobs que vous pouvez placer dans votre base de faction. Ils produisent automatiquement des mobs que vous pouvez tuer pour obtenir des drops, de l'XP et de l'argent.

***

### Types de Spawners

Trois types de spawners sont disponibles sur Linesia :

* **🧟 Zombies** — Spawner de base, le plus courant
* **🐷 Pigmen** — Spawner intermédiaire, drops plus intéressants
* **💀 Wither Squelettes** — Spawner rare, meilleurs drops

***

### Obtenir un Spawner

* **Boxs** : Les spawners sont des récompenses rares dans les boxs (Farm, Glace, Feu, Légendaire)
* **HDV** : Achetez-en auprès d'autres joueurs via \`/market\`

***

### Limite de Spawners

Le nombre de spawners que vous pouvez placer dépend du **niveau de votre Monolithe** :

| Niveau Monolithe | Spawners Max |
|-----------------|--------------|
| Niveau 1 | 1 |
| Niveau 2 | 3 |
| Niveau 3 | 5 |
| Niveau 4 | 8 |
| Niveau 5 | 10 |

***

### Conseils

* Améliorez votre Monolithe pour placer plus de spawners
* Protégez vos spawners derrière des défenses solides
* Les spawners sont des cibles prioritaires lors des raids`;
}

// Update Accueil (wiki001) - remove dimensions, enchères, mini-jeux, link discord
const accueil = wiki.find((p) => p.id === "wiki001");
if (accueil) {
  accueil.content = `Bienvenue sur le **wiki officiel du serveur Linesia** ! Celui-ci vous sera utile tout au long de votre progression, et vous permettra une aventure sans accroc.

Vous y retrouverez **toutes les fonctionnalités du serveur**, ainsi que **les informations utiles** liées à **Linesia** ! Si vous y trouvez des erreurs ou que vous voulez qu'une information y soit ajoutée, veuillez faire un ticket sur Discord.

***

## 📂 **Catalogue du Wiki**

### 1. **Informations générales**

* Règlement en jeu
* Règlement Discord
* Questions récurrentes
* Discord
* Fonctionnalités du Bot Discord
* Tutoriels

### 2. **Gameplay – Général**

* Bien débuter
* Les Prestiges
* Les Zones (Farm, Mine, Combat, Pêche)
* Décoration
* Bases de Faction
* Raids de Faction
* Quêtes de Faction
* PvP
* Spawners (Zombies, Pigmen, Wither Squelettes)
* Métiers (Jobs)
* Système de Primes

### 3. **Gameplay – Objets**

* Armures (Améthyste, Rubis, Onyx, Farm, Glace, Feu)
* Épées (Améthyste, Rubis, Onyx)
* Minerais (Améthyste, Rubis, Onyx, Glace, Volcanique)
* Sticks (Freeze, Anti-Perle, Anti-Item, Anti-Build, Anti-Back, Téléportation, View, Size, Effect, God, Repair, Foudre)
* Outils (Améthyste, Rubis, Onyx)
* Objets spéciaux (SwitchBall, EggTrap, Bump, Glider, Grappin, Chorus, Dynamite)
* Blocs spéciaux (Anti-Pearl, Élévateur, Terre Enrichie, Monolithe)

### 4. **Économie**

* Argent en jeu
* Trade
* Cash (Argent physique)
* ATM (Temps de jeu en argent)

### 5. **Personnalisation**

* Cosmétiques (Tags, Capes, Chapeaux, Ailes)

### 6. **Les Commandes**

* Faction
* Statistiques
* Cooldown
* Classements
* Shop
* Hôtel de Vente
* Profil
* Paramètres
* Warzone
* Trade Cosmétique
* Téléportation & Warps
* Communication
* Utilitaires
* Kits
* Commandes Économie

### 7. **Bot Discord**

* Casino (Blackjack, Slots, Roulette, Coin Flip)
* Commandes économiques
* Informations & Stats
* Tickets

### 8. **Événements**

* Outpost
* Domination
* Nexus
* Totem
* AFK Money
* Chest Refill
* Purification

### 9. **Les Boxs**

* Box Commune, Box Farm, Box Glace, Box Feu, Box Légendaire, Pocket Box

### 10. **Les Grades**

* Grade Premium
* Grade Elite`;
}

// Update Bot Discord features page (wiki007) - remove enchères, mini-jeux, link section
const botPage = wiki.find((p) => p.id === "wiki007");
if (botPage) {
  botPage.content = `***

## **Le Bot Discord de Linesia — Votre passerelle entre le serveur et Discord**

Le **Bot Discord officiel de Linesia** est une véritable extension du serveur. Il vous permet de gérer votre argent, vos tokens, participer à des jeux d'argent et bien plus, directement depuis Discord, le tout synchronisé en temps réel avec votre compte en jeu.

***

### **Les fonctionnalités disponibles via le Bot**

#### 1. **Jeux d'argent (synchronisés avec votre monnaie en jeu)**

| Commande | Description |
|----------|-------------|
| \`/blackjack <mise>\` | Affrontez la banque dans une partie de blackjack. Tirez, restez ou doublez votre mise. |
| \`/coin-flip <montant>\` | Lancez un défi pile ou face. Un autre joueur doit rejoindre pour jouer. Le gagnant remporte le double. |
| \`/slots <mise>\` | Tentez votre chance aux machines à sous. 3 symboles identiques = gros gain ! |
| \`/roulette <mise> [couleur ou numéro]\` | Pariez sur une couleur (rouge/noir) ou un numéro (0-36). Gain x1 sur couleur, x35 sur numéro. |

> **Note** : Chaque jeu est limité à un **salon Discord spécifique**.

#### 2. **Commandes économiques**

| Commande | Description |
|----------|-------------|
| \`/my money\` | Voir votre solde d'argent en jeu |
| \`/my tokens\` | Voir votre nombre de tokens |
| \`/pay money <joueur> <montant>\` | Envoyer de l'argent à un autre joueur |
| \`/pay tokens <joueur> <montant>\` | Envoyer des tokens à un autre joueur |
| \`/see money <joueur>\` | Consulter l'argent d'un autre joueur |
| \`/see tokens <joueur>\` | Consulter les tokens d'un autre joueur |

#### 3. **Informations et classements**

| Commande | Description |
|----------|-------------|
| \`/top <type>\` | Classement des joueurs (money ou token) avec le top 10 et votre rang |
| \`/user informations [joueur]\` | Informations complètes d'un joueur (Discord + Minecraft : grade, argent, tokens) |
| \`/server information\` | Informations du serveur Discord et statut du serveur Minecraft (joueurs en ligne, version) |
| \`/ip\` | Afficher l'adresse du serveur : \`play.linesia.net:19132\` |
| \`/vote\` | Obtenir le lien de vote (2 clés de vote par vote) |
| \`/shop\` | Lien direct vers la boutique en ligne |
| \`/stats <type>\` | Statistiques du casino (nombre de parties ou argent gagné par jeu) avec graphique |

#### 4. **Système de Tickets**

Le bot gère un système de tickets complet pour contacter le staff :

* **Catégories** : Achats, Report, Remboursement, Administration, Autres
* Chaque catégorie pose des **questions personnalisées** à remplir
* Le staff peut : renommer, fermer (avec raison), envoyer un résumé, rappeler le créateur
* À la fermeture, un **transcript HTML** est envoyé en message privé et dans le salon de logs

***

### **Synchronisation de l'argent entre Discord et Minecraft**

Lorsque vous jouez aux jeux d'argent depuis Discord, vos **gains et pertes sont immédiatement pris en compte** sur votre compte Minecraft. Le scoreboard en jeu peut parfois mettre un moment à s'actualiser ; effectuer un \`/pay\` en jeu force la mise à jour.

***

### **En résumé**

* Le bot est entièrement lié à votre compte Minecraft
* Vous pouvez gérer votre argent et vos tokens, jouer au casino
* Tout est synchronisé en temps réel et sécurisé
* Système de tickets intégré pour contacter le staff

**Rejoignez le Discord** : [discord.gg/linesia](https://discord.gg/linesia)`;
}

// Update Bien débuter (wiki015) - remove dimension references
const bienDebuter = wiki.find((p) => p.id === "wiki015");
if (bienDebuter) {
  // Remove dimension-related lines from the content
  bienDebuter.content = bienDebuter.content
    .replace(
      /\* `\/minage-glace`[^\n]*\n/g,
      ""
    )
    .replace(
      /\* `\/minage-feu`[^\n]*\n/g,
      ""
    );
}

// Remove Zones page (wiki017) references to dimensions if present
const zones = wiki.find((p) => p.id === "wiki017");
if (zones) {
  zones.content = zones.content
    .replace(/Dimension Glace[^\n]*\n?/g, "")
    .replace(/Dimension Feu[^\n]*\n?/g, "");
}

// Sort
wiki.sort((a, b) => {
  if (a.parentId === null && b.parentId !== null) return -1;
  if (a.parentId !== null && b.parentId === null) return 1;
  if (a.parentId === b.parentId) return a.order - b.order;
  return (a.parentId || "").localeCompare(b.parentId || "");
});

// Save JSON
writeFileSync("data/wiki.json", JSON.stringify(wiki, null, 2), "utf8");
console.log(`Wiki JSON saved: ${wiki.length} pages`);

// --- 2. Push to Turso DB ---
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Ensure table exists
await db.execute(`CREATE TABLE IF NOT EXISTS wiki_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
)`);

// Clear existing data
await db.execute("DELETE FROM wiki_pages");
console.log("Cleared existing wiki pages from DB");

// Insert all pages
let inserted = 0;
for (const page of wiki) {
  await db.execute({
    sql: "INSERT INTO wiki_pages (id, slug, title, content, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      page.id,
      page.slug,
      page.title,
      page.content,
      page.icon,
      page.parentId,
      page.order,
    ],
  });
  inserted++;
}

console.log(`Inserted ${inserted} pages into Turso DB`);
console.log("Done!");
