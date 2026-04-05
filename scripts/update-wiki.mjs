import { readFileSync, writeFileSync } from "fs";

const wiki = JSON.parse(readFileSync("data/wiki.json", "utf8"));

// Helper to find and update a page
function updatePage(id, updates) {
  const page = wiki.find((p) => p.id === id);
  if (page) Object.assign(page, updates);
}

// Helper to add a new page
function addPage(page) {
  wiki.push(page);
}

// ============================================================
// 1. UPDATE ACCUEIL (wiki001) - Updated table of contents
// ============================================================
updatePage("wiki001", {
  content: `Bienvenue sur le **wiki officiel du serveur Linesia** ! Celui-ci vous sera utile tout au long de votre progression, et vous permettra une aventure sans accroc.

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
* Dimensions (Glace, Feu)
* Décoration
* Bases de Faction
* Raids de Faction
* Quêtes de Faction
* PvP
* Spawners
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
* Hôtel de Vente (Marketplace)
* Système de Trade
* Cash (Argent physique)
* ATM (Temps de jeu en argent)

### 5. **Personnalisation**

* Cosmétiques (Tags, Capes, Chapeaux, Ailes)

### 6. **Les Commandes**

* Faction
* Téléportation & Warps
* Communication
* Économie en jeu
* Statistiques
* Cooldown
* Classements
* Shop
* Hôtel de Vente
* Profil
* Paramètres
* Utilitaires
* Kits
* Liaison de Compte

### 7. **Bot Discord**

* Liaison de compte
* Casino (Blackjack, Slots, Roulette, Coin Flip)
* Commandes économiques
* Informations & Stats
* Enchères
* Mini-Jeux
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

* Box Commune
* Box Farm
* Box Glace
* Box Feu
* Box Légendaire
* Pocket Box

### 10. **Les Grades**

* Grade Premium
* Grade Elite`,
});

// ============================================================
// 2. UPDATE BOT DISCORD (wiki007) - Fix command names
// ============================================================
updatePage("wiki007", {
  content: `***

## **Le Bot Discord de Linesia — Votre passerelle entre le serveur et Discord**

Le **Bot Discord officiel de Linesia** est une véritable extension du serveur. Il vous permet de gérer votre argent, vos tokens, participer à des jeux d'argent et bien plus, directement depuis Discord, le tout synchronisé en temps réel avec votre compte en jeu.

***

### **Comment lier son compte Minecraft à Discord**

Avant de pouvoir utiliser les commandes, vous devez **lier votre compte Minecraft** à Discord :

1. Sur Discord, tapez la commande :
   \`\`\`
   /link
   \`\`\`
2. Le bot vous fournira un **code unique** à 6 caractères (exemple : \`M4CZ8X\`). Ce code expire après **1 heure**.
3. Connectez-vous sur le serveur Minecraft et entrez :
   \`\`\`
   /link M4CZ8X
   \`\`\`

Une fois cette étape terminée, vos comptes sont liés et vous pouvez utiliser toutes les fonctionnalités du bot. Pour délier votre compte, utilisez \`/unlink\` sur Discord.

***

### **Les fonctionnalités disponibles via le Bot**

#### 1. **Jeux d'argent (synchronisés avec votre monnaie en jeu)**

| Commande | Description |
|----------|-------------|
| \`/blackjack <mise>\` | Affrontez la banque dans une partie de blackjack. Tirez, restez ou doublez votre mise. |
| \`/coin-flip <montant>\` | Lancez un défi pile ou face. Un autre joueur doit rejoindre pour jouer. Le gagnant remporte le double. |
| \`/slots <mise>\` | Tentez votre chance aux machines à sous. 3 symboles identiques = gros gain ! |
| \`/roulette <mise> [couleur ou numéro]\` | Pariez sur une couleur (rouge/noir) ou un numéro (0-36). Gain x1 sur couleur, x35 sur numéro. |

> **Note** : Chaque jeu est limité à un salon Discord spécifique.

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

#### 4. **Enchères**

Le système d'enchères permet aux administrateurs de lancer des enchères auxquelles tous les joueurs liés peuvent participer :

* Chaque enchère a un **ID unique**, une **mise de départ** et une **durée limitée**
* Un bouton **"Enchérir"** permet de placer une offre via un formulaire
* L'enchérisseur précédent est **automatiquement remboursé**
* Des enchères automatiques ont lieu chaque **dimanche**

#### 5. **Mini-Jeux**

Toutes les **2h30**, un mini-jeu apparaît automatiquement dans le salon dédié :

* **Calcul mathématique** : Résolvez une opération (addition, soustraction, multiplication, division)
* **Mot mélangé** : Retrouvez le mot original à partir de lettres mélangées
* **Nombre mystère** : Devinez un nombre dans une fourchette donnée

**Récompense** : entre **100 et 500** 🪙 crédités directement sur votre compte en jeu.

#### 6. **Système de Tickets**

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
* Vous pouvez gérer votre argent et vos tokens, jouer au casino, participer aux enchères et aux mini-jeux
* Tout est synchronisé en temps réel et sécurisé
* Système de tickets intégré pour contacter le staff

**Rejoignez le Discord** : [discord.gg/linesia](https://discord.gg/linesia)`,
});

// ============================================================
// 3. UPDATE "Les Commandes" description (wiki097)
// ============================================================
updatePage("wiki097", {
  content: `Retrouvez ici **toutes les commandes disponibles** sur Linesia, organisées par catégorie : faction, téléportation, communication, économie, statistiques, shop, hôtel de vente, profil, paramètres, utilitaires, kits et bien plus.

Chaque page détaille la syntaxe, les options et le fonctionnement de chaque commande.`,
});

// ============================================================
// 4. UPDATE Argent en jeu (wiki094) - Fix command names
// ============================================================
updatePage("wiki094", {
  content: `***

## **Système Économique sur Linesia**

Sur Linesia, l'économie est un **élément central du gameplay**. Chaque joueur peut **gagner, gérer et dépenser de l'argent ($)** pour progresser et devenir l'un des plus riches du serveur.

***

### 1. **Consulter son argent**

Pour connaître votre solde, utilisez l'une de ces commandes :

\`\`\`
/money
/my-money
/mymoney
\`\`\`

Ces commandes affichent le **montant total d'argent ($)** que vous possédez.

***

### 2. **Voir le solde d'un autre joueur**

\`\`\`
/see-money <pseudo>
/seemoney <pseudo>
\`\`\`

Utile pour comparer vos richesses, planifier des échanges ou vérifier la compétitivité d'un rival.

***

### 3. **Envoyer de l'argent à un joueur**

\`\`\`
/pay <pseudo> <montant>
\`\`\`

**Exemple** : \`/pay Wyze3306 5000\` donne **5000$** au joueur Wyze3306. Le transfert est instantané.

> Vous ne pouvez pas vous envoyer de l'argent à vous-même. Le montant doit être supérieur à 0 et vous devez avoir les fonds suffisants.

***

### 4. **Convertir son argent en objet physique**

La commande \`/cash <montant>\` permet de transformer votre argent en un **objet physique** échangeable. Montant entre 100$ et 1 000 000$. L'objet créé possède un identifiant unique pour éviter les duplications.

***

### 5. **Convertir son temps de jeu en argent (ATM)**

La commande \`/atm\` convertit votre temps de jeu accumulé en argent, au taux de **500$ par heure**. Un minimum d'1 heure de jeu est requis. Le compteur de temps est remis à zéro après chaque conversion.

***

### 6. **Jeux d'argent sur Discord**

Vous pouvez également utiliser votre fortune via Discord grâce aux jeux d'argent du bot officiel de Linesia :

| Jeu | Commande Discord |
|-----|-----------------|
| Blackjack | \`/blackjack <mise>\` |
| Machine à sous | \`/slots <mise>\` |
| Coin Flip | \`/coin-flip <montant>\` |
| Roulette | \`/roulette <mise>\` |

***

### 7. **Affichage de l'argent en jeu**

* Votre solde est affiché sur le **scoreboard** à droite de l'écran
* Personnalisez l'affichage avec \`/settings\`
* Choisissez entre le scoreboard Défaut, Farm ou PvP

***

### 8. **Classement et récompenses**

* Un **cashprize réel** sera attribué à la fin de la version au meilleur joueur
* Suivez le classement des plus riches avec :

\`\`\`
/top money
\`\`\`

***

### 9. **Les taxes**

Certaines transactions sont soumises à des taxes :

| Action | Joueur Normal | Premium | Elite |
|--------|--------------|---------|-------|
| Vente à l'HDV | 5% | 3% | 1% |
| Nombre de ventes HDV simultanées | 3 | 10 | 15 |

***

### 10. **Résumé des commandes économiques**

| Commande | Description |
|----------|-------------|
| \`/money\` | Voir son solde |
| \`/see-money <pseudo>\` | Voir le solde d'un joueur |
| \`/pay <pseudo> <montant>\` | Envoyer de l'argent |
| \`/cash <montant>\` | Convertir en argent physique |
| \`/atm\` | Convertir son temps de jeu en argent |
| \`/top money\` | Classement des plus riches |`,
});

// ============================================================
// 5. UPDATE Classements (wiki101) - Add all categories
// ============================================================
updatePage("wiki101", {
  content: `***

## **Commande \`/top\` – Classements complets de Linesia**

La commande \`/top\` vous permet de **découvrir les meilleurs joueurs** du serveur dans plus de **40 catégories**. Comparez vos performances et grimpez dans les classements !

***

### 1. **Statistiques générales**

| Commande | Description |
|----------|-------------|
| \`/top money\` | Classement des joueurs les plus riches |
| \`/top gains\` | Classement par gains totaux |
| \`/top kill\` | Classement par nombre de kills PvP |
| \`/top death\` | Classement par nombre de morts |
| \`/top kdr\` | Classement par ratio Kill/Death |
| \`/top killstreak\` | Plus longues séries de kills sans mourir |
| \`/top power\` | Classement par puissance (Power) |
| \`/top prestige\` | Classement par niveau de prestige |
| \`/top time\` | Classement par temps de jeu total |
| \`/top message\` | Classement par nombre de messages envoyés |
| \`/top join\` | Classement par nombre de connexions |
| \`/top vote\` | Classement par nombre de votes |
| \`/top walk\` | Classement par blocs parcourus |
| \`/top mine\` | Classement par blocs minés |
| \`/top place\` | Classement par blocs posés |
| \`/top prime\` | Classement par prime la plus élevée |
| \`/top token\` | Classement par tokens |

***

### 2. **Classements par métiers (Jobs)**

| Commande | Description |
|----------|-------------|
| \`/top pecheur\` | Meilleurs pêcheurs |
| \`/top enchanteur\` | Meilleurs enchanteurs |
| \`/top reparateur\` | Meilleurs réparateurs |
| \`/top farmeur\` | Meilleurs agriculteurs |
| \`/top mineur\` | Meilleurs mineurs |
| \`/top guerrier\` | Meilleurs combattants |

***

### 3. **Classements par culture**

| Commande | Description |
|----------|-------------|
| \`/top ble\` | Blé récolté |
| \`/top betterave\` | Betteraves récoltées |
| \`/top patate\` | Patates récoltées |
| \`/top carotte\` | Carottes récoltées |
| \`/top citrouille\` | Citrouilles récoltées |
| \`/top melon\` | Melons récoltés |

***

### 4. **Classements par mob tué**

| Commande | Description |
|----------|-------------|
| \`/top zombie\` | Zombies tués |
| \`/top pigmen\` | Pigmen tués |
| \`/top wither\` | Wither Squelettes tués |

***

### 5. **Classements de faction**

| Commande | Description |
|----------|-------------|
| \`/top faction_power\` | Factions avec le plus de puissance |
| \`/top faction_quest\` | Factions avec le plus de quêtes complétées |

***

### 6. **Utilisation**

* Chaque classement affiche le **top 10** des joueurs
* Votre propre **rang** est affiché en bas du classement
* Les joueurs liés à Discord affichent leur **mention Discord** à côté de leur pseudo`,
});

// ============================================================
// 6. UPDATE HDV (wiki103) - Add market sell details
// ============================================================
updatePage("wiki103", {
  content: `***

## **L'Hôtel des Ventes (HDV) sur Linesia – Achetez et vendez en toute sécurité**

L'Hôtel des Ventes (HDV), aussi appelé **Marketplace**, est l'outil central pour les transactions entre joueurs sur Linesia. Il permet d'acheter et de vendre des objets facilement, de manière sécurisée, sans négociation directe.

***

### 1. **Accéder au Marketplace**

Utilisez l'une de ces commandes :

\`\`\`
/market
/ah
/hdv
\`\`\`

Une interface s'ouvre, listant tous les objets actuellement en vente par les autres joueurs.

***

### 2. **Vendre un objet**

Pour vendre un objet, vous devez l'avoir **dans votre main** :

\`\`\`
/market sell
/ah sell
/hdv sell
\`\`\`

Un formulaire s'ouvre vous demandant :

* **Prix de vente** : entre 100$ et 999 999 999$
* **Promotion en chat** : promotion de votre objet dans le chat public pour 100$ (optionnel)
* **Promotion au marketplace** : mise en avant de votre objet dans le HDV pour 500$ (optionnel)

***

### 3. **Taxes et limitations**

| Grade | Taxe de vente | Objets simultanés max |
|-------|--------------|----------------------|
| Joueur normal | 5% | 3 |
| Premium | 3% | 10 |
| Elite | 1% | 15 |

* Les objets mis en vente expirent après **2 jours** s'ils ne sont pas vendus
* La taxe est prélevée automatiquement sur le prix de vente

***

### 4. **Acheter un objet**

* Parcourez les objets listés dans l'interface du marketplace
* Cliquez sur l'objet souhaité pour l'acheter
* Le montant est déduit de votre solde et l'objet ajouté à votre inventaire

***

### 5. **Avantages du HDV**

* **Sécurité** : transactions automatiques sans risque de fraude
* **Visibilité** : vos objets sont visibles par tous les joueurs connectés
* **Facilité** : plus besoin de courir après les acheteurs
* **Optimisation** : les grades offrent plus de listings et moins de taxes

***

### 6. **Conseils**

* Vérifiez les prix du marché avant de poster pour éviter de sous-évaluer vos objets
* Profitez des promotions pour vendre plus vite
* Utilisez les avantages de votre grade pour maximiser vos profits
* Gardez un œil sur les objets rares à bon prix`,
});

// ============================================================
// 7. UPDATE Profil (wiki104) - Add description feature
// ============================================================
updatePage("wiki104", {
  content: `## Commande \`/profil\`

La commande **\`/profil\`** (aliases : \`/profile\`) permet d'ouvrir une interface utilisateur complète. Elle sert de centre principal pour consulter et gérer toutes les informations liées à votre joueur.

Vous pouvez consulter le profil d'un autre joueur en ajoutant son pseudo : \`/profil <pseudo>\`.

***

### Informations affichées

L'interface \`/profil\` regroupe toutes les informations personnelles du joueur :

* **Argent** ($) : Votre solde actuel
* **Niveau de prestige** : Votre progression dans les prestiges
* **Power** : Votre puissance accumulée (kills, dominations, outpost)
* **Grade** : Votre grade actuel (Joueur, Premium, Elite)
* **Prime** : La prime sur votre tête (si applicable)
* **Faction** : Votre faction actuelle

***

### Statistiques

La section statistiques affiche vos données de jeu :

* Kills et morts
* KillStreak record
* Blocs cassés et posés
* Messages envoyés
* Connexions totales
* Temps de jeu
* Blocs parcourus

***

### Prestiges

L'onglet prestiges affiche :

* Le niveau de prestige actuel
* L'avancement dans les différents paliers
* Les déblocages associés à la progression
* Les quêtes achevées et restantes

***

### Description personnalisée

Chaque joueur peut définir une description de profil visible par les autres joueurs grâce à la commande :

\`\`\`
/description
\`\`\`

Un formulaire s'ouvre pour saisir votre description (entre 3 et 20 caractères alphanumériques). Elle sera affichée sur votre profil.

***

### Cosmétiques

Depuis le profil, vous pouvez accéder à la gestion de vos cosmétiques (tags, capes, chapeaux, ailes).

***

### Résumé

La commande **\`/profil\`** propose une interface claire et complète pour :

* Consulter vos statistiques et celles des autres joueurs
* Gérer vos cosmétiques
* Suivre votre progression (prestiges, power, faction)
* Personnaliser votre description`,
});

// ============================================================
// 8. FIX Warzone (wiki106) - More details
// ============================================================
updatePage("wiki106", {
  content: `## Commande \`/warzone\`

La commande **\`/warzone\`** (alias : \`/pvp\`) permet aux joueurs de se téléporter directement dans la **Warzone** du serveur.

***

### Fonctionnement de la Warzone

La Warzone est la zone centrale de la map, dédiée au combat :

* **PvP activé** : tous les joueurs peuvent s'affronter
* **Aucune protection de claim** : pas de zone sécurisée
* **Risque de perte** : vous pouvez perdre votre stuff en mourant
* **Événements** : l'Outpost se trouve au centre de la Warzone

***

### Zones accessibles depuis la Warzone

* **Mine PvP** : accessible via \`/minepvp\`, zone de minage avec PvP activé
* **Outpost** : zone de capture au centre
* **Avant-postes (APS)** : accès via \`/aps\` pour les 4 points cardinaux

***

### Commandes liées

| Commande | Description |
|----------|-------------|
| \`/warzone\` ou \`/pvp\` | Se téléporter à la Warzone |
| \`/minepvp\` | Se téléporter à la mine PvP en Warzone |
| \`/aps\` | Choisir un avant-poste (Nord, Sud, Est, Ouest) |

***

### Conseils

* Préparez-vous avant d'y entrer : équipement complet, healing, sticks
* Surveillez votre environnement et les joueurs à proximité
* Utilisez \`/tl\` pour appeler votre faction en renfort
* Gardez des Ender Pearls pour fuir si nécessaire`,
});

// ============================================================
// 9. ADD: Téléportation & Warps (wiki126)
// ============================================================
addPage({
  id: "wiki126",
  slug: "teleportation-warps",
  title: "Teleportation & Warps",
  content: `***

## **Commandes de Téléportation & Warps sur Linesia**

Linesia propose un système complet de téléportation pour se déplacer rapidement entre les différentes zones du serveur.

***

### 1. **Téléportation entre joueurs**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/tpa <joueur>\` | \`/call\` | Demander à se téléporter vers un joueur |
| \`/tpahere <joueur>\` | \`/tphere\` | Demander à un joueur de venir à vous |
| \`/tpaaccept\` | \`/tpaccept\`, \`/tpyes\` | Accepter une demande de téléportation |

**Restrictions** :
* Vous ne pouvez pas envoyer de demande si vous êtes en combat
* Le joueur cible peut bloquer les demandes via \`/settings\`
* Un délai de **30 secondes** entre chaque demande au même joueur

***

### 2. **Warps - Zones principales**

| Commande | Aliases | Destination |
|----------|---------|-------------|
| \`/spawn\` | \`/hub\` | Spawn principal du serveur |
| \`/warzone\` | \`/pvp\` | Zone Warzone (PvP activé) |
| \`/mine\` | \`/minage\` | Zone de minage principale |
| \`/farm\` | \`/farming\` | Zone de farming |
| \`/fish\` | \`/fishing\` | Zone de pêche |
| \`/combat\` | \`/mobs\`, \`/forest\` | Zone de combat (mobs) |
| \`/afk\` | — | Zone AFK Money (gain passif, PvP activé) |
| \`/minepvp\` | — | Mine PvP en Warzone |

***

### 3. **Warps - Événements**

| Commande | Description |
|----------|-------------|
| \`/outpost\` | Téléportation à l'Outpost |
| \`/domination\` | Téléportation à l'événement Domination |
| \`/nexus\` | Téléportation au Nexus Boss |
| \`/totem\` | Téléportation à l'Event Totem |
| \`/event\` (alias : \`/events\`) | Ouvre le menu des événements |

***

### 4. **Warps - Navigation**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/aps\` | \`/avant-post\`, \`/ap\`, \`/nord\`, \`/sud\`, \`/est\`, \`/ouest\` | Choisir un avant-poste (formulaire avec Nord, Sud, Est, Ouest) |
| \`/lobby\` | — | Retour au lobby principal (\`play.linesia.net\`) |
| \`/kitffa\` | — | Transfert vers le serveur KitFFA (\`kitffa.linesia.net\`) |

***

### 5. **Warps - Spéciaux**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/deco\` | \`/decoration\`, \`/blocks\`, \`/bois\`, \`/build\` | Gestion des blocs de décoration |
| \`/tuto\` | \`/wiki\` | Téléportation au monde tutoriel |
| \`/nexus\` | — | Téléportation à la zone Nexus |

***

### 6. **Faction**

| Commande | Description |
|----------|-------------|
| \`/f home\` | Téléportation au home de votre faction |
| \`/f sethome\` | Définir le home de faction |

***

### Conseils

* Utilisez \`/aps\` pour trouver rapidement un endroit pour poser votre base aux extrémités de la map
* Les téléportations sont annulées si vous êtes en combat
* Certaines zones comme la Warzone et l'AFK ont le PvP activé — soyez préparé`,
  icon: "🌍",
  parentId: "wiki097",
  order: 10,
});

// ============================================================
// 10. ADD: Communication (wiki127)
// ============================================================
addPage({
  id: "wiki127",
  slug: "communication",
  title: "Communication",
  content: `***

## **Commandes de Communication sur Linesia**

Linesia propose un système de messagerie complet pour communiquer avec les autres joueurs.

***

### 1. **Messages privés**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/msg <joueur> <message>\` | \`/message\`, \`/pm\`, \`/w\`, \`/mp\`, \`/whisper\` | Envoyer un message privé à un joueur |
| \`/reply <message>\` | \`/r\` | Répondre au dernier message privé reçu |

**Restrictions** :
* Vous ne pouvez pas envoyer de message si vous êtes **muté**
* Le destinataire peut désactiver la réception de messages privés via \`/settings\`
* Le destinataire peut vous **ignorer** individuellement (voir ci-dessous)
* Les messages sont visibles par le staff ayant activé le **Social Spy**

***

### 2. **Blocage de joueurs**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/pmute <joueur>\` | \`/ignore\` | Bloquer/Débloquer les messages d'un joueur spécifique |

Cette commande fonctionne comme un **toggle** : utilisez-la une fois pour bloquer, une seconde fois pour débloquer.

***

### 3. **Communication de faction**

| Commande | Description |
|----------|-------------|
| \`/tl\` | Appel à l'aide faction — envoie votre position à tous les membres de votre faction en ligne |
| \`/al\` | Appel à l'aide alliance — envoie votre position à tous les membres des factions alliées |

Ces commandes sont essentielles en PvP pour coordonner vos actions :
* Le message inclut automatiquement vos **coordonnées**
* Tous les membres en ligne de votre faction (ou alliance) sont notifiés

***

### 4. **Staff en ligne**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/onlinestaff\` | \`/staffco\` | Afficher la liste des membres du staff actuellement en ligne |

> Les membres du staff en mode **vanish** ne sont pas affichés.

***

### 5. **Paramètres de messagerie**

Via \`/settings\`, vous pouvez :

* **Désactiver les messages privés** : empêche la réception de tous les MP
* **Changer la langue** : les messages système seront dans la langue choisie (FR, EN, ES)`,
  icon: "💬",
  parentId: "wiki097",
  order: 11,
});

// ============================================================
// 11. ADD: Utilitaires (wiki128)
// ============================================================
addPage({
  id: "wiki128",
  slug: "utilitaires",
  title: "Utilitaires",
  content: `***

## **Commandes Utilitaires sur Linesia**

Ces commandes pratiques vous aident au quotidien sur le serveur.

***

### 1. **Informations**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/ping [joueur]\` | — | Afficher votre ping (latence en ms) ou celui d'un autre joueur |
| \`/onlinestaff\` | \`/staffco\` | Lister les membres du staff en ligne |
| \`/cooldowns\` | \`/cooldown\`, \`/stickcooldowns\`, \`/stickcd\`, \`/cd\` | Voir les cooldowns de tous vos items spéciaux |

***

### 2. **Inventaire et items**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/trash\` | \`/poubelle\`, \`/bin\` | Ouvrir une poubelle pour jeter des items |
| \`/refill\` | — | Remplir votre inventaire avec : 64 Healing Hearts, 6 Pommes d'Or, 16 Ender Pearls |
| \`/cash <montant>\` | — | Convertir de l'argent en objet physique (100$ - 1 000 000$) |

> \`/refill\` ne fait qu'ajouter des items jusqu'au maximum, sans dépasser les limites de stack.

***

### 3. **Effets et apparence**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/nightvision\` | \`/nv\`, \`/vision\` | Activer/désactiver la vision nocturne permanente |
| \`/description\` | — | Définir une description sur votre profil (3-20 caractères) |

***

### 4. **Navigation et menus**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/menu\` | — | Ouvrir le menu principal du serveur |
| \`/event\` | \`/events\` | Ouvrir le menu des événements |
| \`/settings\` | — | Ouvrir les paramètres joueur |
| \`/shop\` | — | Ouvrir la boutique |
| \`/casino\` | \`/blackjack\`, \`/coinflip\`, \`/roulette\` | Ouvrir le menu du casino en jeu |
| \`/tuto\` | \`/wiki\` | Se téléporter au monde tutoriel |

***

### 5. **Économie**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/money\` | \`/my-money\`, \`/mymoney\` | Voir votre solde |
| \`/see-money <joueur>\` | \`/seemoney\` | Voir le solde d'un joueur |
| \`/pay <joueur> <montant>\` | — | Envoyer de l'argent à un joueur |
| \`/atm\` | — | Convertir votre temps de jeu en argent (500$/heure, minimum 1h) |
| \`/vote\` | — | Réclamer vos récompenses de vote |

***

### 6. **Temps de jeu et prestige**

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/prestige\` | \`/prestiges\` | Ouvrir l'interface de prestige |
| \`/profil [joueur]\` | \`/profile\` | Ouvrir le profil complet d'un joueur |
| \`/stats [joueur]\` | \`/statistics\` | Voir les statistiques détaillées |

***

### 7. **Tutorial**

| Commande | Description |
|----------|-------------|
| \`/tuto\` ou \`/wiki\` | Se téléporter au monde tutoriel |
| \`/bypasstuto\` | Passer/réinitialiser la progression du tutoriel |`,
  icon: "🎮",
  parentId: "wiki097",
  order: 12,
});

// ============================================================
// 12. ADD: Liaison de Compte in-game (wiki129)
// ============================================================
addPage({
  id: "wiki129",
  slug: "liaison-compte",
  title: "Liaison de Compte",
  content: `***

## **Commandes de Liaison de Compte**

Ces commandes permettent de lier votre compte Minecraft à Discord pour accéder aux fonctionnalités du bot Discord.

***

### 1. **Lier son compte**

**Étape 1 — Sur Discord :**
\`\`\`
/link
\`\`\`
Le bot génère un **code unique à 6 caractères** (ex : \`M4CZ8X\`), valable **1 heure**.

**Étape 2 — En jeu :**
\`\`\`
/link <code>
\`\`\`
Entrez le code reçu sur Discord. Une confirmation s'affiche des deux côtés.

***

### 2. **Délier son compte**

En jeu :
\`\`\`
/unlink
\`\`\`

Ou sur Discord :
\`\`\`
/unlink
\`\`\`

Cela supprime la liaison entre votre compte Minecraft et Discord.

***

### 3. **Lien Discord**

\`\`\`
/discord
\`\`\`

Affiche le lien d'invitation vers le serveur Discord de Linesia.

***

### Pourquoi lier son compte ?

La liaison de compte est **nécessaire** pour :

* Utiliser les **jeux d'argent** sur Discord (Blackjack, Slots, Roulette, Coin Flip)
* Gérer votre **argent et tokens** depuis Discord
* Participer aux **enchères** Discord
* Voir vos informations via \`/user\` sur Discord
* Apparaître dans les **classements** Discord avec votre mention`,
  icon: "🔗",
  parentId: "wiki097",
  order: 13,
});

// ============================================================
// 13. ADD: Kits (wiki130)
// ============================================================
addPage({
  id: "wiki130",
  slug: "kits",
  title: "Kits",
  content: `***

## **Système de Kits sur Linesia**

Les kits sont des ensembles d'équipements que vous pouvez récupérer régulièrement pour vous équiper.

***

### 1. **Voir et récupérer un kit**

\`\`\`
/kit
\`\`\`

Ouvre l'interface de sélection des kits. Chaque kit a un **cooldown** après récupération.

***

### 2. **Sauvegarder la disposition de son kit**

\`\`\`
/stuff
\`\`\`

Sauvegarde la **disposition actuelle de votre inventaire** comme disposition par défaut pour vos kits. Quand vous récupérez un kit, les items seront placés aux mêmes emplacements.

\`\`\`
/stuff reset
\`\`\`

Réinitialise la disposition sauvegardée.

***

### 3. **Kits disponibles**

#### Kit de base
* Disponible pour tous les joueurs
* Contient l'équipement de départ

#### Kit Premium (Grade Premium requis)
* **Cooldown** : 10 minutes
* **Contenu** :
  * Armure complète en Améthyste (Protection 3)
  * Épée en Améthyste (Tranchant 5)
  * 64 Healing Hearts
  * 6 Pommes d'Or
  * 16 Ender Pearls

#### Kit Elite (Grade Elite requis)
* **Cooldown** : 10 minutes
* **Contenu** :
  * Armure complète en Améthyste (Protection 4)
  * Épée en Rubis (Tranchant 5)
  * 64 Healing Hearts
  * 6 Pommes d'Or
  * 16 Ender Pearls

***

### 4. **Reclaim quotidien**

Les joueurs gradés ont accès à un reclaim récupérable **une fois par jour** :

| Grade | Contenu du Reclaim |
|-------|-------------------|
| Premium | 1 clé Farm + 2 clés Commune |
| Elite | 1 Pocket Box + 2 clés Farm + 3 clés Commune |

**Commandes** : \`/kit reclaim_premium\` ou \`/kit reclaim_elite\`

***

### 5. **Administration des kits**

\`\`\`
/setkit
\`\`\`

Commande réservée aux administrateurs pour modifier le contenu des kits.`,
  icon: "🛡️",
  parentId: "wiki097",
  order: 14,
});

// ============================================================
// 14. ADD: Métiers / Jobs (wiki131)
// ============================================================
addPage({
  id: "wiki131",
  slug: "metiers",
  title: "Metiers (Jobs)",
  content: `***

## **Système de Métiers sur Linesia**

Les métiers (Jobs) sont un système de progression parallèle qui récompense vos activités sur le serveur. Chaque action liée à un métier vous fait gagner de l'expérience et augmente votre niveau.

***

### 1. **Accéder aux métiers**

\`\`\`
/jobs
\`\`\`

Aliases : \`/job\`, \`/metier\`

Ouvre l'interface des métiers affichant votre progression dans chaque spécialité.

***

### 2. **Les 4 métiers**

#### ⛏️ **Mineur**
* Gagnez de l'XP en **minant des blocs** dans les zones de minage
* Plus le minerai est rare, plus l'XP est élevée
* Minerais : Pierre, Fer, Or, Diamant, Améthyste, Rubis, Onyx

#### 🌾 **Farmeur**
* Gagnez de l'XP en **récoltant des cultures**
* Cultures : Blé, Betterave, Patate, Carotte, Citrouille, Melon, Onyx
* Les plantations de la zone Farm repoussent automatiquement

#### 🎣 **Pêcheur**
* Gagnez de l'XP en **pêchant des poissons** dans la zone de pêche
* Poissons : Saumon, Morue, Poisson tropical, Poisson globe

#### ⚔️ **Guerrier**
* Gagnez de l'XP en **tuant des joueurs** et des **mobs**
* Kills PvP, mobs de la zone Combat, Spawners

***

### 3. **Progression et niveaux**

* Chaque métier a son propre niveau et sa barre d'XP
* Suivez votre progression via le **Scoreboard Farm** (\`/settings\`)
* Le scoreboard Farm affiche le niveau et le % de progression de chaque métier

***

### 4. **Classements**

Consultez les meilleurs joueurs par métier :

\`\`\`
/jobs top <metier>
\`\`\`

Ou via le classement général :

| Commande | Description |
|----------|-------------|
| \`/top mineur\` | Meilleurs mineurs |
| \`/top farmeur\` | Meilleurs agriculteurs |
| \`/top pecheur\` | Meilleurs pêcheurs |
| \`/top guerrier\` | Meilleurs combattants |

***

### 5. **Bouteille de Double XP**

Les administrateurs peuvent créer des bouteilles de **double XP** pour un métier spécifique :

\`\`\`
/jobs bottle <joueur> <metier> <duree_minutes> <quantite>
\`\`\`

Ces bouteilles doublent temporairement l'XP gagnée dans le métier ciblé.`,
  icon: "💼",
  parentId: "wiki014",
  order: 15,
});

// ============================================================
// 15. ADD: Primes / Bounty (wiki132)
// ============================================================
addPage({
  id: "wiki132",
  slug: "primes",
  title: "Primes (Bounty)",
  content: `***

## **Système de Primes sur Linesia**

Le système de primes permet aux joueurs de **placer des récompenses sur la tête d'autres joueurs**. Le joueur qui tue la cible remporte la prime !

***

### 1. **Consulter les primes actives**

\`\`\`
/prime [page]
\`\`\`

Affiche le **top 10 des primes actives**, classées par montant décroissant. Utilisez le numéro de page pour voir les suivantes. Votre propre prime est affichée en bas de la liste.

***

### 2. **Placer une prime**

\`\`\`
/addprime <joueur> <montant>
\`\`\`

* Le **montant** est déduit de votre solde
* Seuls les montants **positifs** sont acceptés
* Les primes s'**accumulent** : si plusieurs joueurs mettent une prime sur le même joueur, les montants s'additionnent

***

### 3. **Réclamer une prime**

Lorsque vous **tuez un joueur** qui a une prime sur sa tête :
* Le montant de la prime est **automatiquement crédité** sur votre compte
* La prime est retirée de la liste

***

### 4. **Classement**

\`\`\`
/top prime
\`\`\`

Affiche le classement des joueurs ayant les plus grosses primes sur leur tête.

***

### 5. **Stratégie**

* Placez des primes sur les joueurs ennemis pour encourager d'autres factions à les cibler
* Surveillez les primes élevées — ce sont des opportunités de gain facile
* Consultez \`/prime\` régulièrement pour repérer les cibles les plus lucratives
* Une prime élevée fait de vous une cible — soyez vigilant !`,
  icon: "🎯",
  parentId: "wiki014",
  order: 16,
});

// ============================================================
// 16. ADD: Trade (wiki133)
// ============================================================
addPage({
  id: "wiki133",
  slug: "trade",
  title: "Trade",
  content: `***

## **Système de Trade sur Linesia**

Le trade permet d'**échanger des items** directement avec un autre joueur, de manière sécurisée via une interface dédiée.

***

### 1. **Lancer un trade**

\`\`\`
/trade <joueur>
\`\`\`

Envoie une demande d'échange au joueur ciblé. Un délai de **30 secondes** est requis entre chaque nouvelle demande au même joueur.

***

### 2. **Interface d'échange**

Lorsque le trade est accepté, une **double chest** s'ouvre :

* **Côté gauche** : vos items à échanger
* **Côté droit** : les items proposés par l'autre joueur
* **Confirmation** : les deux joueurs doivent confirmer pour valider l'échange

***

### 3. **Sécurité**

* L'échange n'est finalisé que lorsque les **deux joueurs confirment**
* Les items sont transférés **instantanément** à la confirmation
* Aucun risque d'arnaque : l'interface est contrôlée par le serveur

***

### 4. **Trade de cosmétiques**

Pour échanger des cosmétiques spécifiquement :

\`\`\`
/tradecosmetic <joueur>
\`\`\`

Alias : \`/tradecosm\`

* Un formulaire s'ouvre pour **sélectionner les cosmétiques** à échanger
* Vérification de la **propriété** avant finalisation
* Les deux joueurs doivent confirmer
* Le transfert est **immédiat et irréversible**`,
  icon: "💱",
  parentId: "wiki093",
  order: 1,
});

// ============================================================
// 17. ADD: Cash (wiki134)
// ============================================================
addPage({
  id: "wiki134",
  slug: "cash",
  title: "Cash (Argent Physique)",
  content: `***

## **Système de Cash sur Linesia**

Le cash permet de **convertir votre argent virtuel en un objet physique** que vous pouvez stocker, échanger ou donner.

***

### Commande

\`\`\`
/cash <montant>
\`\`\`

* **Montant minimum** : 100$
* **Montant maximum** : 1 000 000$
* Le montant est déduit de votre solde

***

### Fonctionnement

1. Tapez \`/cash <montant>\` avec le montant souhaité
2. Un **item physique** est créé dans votre inventaire
3. L'item affiche le montant et possède un **identifiant unique** (anti-duplication)
4. Vous pouvez stocker cet item dans un coffre ou le donner à un autre joueur

***

### Utilisation

Le cash physique est utile pour :

* **Stocker de l'argent** dans un coffre sécurisé
* **Échanger de l'argent** via le système de trade (\`/trade\`)
* **Sécuriser ses fonds** : même si votre solde est à 0, vos billets dans un coffre sont en sécurité

***

### Sécurité anti-duplication

Chaque billet de cash possède un **identifiant unique (UID)**. Le serveur vérifie cet identifiant pour empêcher toute tentative de duplication.`,
  icon: "💴",
  parentId: "wiki093",
  order: 2,
});

// ============================================================
// 18. ADD: ATM (wiki135)
// ============================================================
addPage({
  id: "wiki135",
  slug: "atm",
  title: "ATM (Temps de Jeu)",
  content: `***

## **Système ATM sur Linesia**

L'ATM permet de **convertir votre temps de jeu en argent**. Plus vous jouez, plus vous gagnez !

***

### Commande

\`\`\`
/atm
\`\`\`

***

### Fonctionnement

* **Taux de conversion** : 500$ par heure de jeu
* **Minimum requis** : 1 heure de temps de jeu accumulé
* Après conversion, le **compteur de temps est remis à zéro**

***

### Exemple

Si vous avez joué 5 heures depuis votre dernière conversion :

\`\`\`
/atm
→ Vous recevez 2 500$ (5h × 500$/h)
→ Votre compteur de temps est remis à 0
\`\`\`

***

### Conseils

* Accumulez du temps de jeu avant de convertir pour maximiser vos gains
* Combinez l'ATM avec la zone **AFK Money** (\`/afk\`) pour gagner de l'argent passivement
* Le temps de jeu compte même si vous êtes AFK — profitez-en !`,
  icon: "🏧",
  parentId: "wiki093",
  order: 3,
});

// ============================================================
// 19. ADD: Bot Discord - Section Root (wiki136)
// ============================================================
addPage({
  id: "wiki136",
  slug: "bot-discord",
  title: "Bot Discord",
  content: `Le Bot Discord officiel de Linesia est une extension complete du serveur. Il vous permet de jouer au casino, gerer votre economie, participer aux encheres, et bien plus, directement depuis Discord.

Toutes les fonctionnalites sont synchronisees en temps reel avec votre compte Minecraft.

**Prérequis** : Vous devez lier votre compte Minecraft à Discord pour utiliser la plupart des fonctionnalités. Consultez la page "Liaison de Compte" pour plus d'informations.`,
  icon: "🤖",
  parentId: null,
  order: 10,
});

// ============================================================
// 20. ADD: Bot Discord - Casino (wiki137)
// ============================================================
addPage({
  id: "wiki137",
  slug: "casino-discord",
  title: "Casino Discord",
  content: `Le casino Discord de Linesia propose **4 jeux d'argent** directement depuis Discord. Vos gains et pertes sont synchronisés en temps réel avec votre solde Minecraft.

**Prérequis** : Compte lié (voir \`/link\`) et fonds suffisants.

> Chaque jeu est limité à un **salon Discord spécifique**.`,
  icon: "🎰",
  parentId: "wiki136",
  order: 0,
});

// ============================================================
// 21. ADD: Blackjack (wiki138)
// ============================================================
addPage({
  id: "wiki138",
  slug: "blackjack",
  title: "Blackjack",
  content: `***

## **Blackjack – Casino Discord**

Le Blackjack est un jeu de cartes classique où vous affrontez la banque.

***

### Commande

\`\`\`
/blackjack <mise>
\`\`\`

***

### Règles du jeu

1. Vous et le bot recevez chacun **2 cartes**
2. L'objectif est de se rapprocher de **21 sans le dépasser**
3. Valeurs des cartes :
   * **2-10** : valeur nominale
   * **Valet, Dame, Roi** : 10
   * **As** : 11 (réduit à 1 si le total dépasse 21)

***

### Actions disponibles

| Bouton | Action |
|--------|--------|
| **Tirer** | Piocher une carte supplémentaire |
| **Rester** | Garder votre main actuelle |
| **Doubler** | Doubler votre mise et piocher une dernière carte (nécessite des fonds suffisants) |

***

### Résultats et gains

| Résultat | Gain |
|----------|------|
| **Victoire** | 2x votre mise |
| **Égalité** | Mise remboursée |
| **Défaite** | Mise perdue |
| **Blackjack (21 naturel)** | 2x votre mise |

***

### Règles spéciales

* Si vous dépassez 21 (**bust**), vous perdez immédiatement
* Si le bot dépasse 21, vous gagnez automatiquement
* Le bot tire jusqu'à atteindre au moins 17
* Une seule partie à la fois par joueur`,
  icon: "♠️",
  parentId: "wiki137",
  order: 0,
});

// ============================================================
// 22. ADD: Slots (wiki139)
// ============================================================
addPage({
  id: "wiki139",
  slug: "slots-discord",
  title: "Machine a Sous",
  content: `***

## **Machine à Sous – Casino Discord**

Les machines à sous offrent des gains rapides basés sur la chance.

***

### Commande

\`\`\`
/slots <mise>
\`\`\`

Mise minimum : 1$

***

### Fonctionnement

La machine affiche une grille de **3x3 symboles**. La **ligne du milieu** détermine le résultat :

\`\`\`
┌─────────────────┐
│  🍎  🍋  🍇     │  ← Ligne du haut
│  🍒  🍒  🍒     │  ← LIGNE GAGNANTE
│  🍊  🍇  🍋     │  ← Ligne du bas
└─────────────────┘
\`\`\`

***

### Résultats et gains

| Résultat | Probabilité | Gain |
|----------|-------------|------|
| **3 symboles identiques** | 3% | 4x la mise |
| **2 symboles identiques** | 30% | 2.5x la mise |
| **Aucune correspondance** | 67% | Mise perdue |

***

### Symboles

14 symboles différents sont utilisés, incluant des fruits et des emojis variés.

***

### Affichage

* Le résultat est affiché avec des **couleurs ANSI** :
  * 🟢 **Vert** : victoire
  * 🔴 **Rouge** : défaite`,
  icon: "🎰",
  parentId: "wiki137",
  order: 1,
});

// ============================================================
// 23. ADD: Roulette Discord (wiki140)
// ============================================================
addPage({
  id: "wiki140",
  slug: "roulette-discord",
  title: "Roulette Discord",
  content: `***

## **Roulette – Casino Discord**

La roulette classique : pariez sur une couleur ou un numéro.

***

### Commande

\`\`\`
/roulette <mise> [couleur] [numero]
\`\`\`

Vous devez choisir **soit** une couleur, **soit** un numéro (pas les deux).

***

### Options de paris

#### Pari sur la couleur

| Option | Description | Probabilité de gain | Gain |
|--------|-------------|--------------------:|------|
| 🔴 **Rouge** | Parier sur rouge | 39% | 1x la mise (doublement) |
| ⚫ **Noir** | Parier sur noir | 39% | 1x la mise (doublement) |

#### Pari sur un numéro

| Option | Description | Probabilité de gain | Gain |
|--------|-------------|--------------------:|------|
| **0-36** | Parier sur un numéro précis | 1% | 35x la mise |

***

### Résultat

Le résultat affiche :
* La **couleur** de la case (🔴 Rouge, ⚫ Noir, 🟢 Vert pour le 0)
* Le **numéro** tiré
* Votre **gain ou perte**

Un bouton **"Rejouer"** apparaît pour relancer avec la même mise.

***

### Stratégie

* Le pari sur la **couleur** est plus sûr (39% de chance) mais rapporte moins
* Le pari sur un **numéro** est très risqué (1%) mais rapporte 35x la mise
* Gérez votre bankroll et ne misez pas tout sur un seul tour`,
  icon: "🎡",
  parentId: "wiki137",
  order: 2,
});

// ============================================================
// 24. ADD: Coin Flip (wiki141)
// ============================================================
addPage({
  id: "wiki141",
  slug: "coin-flip",
  title: "Coin Flip",
  content: `***

## **Coin Flip – Casino Discord**

Le Coin Flip est un duel pile ou face entre deux joueurs.

***

### Commande

\`\`\`
/coin-flip <montant>
\`\`\`

Mise minimum : 1$

***

### Fonctionnement

1. Vous lancez un défi avec votre mise
2. Un **message s'affiche** dans le salon dédié avec deux boutons :
   * ✔️ **Rejoindre** : un autre joueur accepte le défi et mise le même montant
   * ✖️ **Annuler** : vous annulez le défi
3. Une fois qu'un adversaire rejoint, le **pile ou face** est lancé
4. Le **gagnant remporte le double** de la mise totale

***

### Règles

* Un seul coin flip actif par salon à la fois
* L'argent est **déduit immédiatement** à la création du défi
* Si vous annulez, votre mise est **remboursée**
* Le gagnant reçoit **2x la mise** (sa mise + celle de l'adversaire)

***

### Exemple

1. Joueur A lance \`/coin-flip 5000\` → 5000$ déduits de son compte
2. Joueur B clique sur ✔️ → 5000$ déduits de son compte
3. Le bot tire au sort → **Joueur A gagne**
4. Joueur A reçoit **10 000$** (5000 + 5000)`,
  icon: "🪙",
  parentId: "wiki137",
  order: 3,
});

// ============================================================
// 25. ADD: Commandes Éco Discord (wiki142)
// ============================================================
addPage({
  id: "wiki142",
  slug: "commandes-eco-discord",
  title: "Commandes Economiques Discord",
  content: `***

## **Commandes Économiques du Bot Discord**

Ces commandes permettent de gérer votre argent et vos tokens directement depuis Discord, synchronisés avec votre compte Minecraft.

**Prérequis** : Votre compte Minecraft doit être **lié** à Discord (\`/link\`).

***

### Consulter vos fonds

| Commande | Description |
|----------|-------------|
| \`/my money\` | Affiche votre solde d'argent (🪙) en jeu |
| \`/my tokens\` | Affiche votre nombre de tokens (🎟️) |

***

### Envoyer des fonds

| Commande | Description |
|----------|-------------|
| \`/pay money <joueur> <montant>\` | Transférer de l'argent à un joueur |
| \`/pay tokens <joueur> <montant>\` | Transférer des tokens à un joueur |

**Restrictions** :
* Vous ne pouvez pas envoyer à vous-même
* Le montant doit être supérieur à 0
* Vous devez avoir les fonds suffisants
* Le joueur cible doit aussi avoir un compte lié

***

### Consulter les fonds d'un joueur

| Commande | Description |
|----------|-------------|
| \`/see money <joueur>\` | Voir l'argent d'un autre joueur |
| \`/see tokens <joueur>\` | Voir les tokens d'un autre joueur |

Le joueur cible doit avoir un compte lié à Discord.`,
  icon: "💰",
  parentId: "wiki136",
  order: 1,
});

// ============================================================
// 26. ADD: Infos & Stats Discord (wiki143)
// ============================================================
addPage({
  id: "wiki143",
  slug: "infos-stats-discord",
  title: "Informations & Stats Discord",
  content: `***

## **Commandes d'Information du Bot Discord**

***

### Classements

\`\`\`
/top <type>
\`\`\`

| Type | Description |
|------|-------------|
| \`money\` | Top 10 des joueurs les plus riches |
| \`token\` | Top 10 des joueurs avec le plus de tokens |

Le classement affiche :
* Le **rang**, le **pseudo** et la **mention Discord** de chaque joueur
* Votre propre **rang** en bas du classement

***

### Informations joueur

\`\`\`
/user informations [joueur]
\`\`\`

Affiche les informations complètes d'un joueur (vous-même par défaut) :

**Discord** :
* Nom global, nom d'utilisateur, ID
* Date de création du compte
* Date d'arrivée sur le serveur
* Statut de boost Nitro

**Minecraft** (si le compte est lié) :
* Pseudo Minecraft
* Grade actuel
* Solde d'argent (🪙)
* Nombre de tokens (🎟️)

***

### Informations serveur

\`\`\`
/server information
\`\`\`

Affiche les informations du serveur :

**Discord** :
* Nom, ID, propriétaire
* Nombre de membres

**Minecraft** :
* Statut du serveur (en ligne/hors ligne)
* IP et port
* Nombre de joueurs connectés
* Version du jeu

***

### Statistiques du casino

\`\`\`
/stats <type>
\`\`\`

| Type | Description |
|------|-------------|
| \`games\` | Graphique du nombre de parties jouées par jeu (Blackjack, Roulette, Slots) |
| \`money\` | Graphique de l'argent gagné/perdu par jeu + total |

Les statistiques sont affichées sous forme de **graphique en barres**.

***

### Liens utiles

| Commande | Description |
|----------|-------------|
| \`/ip\` | Affiche l'IP du serveur : \`play.linesia.net:19132\` + lien tutoriel YouTube |
| \`/vote\` | Lien de vote (récompense : 2 clés de vote) |
| \`/shop\` | Lien vers la boutique en ligne : \`store.linesia.net\` |`,
  icon: "📊",
  parentId: "wiki136",
  order: 2,
});

// ============================================================
// 27. ADD: Enchères Discord (wiki144)
// ============================================================
addPage({
  id: "wiki144",
  slug: "encheres-discord",
  title: "Encheres Discord",
  content: `***

## **Système d'Enchères – Bot Discord**

Le système d'enchères permet de participer à des ventes aux enchères pour des items rares directement depuis Discord.

***

### Comment participer

1. Une enchère est annoncée dans le salon dédié avec :
   * L'**item** mis aux enchères
   * La **mise de départ**
   * La **durée** de l'enchère
   * Une **description** (optionnelle)
2. Cliquez sur le bouton **"Enchérir"**
3. Un formulaire s'ouvre pour entrer votre offre
4. Votre offre doit être **supérieure** à l'enchère actuelle

***

### Règles d'enchère

* Votre offre est **immédiatement déduite** de votre solde
* Si vous êtes **surenchéri**, votre offre précédente est **automatiquement remboursée**
* Vous pouvez **surenchérir sur vous-même** pour augmenter votre offre
* L'enchère se termine automatiquement à la fin du timer

***

### Résultats

* Le **gagnant** remporte l'item mis aux enchères
* S'il n'y a **aucune offre**, l'enchère est annulée
* Le bouton d'enchère est **désactivé** une fois l'enchère terminée

***

### Enchères automatiques

Des enchères sont lancées automatiquement chaque **dimanche** avec des items comme la "Maison des factions" et une mise de départ entre 100$ et 1000$.

***

### Prérequis

* Compte Minecraft **lié** à Discord
* **Fonds suffisants** pour votre enchère`,
  icon: "🔨",
  parentId: "wiki136",
  order: 3,
});

// ============================================================
// 28. ADD: Mini-Jeux Discord (wiki145)
// ============================================================
addPage({
  id: "wiki145",
  slug: "mini-jeux-discord",
  title: "Mini-Jeux Discord",
  content: `***

## **Mini-Jeux Automatiques – Bot Discord**

Toutes les **2 heures 30**, un mini-jeu apparaît automatiquement dans le salon dédié. Le premier joueur à trouver la bonne réponse remporte la récompense !

***

### Types de mini-jeux

#### 🧮 **Calcul Mathématique**
Un calcul aléatoire est proposé :
* Addition, soustraction, multiplication ou division
* Répondez avec le résultat exact dans le chat

**Exemple** : *Combien font 42 × 7 ?* → Répondez \`294\`

#### 🔤 **Mot Mélangé**
Un mot est affiché avec ses lettres mélangées :
* Retrouvez le mot original
* Plus de 100 mots possibles

**Exemple** : *TERACOT* → Répondez \`CAROTTE\`

#### 🔢 **Nombre Mystère**
Devinez un nombre dans une fourchette donnée :
* Le bot indique la fourchette (ex : entre 1 et 100)
* Tapez votre réponse dans le chat

***

### Récompense

* Entre **100 et 500** 🪙 (montant aléatoire)
* Crédités directement sur votre compte Minecraft
* Seul le **premier joueur** à répondre correctement gagne

***

### Comment participer

1. Surveillez le salon des mini-jeux
2. Quand un mini-jeu apparaît, **tapez votre réponse dans le chat**
3. Le bot vérifie automatiquement et annonce le gagnant`,
  icon: "🎲",
  parentId: "wiki136",
  order: 4,
});

// ============================================================
// 29. ADD: Tickets Discord (wiki146)
// ============================================================
addPage({
  id: "wiki146",
  slug: "tickets-discord",
  title: "Tickets Discord",
  content: `***

## **Système de Tickets – Bot Discord**

Le système de tickets permet de contacter le staff de Linesia de manière organisée et privée.

***

### Créer un ticket

1. Rendez-vous dans le salon de tickets sur Discord
2. Utilisez le **menu déroulant** pour sélectionner la catégorie de votre demande
3. Un formulaire s'ouvre avec des **questions spécifiques** à votre catégorie
4. Remplissez le formulaire et validez
5. Un **salon privé** est créé automatiquement pour votre ticket

***

### Catégories de tickets

| Catégorie | Description |
|-----------|-------------|
| 🛒 **Achats** | Problèmes avec un achat sur la boutique |
| 🚨 **Report** | Signaler un joueur (triche, comportement, etc.) |
| 💰 **Remboursement** | Demande de remboursement d'items perdus |
| 🔧 **Administration** | Questions ou demandes aux administrateurs |
| 📝 **Autres** | Toute autre demande |

***

### Dans le ticket

Une fois le ticket ouvert :
* Un **message d'accueil** résume votre demande
* Le staff peut interagir via un menu d'actions :
  * **Fermer** le ticket (avec raison)
  * **Générer un transcript** HTML
  * **Ajouter/Retirer** des utilisateurs ou rôles

***

### Fermeture du ticket

Quand un ticket est fermé :
* Le staff fournit une **raison** de fermeture
* Un **transcript HTML complet** de la conversation est :
  * Envoyé en **message privé** au créateur du ticket
  * Archivé dans le salon de logs
* Le salon du ticket est **supprimé automatiquement** après 5 secondes`,
  icon: "🎫",
  parentId: "wiki136",
  order: 5,
});

// ============================================================
// 30. ADD: Commandes Économiques in-game (wiki147)
// ============================================================
addPage({
  id: "wiki147",
  slug: "commandes-economie",
  title: "Commandes Economie",
  content: `***

## **Commandes Économiques en jeu**

Toutes les commandes pour gérer votre argent et vos transactions sur le serveur Minecraft.

***

### Consulter son solde

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/money\` | \`/my-money\`, \`/mymoney\` | Afficher votre solde actuel |
| \`/see-money <joueur>\` | \`/seemoney\` | Voir le solde d'un autre joueur |

***

### Transferts

| Commande | Description |
|----------|-------------|
| \`/pay <joueur> <montant>\` | Transférer de l'argent à un joueur |
| \`/cash <montant>\` | Convertir de l'argent en objet physique (100$ - 1M$) |

**Restrictions du \`/pay\`** :
* Pas d'envoi à soi-même
* Montant strictement positif
* Fonds suffisants requis
* La transaction est enregistrée dans les analytics

***

### Revenus passifs

| Commande | Description |
|----------|-------------|
| \`/atm\` | Convertir votre temps de jeu en argent (500$/h, min. 1h) |
| \`/afk\` | Se téléporter à la zone AFK Money (gain passif, PvP activé) |
| \`/vote\` | Réclamer vos récompenses de vote |

***

### Achat et vente

| Commande | Aliases | Description |
|----------|---------|-------------|
| \`/shop\` | — | Ouvrir la boutique du serveur |
| \`/market\` | \`/ah\`, \`/hdv\` | Ouvrir l'Hôtel des Ventes (Marketplace) |
| \`/market sell\` | \`/ah sell\` | Mettre en vente l'item dans votre main |
| \`/sellall\` | — | Vendre tout l'inventaire au shop (Premium/Elite) |

***

### Classements

| Commande | Description |
|----------|-------------|
| \`/top money\` | Classement des plus riches |
| \`/top gains\` | Classement par gains totaux |
| \`/top token\` | Classement par tokens |`,
  icon: "💰",
  parentId: "wiki097",
  order: 15,
});

// ============================================================
// 31. UPDATE: Bien débuter (wiki015) - Fix some commands
// ============================================================
updatePage("wiki015", {
  content: `***

### 🧭 **Introduction au serveur KitMap de Linesia**

Le serveur KitMap de **Linesia** est un environnement **PvP** intense où les joueurs s'affrontent en utilisant des kits prédéfinis. L'objectif est de dominer le terrain, d'éliminer les adversaires et de contrôler des zones stratégiques.

#### 🔧 Accès au serveur :

* **Adresse IP** : **play.linesia.net**
* **Port** : **19132**
* **Version Minecraft** : Dernière version disponible (mise à jour automatique)

***

### ⚔️ **Comprendre le gameplay KitMap**

* **Kits prédéfinis** : Vous disposez de kits avec des équipements spécifiques via \`/kit\`.
* **Zones de combat** : Les zones encouragent les affrontements rapides.
* **Les Bases** : Trouvez un claim aux extrémités de la map. Utilisez \`/aps\` suivi de Nord, Sud, Est ou Ouest pour vous y téléporter. Les bases servent pour le farming, le stockage et le PvP de faction.
* **La Zone Farm** : Zone sécurisée pour s'entraîner, récolter et chasser sans PvP. Accessible via \`/farm\`.
  * **Mobs** : Sangliers, Cerfs, Crocodiles, Girafes, Éléphants

***

### 🛡️ **Commandes de Faction**

| Commande | Description |
|----------|-------------|
| \`/f create <nom>\` | Créer une faction (nom définitif !) |
| \`/f join <nom>\` | Rejoindre une faction existante |
| \`/f leave\` | Quitter votre faction |
| \`/f disband\` | Dissoudre votre faction |
| \`/f invite <joueur>\` | Inviter un joueur |
| \`/f kick <joueur>\` | Expulser un joueur |
| \`/f promote <joueur>\` | Promouvoir un membre |
| \`/f demote <joueur>\` | Rétrograder un membre |
| \`/f ally <faction>\` | Créer une alliance |
| \`/f home\` | Se téléporter au home de faction |
| \`/f sethome\` | Définir le home de faction |
| \`/f top\` | Classement des factions |
| \`/f info [faction]\` | Informations sur une faction |

> Le claim se fait en posant un **Monolithe** (pas de commande \`/f claim\`).

***

### 🧠 **Conseils pour débuter**

* **Rejoindre une faction** dès le début pour la protection et les ressources partagées
* **Poser un Monolithe** pour claim votre zone (15 membres max, 1 alliance par commande)
* **Communiquer** : \`/msg <pseudo>\` pour les messages privés, \`/tl\` pour appeler votre faction
* **Gérer ses alliances** : les trahisons sont permises hors alliance par commande

***

### 📋 **Commandes essentielles**

#### Déplacement

| Commande | Description |
|----------|-------------|
| \`/spawn\` | Retour au spawn |
| \`/kit\` | Voir les kits disponibles |
| \`/farm\` | Zone de farming |
| \`/mine\` | Zone de minage |
| \`/fish\` | Zone de pêche |
| \`/combat\` | Zone de combat (mobs) |
| \`/warzone\` | Zone PvP |
| \`/afk\` | Zone AFK Money (PvP activé !) |
| \`/aps\` | Choisir un avant-poste (N/S/E/O) |
| \`/tpa <joueur>\` | Demande de téléportation |
| \`/tpaaccept\` | Accepter une téléportation |

#### Informations

| Commande | Description |
|----------|-------------|
| \`/settings\` | Paramètres du jeu (scoreboard, langue, coordonnées) |
| \`/stats [joueur]\` | Voir vos statistiques |
| \`/cooldowns\` | Voir les cooldowns de vos items |
| \`/profil [joueur]\` | Voir votre profil complet |
| \`/menu\` | Menu principal du serveur |
| \`/ping\` | Voir votre latence |

#### Économie

| Commande | Description |
|----------|-------------|
| \`/money\` | Voir votre solde |
| \`/pay <joueur> <montant>\` | Envoyer de l'argent |
| \`/shop\` | Ouvrir la boutique |
| \`/market\` ou \`/hdv\` | Ouvrir l'Hôtel des Ventes |
| \`/top money\` | Classement des plus riches |

***

### 💎 **Commandes Premium**

| Commande | Description |
|----------|-------------|
| \`/repair\` | Réparer l'item dans votre main |
| \`/ec\` | Ouvrir votre Enderchest |
| \`/craft\` | Table de craft portable |
| \`/rename\` | Renommer un item |
| \`/pv 3,4,5\` | Coffres privés (3-5) |
| \`/sellall\` | Vendre tout l'inventaire au shop |
| \`/kit premium\` | Kit Premium (toutes les 10 min) |
| \`/kit reclaim_premium\` | Reclaim quotidien |

***

### 👑 **Commandes Elite** (en plus du Premium)

| Commande | Description |
|----------|-------------|
| \`/fly\` | Vol (spawn uniquement) |
| \`/repairall\` | Réparer tous les items |
| \`/pv 3,4,5,6\` | Coffres privés (3-6) |
| \`/kit elite\` | Kit Elite (toutes les 10 min) |
| \`/kit reclaim_elite\` | Reclaim quotidien amélioré |

***

### 🎮 **Conseils avancés**

1. **Choisir un bon kit** : familiarisez-vous avec ses capacités et sticks
2. **Rejoindre/créer une faction** : la protection en groupe est cruciale
3. **Réclamer son terrain** : sécurisez vos items contre les pillages
4. **Utiliser le shop et l'HDV** : achetez sticks et équipements
5. **Maîtriser les sticks** : Freeze, Anti-Perle, Anti-Item, Anti-Build, Anti-Back, Téléportation, View, Size, Effect, God, Repair, Foudre
6. **Surveiller les ennemis** : leurs mouvements et factions proches
7. **Gérer son inventaire** : toujours avoir des healing, surtout avant le PvP
8. **Participer aux événements** : ressources rares et améliorations

***

### 💡 **Astuces PvP**

* **Combo de sticks** : Freeze + Anti-Perle + Anti-Item pour neutraliser un adversaire
* **Contrôle du terrain** : Prenez l'Outpost ou les zones de Domination
* **Communication** : Utilisez \`/tl\` pour coordonner vos attaques
* **Observer les cooldowns** : \`/cooldowns\` pour savoir quand vos items sont prêts
* **Stick de Size** : passez là où personne ne s'y attend`,
});

// ============================================================
// FIX: Remove wiki106 Trade Cosmétique reference to warzone
// Trade Cosmétique (wiki107) is fine as-is, no changes needed
// ============================================================

// ============================================================
// Sort all pages by parentId groups and order
// ============================================================
wiki.sort((a, b) => {
  // Root pages first, then by order
  if (a.parentId === null && b.parentId !== null) return -1;
  if (a.parentId !== null && b.parentId === null) return 1;
  if (a.parentId === b.parentId) return a.order - b.order;
  return (a.parentId || "").localeCompare(b.parentId || "");
});

writeFileSync("data/wiki.json", JSON.stringify(wiki, null, 2), "utf8");

console.log(`Wiki updated: ${wiki.length} pages total`);

// Count new pages
const newIds = [
  "wiki126",
  "wiki127",
  "wiki128",
  "wiki129",
  "wiki130",
  "wiki131",
  "wiki132",
  "wiki133",
  "wiki134",
  "wiki135",
  "wiki136",
  "wiki137",
  "wiki138",
  "wiki139",
  "wiki140",
  "wiki141",
  "wiki142",
  "wiki143",
  "wiki144",
  "wiki145",
  "wiki146",
  "wiki147",
];
console.log(`New pages added: ${newIds.length}`);
console.log(
  `Updated pages: wiki001, wiki007, wiki015, wiki094, wiki097, wiki101, wiki103, wiki104, wiki106`
);
