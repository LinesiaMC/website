/**
 * Seed SEO-focused articles into the Linesia DB.
 *
 * Target queries: "minecraft bedrock", "minecraft bedrock fr",
 * "serveur minecraft bedrock", "meilleur serveur minecraft bedrock",
 * "comment rejoindre serveur minecraft bedrock", "pvp faction",
 * "skyfaction", "skyblock bedrock", "kitffa", "kitmap", etc.
 *
 * Run: node scripts/seed-seo-articles.mjs
 */

import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB = `file:${path.join(__dirname, "..", "data", "linesia.db")}`;
const DATABASE_URL = process.env.DATABASE_URL || DEFAULT_DB;

const db = createClient({ url: DATABASE_URL });

// --- Articles (content is rendered as plain text with whitespace-pre-line) ---
// Use stable slug IDs so URLs are SEO-friendly: /news/<id>
const ARTICLES = [
  // 1. Comment rejoindre
  {
    id: "comment-rejoindre-serveur-minecraft-bedrock",
    locale: "fr",
    date: "2026-04-01",
    title: "Comment rejoindre un serveur Minecraft Bedrock (PC, mobile, console) — guide complet 2026",
    excerpt:
      "Tu veux rejoindre un serveur Minecraft Bedrock depuis PC, Xbox, PlayStation, Switch ou mobile ? Suis ce guide pas à pas pour te connecter à Linesia et jouer en quelques secondes.",
    content: `Tu débutes sur Minecraft Bedrock Edition et tu veux rejoindre un serveur comme Linesia ? Ce guide t'explique comment ajouter un serveur Minecraft Bedrock étape par étape, que tu joues sur PC Windows, Xbox, PlayStation, Nintendo Switch, Android ou iOS.

1) Lance Minecraft Bedrock Edition
Ouvre le jeu sur ta plateforme. Minecraft Bedrock est la version "unifiée" qui tourne sur PC Windows 10/11, mobile (Android/iOS), Xbox, PlayStation 4/5 et Nintendo Switch. Si tu joues sur PC Java Edition, tu ne pourras pas rejoindre un serveur Bedrock : ce sont deux versions distinctes.

2) Clique sur "Jouer" puis "Serveurs"
Dans le menu principal, sélectionne "Jouer", puis va dans l'onglet "Serveurs". Tu verras une liste de serveurs officiels mis en avant par Mojang, et en bas, un bouton "Ajouter un serveur".

3) Ajouter Linesia
Clique sur "Ajouter un serveur" et remplis :
- Nom du serveur : Linesia
- Adresse du serveur : play.linesia.net
- Port : 19132

Valide. Le serveur apparaîtra désormais dans ta liste.

4) Connecte-toi
Clique sur Linesia, puis sur "Rejoindre le serveur". Tu arrives directement dans le lobby ! Le premier chargement peut prendre quelques secondes selon ta connexion.

5) Lie ton compte sur le site
Une fois en jeu, tape la commande /link pour obtenir un code, puis connecte-toi sur linesia.net avec ton compte Microsoft pour synchroniser ton profil, ton rang, tes stats et tes cosmétiques.

Astuces :
- Sur console (Xbox, PS, Switch), la liste des serveurs tiers nécessite parfois l'activation des "Serveurs en ligne" dans les paramètres multijoueur de ton compte Microsoft.
- Si tu n'arrives pas à te connecter, vérifie que Minecraft est à jour et que ton abonnement Xbox Live (nécessaire pour le multijoueur sur console) est actif.
- Sur mobile, pense à jouer en Wi-Fi pour une expérience fluide.

Prêt à commencer ? Rejoins Linesia dès maintenant : un serveur Minecraft Bedrock FR complet avec SkyFaction, KitFFA, Kitmap et du PvP Faction non-stop.`,
  },
  {
    id: "how-to-join-minecraft-bedrock-server",
    locale: "en",
    date: "2026-04-01",
    title: "How to join a Minecraft Bedrock server (PC, mobile, console) — full 2026 guide",
    excerpt:
      "Want to join a Minecraft Bedrock server from PC, Xbox, PlayStation, Switch or mobile? Follow this step-by-step guide to connect to Linesia in seconds.",
    content: `New to Minecraft Bedrock Edition and want to join a server like Linesia? This guide walks you through adding a Minecraft Bedrock server step by step — on Windows PC, Xbox, PlayStation, Nintendo Switch, Android or iOS.

1) Launch Minecraft Bedrock Edition
Open the game on your platform. Minecraft Bedrock is the unified version running on Windows 10/11 PC, mobile (Android/iOS), Xbox, PlayStation 4/5 and Nintendo Switch. Minecraft Java Edition cannot connect to Bedrock servers — they are two separate versions.

2) Click "Play" then "Servers"
From the main menu, tap "Play", then open the "Servers" tab. You'll see a list of featured official servers and, at the bottom, an "Add Server" button.

3) Add Linesia
Tap "Add Server" and fill in:
- Server name: Linesia
- Server address: play.linesia.net
- Port: 19132

Save. The server now shows up in your list.

4) Join
Click Linesia, then "Join Server". You'll land directly in the lobby. The first load may take a few seconds depending on your connection.

5) Link your account on the website
Once in-game, run /link to get a code, then sign in on linesia.net with your Microsoft account to sync your profile, rank, stats and cosmetics.

Tips:
- On console (Xbox, PS, Switch), third-party servers may require enabling "Online servers" under your Microsoft account multiplayer settings.
- If you can't connect, make sure Minecraft is up to date and that your Xbox Live subscription (required for console multiplayer) is active.
- On mobile, play on Wi-Fi for a smoother experience.

Ready to start? Join Linesia today — a full Minecraft Bedrock server featuring SkyFaction, KitFFA, Kitmap and non-stop PvP Faction.`,
  },

  // 2. Meilleur serveur FR
  {
    id: "meilleur-serveur-minecraft-bedrock-fr-2026",
    locale: "fr",
    date: "2026-04-02",
    title: "Quel est le meilleur serveur Minecraft Bedrock FR en 2026 ?",
    excerpt:
      "Tu cherches le meilleur serveur Minecraft Bedrock français ? On fait le point sur les critères à regarder et pourquoi Linesia s'impose comme une référence PvP Faction en 2026.",
    content: `Avec des centaines de serveurs Minecraft Bedrock francophones, difficile de s'y retrouver. Voici les critères qui font réellement la différence en 2026 — et pourquoi Linesia se distingue sur chacun.

1) Une communauté FR active
Un bon serveur Minecraft Bedrock FR, c'est d'abord du monde en ligne à toute heure. Linesia propose un Discord actif, du staff francophone, et une population stable qui remplit le PvP, les factions et les événements chaque soir.

2) Des modes de jeu uniques, pas des copies
Trop de serveurs se contentent de cloner SkyBlock ou KitPvP. Linesia propose :
- SkyFaction : le meilleur du SkyBlock et de la Faction réunis, avec progression, jobs et prestige.
- KitFFA : du PvP kit instantané, parfait pour les parties rapides.
- Kitmap : un mode compétitif avec maps tournantes.
- Des modes temporaires saisonniers (événements, remix PvP).

3) Stabilité et performance
Linesia tourne sur une infrastructure dédiée optimisée Bedrock : peu de lag, tick rate stable, et des sauvegardes régulières. Accessible PC, mobile et console.

4) Une vraie économie et progression
Les serveurs qui durent proposent une économie équilibrée : argent, jobs, prestige, cosmétiques. Sur Linesia, chaque heure jouée compte et tu peux suivre ton classement sur linesia.net/leaderboard.

5) Un staff présent et transparent
Sanctions visibles publiquement, support par tickets, wiki complet, changelog régulier. Tu sais toujours ce qui change sur le serveur.

6) Gratuit + boutique honnête
Tout le contenu gameplay est gratuit. La boutique propose cosmétiques et boosters, jamais d'items pay-to-win qui cassent l'équilibre.

Comment rejoindre Linesia ?
Adresse : play.linesia.net — Port : 19132. Compatible PC Windows, Android, iOS, Xbox, PlayStation et Nintendo Switch.

Verdict : en 2026, Linesia est l'un des meilleurs serveurs Minecraft Bedrock FR pour les joueurs qui veulent du PvP Faction sérieux, une progression longue durée et une communauté francophone active.`,
  },
  {
    id: "best-minecraft-bedrock-server-2026",
    locale: "en",
    date: "2026-04-02",
    title: "What is the best Minecraft Bedrock server in 2026?",
    excerpt:
      "Looking for the best Minecraft Bedrock server? We review the criteria that really matter and why Linesia stands out as a top PvP Faction server in 2026.",
    content: `With hundreds of Minecraft Bedrock servers around, picking a good one is hard. Here are the criteria that actually matter in 2026 — and why Linesia stands out on every single one.

1) An active community
A great Minecraft Bedrock server needs players online at any hour. Linesia has a busy Discord, responsive staff, and a stable population filling PvP, factions and events every evening.

2) Unique game modes, not clones
Too many servers just copy SkyBlock or KitPvP. Linesia offers:
- SkyFaction: the best of SkyBlock and Faction combined, with progression, jobs and prestige.
- KitFFA: instant kit PvP, perfect for quick matches.
- Kitmap: a competitive rotating-map mode.
- Seasonal limited-time modes (events, PvP remixes).

3) Stability and performance
Linesia runs on dedicated Bedrock-optimized infrastructure: low lag, stable tick rate, regular backups. Playable on PC, mobile and console.

4) Real economy and progression
Servers that last have a balanced economy: money, jobs, prestige, cosmetics. On Linesia, every hour played counts and you can track your ranking at linesia.net/leaderboard.

5) Present, transparent staff
Public sanctions, ticket-based support, a full wiki, regular changelogs. You always know what's changing.

6) Free + fair shop
All gameplay content is free. The shop sells cosmetics and boosters, never pay-to-win items that break balance.

How to join Linesia?
Address: play.linesia.net — Port: 19132. Works on Windows PC, Android, iOS, Xbox, PlayStation and Nintendo Switch.

Verdict: in 2026, Linesia is one of the top Minecraft Bedrock servers for players who want serious PvP Faction, long-term progression and an active community.`,
  },

  // 3. Multi-plateforme
  {
    id: "jouer-minecraft-bedrock-pc-mobile-console",
    locale: "fr",
    date: "2026-04-03",
    title: "Jouer à Minecraft Bedrock sur PC, mobile et console : le guide complet",
    excerpt:
      "Minecraft Bedrock tourne partout : Windows, Android, iOS, Xbox, PlayStation, Switch. Découvre comment jouer entre plateformes et rejoindre un serveur comme Linesia.",
    content: `Minecraft Bedrock Edition, c'est la version multi-plateforme de Minecraft. Contrairement à Java, Bedrock tourne sur à peu près tout : Windows, mobile, Xbox, PlayStation et Switch — et tout le monde peut jouer ensemble. Voici comment en profiter au maximum.

Sur quelles plateformes peut-on jouer à Minecraft Bedrock ?
- Windows 10 / 11 (PC)
- Android (smartphones et tablettes)
- iOS / iPadOS
- Xbox One, Xbox Series S/X
- PlayStation 4, PlayStation 5
- Nintendo Switch
- Amazon Fire TV et certaines TV connectées

Le crossplay : jouer entre plateformes
Bedrock permet à un joueur Xbox de jouer avec un ami sur mobile ou sur PC, dans le même monde ou le même serveur. C'est une des forces majeures de Bedrock face à Java.

Comment rejoindre un serveur Minecraft Bedrock sur chaque plateforme ?
La procédure est quasi identique :
1. Ouvre Minecraft.
2. Va dans "Jouer" → "Serveurs".
3. Clique sur "Ajouter un serveur".
4. Entre l'adresse : play.linesia.net — port : 19132.
5. Valide et connecte-toi.

Sur console (Xbox/PS/Switch), pense à autoriser les "serveurs en ligne" dans les paramètres multijoueur Microsoft.

Quels abonnements sont nécessaires ?
- PC et mobile : aucun abonnement multijoueur requis.
- Xbox : Xbox Live (souvent inclus dans le Game Pass).
- PlayStation : compte PlayStation Network (pas besoin de PS Plus pour Minecraft depuis 2023).
- Switch : Nintendo Switch Online.

Astuces perfs
- Sur mobile, active "Graphismes à faible complexité" si ça rame.
- Sur PC, le RTX ne fonctionne que sur Bedrock Windows 10/11.
- Sur console, joue en 60 FPS si ta console le supporte.

Minecraft Bedrock sur Linesia
Linesia est optimisé pour toutes les plateformes Bedrock : PC, mobile, console. Une seule adresse : play.linesia.net. SkyFaction, KitFFA, Kitmap et PvP Faction t'attendent.`,
  },
  {
    id: "play-minecraft-bedrock-pc-mobile-console",
    locale: "en",
    date: "2026-04-03",
    title: "Playing Minecraft Bedrock on PC, mobile and console: the complete guide",
    excerpt:
      "Minecraft Bedrock runs everywhere: Windows, Android, iOS, Xbox, PlayStation, Switch. Discover how to crossplay and join a server like Linesia.",
    content: `Minecraft Bedrock Edition is the multi-platform version of Minecraft. Unlike Java, Bedrock runs almost everywhere — Windows, mobile, Xbox, PlayStation and Switch — and everyone can play together.

Which platforms support Minecraft Bedrock?
- Windows 10 / 11 (PC)
- Android (phones and tablets)
- iOS / iPadOS
- Xbox One, Xbox Series S/X
- PlayStation 4, PlayStation 5
- Nintendo Switch
- Amazon Fire TV and some smart TVs

Crossplay: playing across platforms
Bedrock lets an Xbox player join a friend on mobile or PC, in the same world or server. That's one of Bedrock's biggest advantages over Java.

How to join a Minecraft Bedrock server on each platform?
The process is almost identical:
1. Open Minecraft.
2. Go to "Play" → "Servers".
3. Tap "Add Server".
4. Enter address: play.linesia.net — port: 19132.
5. Save and connect.

On console (Xbox/PS/Switch), allow "online servers" under Microsoft multiplayer settings.

Required subscriptions
- PC and mobile: no multiplayer subscription required.
- Xbox: Xbox Live (often included with Game Pass).
- PlayStation: PSN account (PS Plus no longer required for Minecraft since 2023).
- Switch: Nintendo Switch Online.

Performance tips
- On mobile, enable "Fast graphics" if it lags.
- On PC, RTX only works on Bedrock Windows 10/11.
- On console, play at 60 FPS if supported.

Minecraft Bedrock on Linesia
Linesia is optimized for every Bedrock platform — PC, mobile, console. One address: play.linesia.net. SkyFaction, KitFFA, Kitmap and PvP Faction are waiting.`,
  },

  // 4. PvP Faction
  {
    id: "pvp-faction-minecraft-bedrock-guide",
    locale: "fr",
    date: "2026-04-04",
    title: "PvP Faction Minecraft Bedrock : règles, stratégie et meilleurs serveurs",
    excerpt:
      "Le PvP Faction est l'un des modes les plus exigeants de Minecraft. Voici comment ça marche sur Bedrock, quelles stratégies fonctionnent, et où jouer.",
    content: `Le PvP Faction est sans doute le mode le plus complet de Minecraft : construction, économie, alliances, trahisons et combat. Il existe depuis l'époque Java et s'est imposé sur Bedrock avec des serveurs comme Linesia.

Qu'est-ce que le PvP Faction ?
Une Faction est un clan de joueurs qui revendiquent un territoire (des chunks), construisent une base, accumulent des ressources, et s'affrontent avec les autres Factions pour dominer le serveur. Chaque Faction a un chef, des officiers et des membres.

Les piliers du PvP Faction
- Claim : tu protèges ton territoire des griefs et des raids.
- Raid : tu attaques la base ennemie pour voler ses ressources.
- Économie : argent, shops joueurs, jobs, marché.
- Alliances : traités de paix, guerres, trahisons.
- Stuff PvP : armures enchantées, potions, kits.

Stratégies pour débuter
1) Rejoins une Faction active dès ton arrivée. Tu progresseras dix fois plus vite.
2) Investis dans une base défendable avant d'accumuler des ressources.
3) Entraîne-toi au PvP en KitFFA ou Kitmap avant de participer à un raid.
4) Apprends l'économie du serveur : vends les items rentables, évite les pièges à débutant.
5) Garde tes coordonnées secrètes. Une base découverte est une base morte.

PvP Faction sur Bedrock vs Java
Sur Bedrock, le touch-ups et le combat visé smartphone/manette rendent le PvP plus accessible mais plus technique en 1v1. Les serveurs comme Linesia adaptent les mécaniques pour garder de la profondeur.

Où jouer au PvP Faction Bedrock ?
Linesia propose du PvP Faction premium avec son mode phare SkyFaction : progression, jobs, prestige, raids encadrés, économie stable. Rejoins : play.linesia.net — port 19132.`,
  },
  {
    id: "pvp-faction-minecraft-bedrock-guide-en",
    locale: "en",
    date: "2026-04-04",
    title: "Minecraft Bedrock PvP Faction: rules, strategy and best servers",
    excerpt:
      "PvP Faction is one of Minecraft's most demanding modes. Here's how it works on Bedrock, what strategies win, and where to play.",
    content: `PvP Faction is probably Minecraft's most complete mode: building, economy, alliances, betrayals and combat. It started on Java and became a staple on Bedrock thanks to servers like Linesia.

What is PvP Faction?
A Faction is a clan of players who claim territory (chunks), build a base, stockpile resources, and fight other Factions to dominate the server. Each Faction has a leader, officers and members.

The pillars of PvP Faction
- Claim: you protect your territory from griefing and raids.
- Raid: you attack enemy bases to steal their resources.
- Economy: money, player shops, jobs, markets.
- Alliances: peace treaties, wars, betrayals.
- PvP gear: enchanted armor, potions, kits.

Beginner strategies
1) Join an active Faction as soon as you arrive. You'll progress ten times faster.
2) Build a defensible base before stockpiling resources.
3) Practice PvP in KitFFA or Kitmap before joining a raid.
4) Learn the server economy: sell profitable items, avoid beginner traps.
5) Keep your coordinates secret. A discovered base is a dead base.

Bedrock vs Java PvP Faction
On Bedrock, touch controls and aim-assist on phone/controller make PvP more accessible but more technical in 1v1. Servers like Linesia adapt mechanics to keep depth.

Where to play Bedrock PvP Faction?
Linesia offers premium PvP Faction with its flagship SkyFaction mode: progression, jobs, prestige, organized raids, stable economy. Join: play.linesia.net — port 19132.`,
  },

  // 5. SkyFaction / SkyBlock
  {
    id: "skyfaction-skyblock-bedrock-guide",
    locale: "fr",
    date: "2026-04-05",
    title: "Guide SkyFaction / SkyBlock sur Minecraft Bedrock : débuter et progresser",
    excerpt:
      "SkyFaction fusionne SkyBlock et Faction : île privée, économie, raids et progression. Voici comment débuter et dominer sur Minecraft Bedrock.",
    content: `Le SkyFaction est l'évolution moderne du SkyBlock : tu démarres sur une petite île suspendue dans le vide, tu la développes, tu fondes ou rejoins une Faction, et tu te bats pour dominer le serveur.

Les premières heures sur SkyFaction
1) Crée ou rejoins une île avec /is create. Invite des amis avec /is invite.
2) Étends ton île avec les ressources de base : cobble generator, ferme de bois, ferme à canne à sucre.
3) Dès que possible, lance une ferme XP et une ferme à villageois pour les enchantements.
4) Accumule de l'argent via les jobs ou la vente d'items rentables au spawn.

Progression à moyen terme
- Prestige : monte de niveau, débloque des bonus passifs.
- Jobs : mineur, bûcheron, pêcheur, chasseur — chacun donne de l'argent et de l'XP.
- Cosmétiques : particules, trails, chapeaux débloquables via vote, récompenses ou boutique.
- Faction : rejoins une grosse Faction pour accéder aux raids, guerres, alliances.

Conseils pour durer
- Protège ton île : verrouille les coffres, désactive le PvP interne.
- Diversifie tes revenus : plusieurs jobs + plusieurs fermes.
- Ne dépense pas tout : garde un stuff de rechange pour après un raid perdu.
- Participe aux événements saisonniers : souvent des récompenses exclusives.

SkyBlock vs SkyFaction : quelle différence ?
Le SkyBlock classique est solo ou coopératif pacifique. Le SkyFaction rajoute la dimension Faction, raids et PvP — parfait pour ceux qui veulent du SkyBlock avec du sel.

Joue à SkyFaction sur Linesia
Linesia propose le SkyFaction le plus complet sur Bedrock : jobs, prestige, cosmétiques, économie vivante, raids équilibrés. Adresse : play.linesia.net.`,
  },
  {
    id: "skyfaction-skyblock-bedrock-guide-en",
    locale: "en",
    date: "2026-04-05",
    title: "SkyFaction / SkyBlock on Minecraft Bedrock: how to start and progress",
    excerpt:
      "SkyFaction merges SkyBlock and Faction: private island, economy, raids and progression. Here's how to start and dominate on Minecraft Bedrock.",
    content: `SkyFaction is the modern evolution of SkyBlock: you start on a small floating island, grow it, found or join a Faction, and fight to dominate the server.

The first hours on SkyFaction
1) Create or join an island with /is create. Invite friends with /is invite.
2) Expand your island with basic resources: cobble generator, tree farm, sugarcane farm.
3) As soon as possible, set up an XP farm and a villager farm for enchantments.
4) Earn money through jobs or selling profitable items at spawn.

Mid-term progression
- Prestige: level up, unlock passive bonuses.
- Jobs: miner, lumberjack, fisher, hunter — each grants money and XP.
- Cosmetics: particles, trails, hats unlocked via vote, rewards or shop.
- Faction: join a big Faction to access raids, wars, alliances.

Tips to last
- Protect your island: lock chests, disable inner PvP.
- Diversify your income: multiple jobs + multiple farms.
- Don't spend it all: keep spare gear for after a lost raid.
- Join seasonal events: often exclusive rewards.

SkyBlock vs SkyFaction: what's the difference?
Classic SkyBlock is solo or peaceful co-op. SkyFaction adds Faction, raids and PvP — perfect for those who want salty SkyBlock.

Play SkyFaction on Linesia
Linesia hosts the most complete SkyFaction on Bedrock: jobs, prestige, cosmetics, living economy, balanced raids. Address: play.linesia.net.`,
  },

  // 6. KitFFA / KitMap
  {
    id: "kitffa-kitmap-minecraft-bedrock",
    locale: "fr",
    date: "2026-04-06",
    title: "KitFFA et Kitmap sur Minecraft Bedrock : comprendre les modes PvP rapides",
    excerpt:
      "KitFFA et Kitmap sont les modes PvP les plus joués sur Minecraft Bedrock. Équipement instantané, combats rapides : voici comment ils marchent et où jouer.",
    content: `Le KitFFA et le Kitmap sont les modes PvP instantanés qui cartonnent sur Minecraft Bedrock. Pas de farm, pas de grind : tu reçois un kit complet et tu combats directement.

KitFFA (Free-For-All)
- Tout le monde contre tout le monde sur une map ouverte.
- Ton kit est donné automatiquement : armure, épée, nourriture, potions éventuelles.
- Chaque kill rapporte des points / monnaie.
- Parfait pour s'entraîner au combat, tester un kit ou juste se défouler 10 minutes.

Kitmap
- Plus compétitif, plus structuré.
- Maps tournantes, parfois avec objectifs (capture, zones).
- Équipes possibles (2v2, 3v3, etc.) selon le serveur.
- Skill-based : la précision, le timing et le game sense font la différence.

Pourquoi ces modes explosent sur Bedrock ?
- Le touch-aim et la manette rendent le PvP court et nerveux — parfait pour le format kit.
- Sessions courtes : idéal pour jouer entre deux activités sur mobile.
- Accessible : pas de progression à refaire, même les débutants peuvent participer.

Astuces pour progresser
- Apprends ton kit par cœur : hotbar, emplacements, cooldowns.
- Entraîne le strafe et le block-hit sur Bedrock (mécaniques spécifiques).
- Utilise les potions au bon moment, pas en panique.
- Regarde des gameplays de joueurs top classement pour piquer des patterns.

Où jouer ?
Linesia propose du KitFFA et du Kitmap en parallèle du SkyFaction. Tu peux passer de l'un à l'autre depuis le lobby. Adresse : play.linesia.net — port 19132.`,
  },
  {
    id: "kitffa-kitmap-minecraft-bedrock-en",
    locale: "en",
    date: "2026-04-06",
    title: "KitFFA and Kitmap on Minecraft Bedrock: fast PvP modes explained",
    excerpt:
      "KitFFA and Kitmap are the most-played PvP modes on Minecraft Bedrock. Instant kits, fast fights — here's how they work and where to play.",
    content: `KitFFA and Kitmap are the instant PvP modes dominating Minecraft Bedrock. No farm, no grind: you get a full kit and fight right away.

KitFFA (Free-For-All)
- Everyone vs everyone on an open map.
- Kit is given automatically: armor, sword, food, sometimes potions.
- Each kill earns points / currency.
- Perfect for combat practice, testing a kit, or a quick 10-minute blast.

Kitmap
- More competitive, more structured.
- Rotating maps, sometimes with objectives (capture, zones).
- Team formats possible (2v2, 3v3, etc.) depending on the server.
- Skill-based: aim, timing and game sense make the difference.

Why these modes explode on Bedrock
- Touch aim and controller keep PvP short and nervous — perfect for kit format.
- Short sessions: ideal for mobile play between tasks.
- Accessible: no progression to rebuild, even beginners can hop in.

Tips to improve
- Learn your kit by heart: hotbar, slots, cooldowns.
- Train strafe and block-hit on Bedrock (platform-specific mechanics).
- Use potions at the right moment, not in panic.
- Watch top-leaderboard gameplay to steal patterns.

Where to play
Linesia runs KitFFA and Kitmap alongside SkyFaction. Switch between them from the lobby. Address: play.linesia.net — port 19132.`,
  },

  // 7. Top serveurs
  {
    id: "top-serveurs-minecraft-bedrock-2026",
    locale: "fr",
    date: "2026-04-07",
    title: "Top des meilleurs serveurs Minecraft Bedrock en 2026",
    excerpt:
      "Classement des types de serveurs Minecraft Bedrock à tester en 2026 : SkyFaction, PvP Faction, mini-jeux, Kitmap. Critères et recommandations.",
    content: `Voici les catégories de serveurs Minecraft Bedrock qui cartonnent en 2026, avec les critères pour choisir et nos recommandations.

1) Serveurs SkyFaction / Faction
Les serveurs les plus complets : progression longue, économie profonde, PvP non-stop. Idéal si tu veux investir des semaines sur un univers avec tes amis. Notre recommandation : Linesia (play.linesia.net) — SkyFaction, jobs, prestige, KitFFA intégré.

2) Serveurs KitFFA / Kitmap
Pour le PvP pur et rapide. Sessions courtes, pas de progression à refaire à chaque connexion. Linesia propose aussi ces modes en parallèle du SkyFaction.

3) Serveurs mini-jeux
Bedwars, SkyWars, BuildBattle, LuckyBlock. Format party-game, parfait pour jouer en groupe le temps d'une soirée.

4) Serveurs survie / semi-vanilla
Pour une expérience proche du Minecraft solo mais à plusieurs. Souvent avec anti-grief et économie légère.

5) Serveurs créatifs
Plots, WorldEdit, concours de build. Plus pour les créateurs et architectes.

Quels critères pour choisir ?
- Communauté francophone active (si tu cherches un serveur FR).
- Cross-platform : PC, mobile, console — le bon serveur marche partout.
- Staff présent et modération claire.
- Pas de pay-to-win : gameplay équilibré.
- Updates régulières et changelog public.
- Infra stable : peu de lag, peu de crashs.

Pourquoi Linesia revient souvent
Linesia coche toutes les cases : serveur Bedrock FR avec SkyFaction, KitFFA, Kitmap, PvP Faction, économie équilibrée, staff actif. Compatible PC, mobile et console. Adresse : play.linesia.net.

Comment tester plusieurs serveurs ?
Dans Minecraft Bedrock : onglet Serveurs → Ajouter un serveur → entre l'adresse. Tu peux en enregistrer autant que tu veux et switcher en un clic.`,
  },
  {
    id: "top-minecraft-bedrock-servers-2026",
    locale: "en",
    date: "2026-04-07",
    title: "Top Minecraft Bedrock servers to play in 2026",
    excerpt:
      "Ranking of Minecraft Bedrock server categories to try in 2026: SkyFaction, PvP Faction, mini-games, Kitmap. Criteria and recommendations.",
    content: `Here are the categories of Minecraft Bedrock servers that are winning in 2026, with criteria to pick one and our recommendations.

1) SkyFaction / Faction servers
The most complete servers: long progression, deep economy, non-stop PvP. Great if you want to invest weeks on a universe with friends. Our pick: Linesia (play.linesia.net) — SkyFaction, jobs, prestige, integrated KitFFA.

2) KitFFA / Kitmap servers
Pure, fast PvP. Short sessions, no progression to rebuild. Linesia also runs these alongside SkyFaction.

3) Mini-game servers
Bedwars, SkyWars, BuildBattle, LuckyBlock. Party-game format, perfect for an evening with friends.

4) Survival / semi-vanilla servers
For an experience close to solo Minecraft but shared. Often with anti-grief and light economy.

5) Creative servers
Plots, WorldEdit, build contests. More for creators and architects.

How to pick
- Active community (in your language).
- Cross-platform: PC, mobile, console — the right server works everywhere.
- Present staff and clear moderation.
- No pay-to-win: balanced gameplay.
- Regular updates and public changelog.
- Stable infra: low lag, few crashes.

Why Linesia keeps coming up
Linesia ticks every box: Bedrock server with SkyFaction, KitFFA, Kitmap, PvP Faction, balanced economy, active staff. Works on PC, mobile and console. Address: play.linesia.net.

How to test multiple servers?
In Minecraft Bedrock: Servers tab → Add Server → enter the address. You can save as many as you want and switch with one tap.`,
  },

  // 8. Java vs Bedrock
  {
    id: "minecraft-java-vs-bedrock-differences",
    locale: "fr",
    date: "2026-04-08",
    title: "Minecraft Java vs Bedrock : quelles différences et lequel choisir ?",
    excerpt:
      "Minecraft existe en deux versions : Java et Bedrock. Performances, serveurs, crossplay, mods — voici tout ce qu'il faut savoir pour choisir.",
    content: `Minecraft existe en deux éditions bien distinctes : Java Edition et Bedrock Edition. Elles partagent le nom, mais diffèrent sur à peu près tout le reste.

Minecraft Java Edition
- PC uniquement (Windows, Mac, Linux).
- Écosystème de mods énorme (Forge, Fabric).
- Communauté historique, gros serveurs Hypixel, techniques avancées.
- Pas de crossplay avec Bedrock.

Minecraft Bedrock Edition
- Multi-plateforme : Windows 10/11, Android, iOS, Xbox, PlayStation, Switch.
- Crossplay intégral entre toutes les plateformes.
- Moteur C++ très optimisé, tourne même sur téléphones modestes.
- Add-ons et resource packs (pas de mods Java).
- Bedrock Marketplace pour du contenu officiel.

Performances
Bedrock est généralement plus fluide et consomme moins que Java, surtout sur mobile et console. Java demande plus de RAM mais reste le roi du modding lourd.

Serveurs
- Java : Hypixel, 2b2t, serveurs techniques.
- Bedrock : Linesia, Cubecraft, Mineville, Lifeboat, The Hive.

Le PvP est-il différent ?
Oui. Le timing des coups, le block-hit, les mécaniques de knockback ne sont pas identiques. Les joueurs PvP pur choisissent souvent Java ; les joueurs cross-platform ou mobile restent sur Bedrock.

Lequel choisir ?
- Tu veux jouer avec des potes sur console ou mobile ? Bedrock.
- Tu veux des mods massifs, du shader fou ? Java.
- Tu joues surtout PvP compétitif pur ? Java historiquement, Bedrock monte fort.
- Tu joues sur plusieurs appareils ? Bedrock, grâce au crossplay.

Où jouer sur Bedrock ?
Linesia est le serveur Minecraft Bedrock FR idéal pour profiter du SkyFaction, du KitFFA et du PvP Faction sur toutes les plateformes. Adresse : play.linesia.net.`,
  },
  {
    id: "minecraft-java-vs-bedrock-differences-en",
    locale: "en",
    date: "2026-04-08",
    title: "Minecraft Java vs Bedrock: what's the difference and which to pick?",
    excerpt:
      "Minecraft comes in two editions: Java and Bedrock. Performance, servers, crossplay, mods — here's everything you need to choose.",
    content: `Minecraft ships in two distinct editions: Java Edition and Bedrock Edition. They share the name, but differ on nearly everything else.

Minecraft Java Edition
- PC only (Windows, Mac, Linux).
- Huge mod ecosystem (Forge, Fabric).
- Historic community, huge servers like Hypixel, advanced tech.
- No crossplay with Bedrock.

Minecraft Bedrock Edition
- Multi-platform: Windows 10/11, Android, iOS, Xbox, PlayStation, Switch.
- Full crossplay between every platform.
- Highly optimized C++ engine, runs even on modest phones.
- Add-ons and resource packs (no Java mods).
- Bedrock Marketplace for official content.

Performance
Bedrock is generally smoother and lighter than Java, especially on mobile and console. Java needs more RAM but remains the king of heavy modding.

Servers
- Java: Hypixel, 2b2t, technical servers.
- Bedrock: Linesia, Cubecraft, Mineville, Lifeboat, The Hive.

Is PvP different?
Yes. Hit timing, block-hit, knockback mechanics aren't identical. Pure PvP players often pick Java; crossplay or mobile players stay on Bedrock.

Which one to pick?
- Playing with friends on console or mobile? Bedrock.
- Want massive mods, insane shaders? Java.
- Mostly competitive PvP? Historically Java, Bedrock catching up.
- Playing across multiple devices? Bedrock, thanks to crossplay.

Where to play on Bedrock?
Linesia is the ideal Minecraft Bedrock server to enjoy SkyFaction, KitFFA and PvP Faction on every platform. Address: play.linesia.net.`,
  },
];

async function main() {
  console.log(`[seed-seo] using DB: ${DATABASE_URL}`);

  await db.execute(`CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'fr'
  )`);

  let inserted = 0;
  let updated = 0;

  for (const a of ARTICLES) {
    const existing = await db.execute({
      sql: "SELECT id FROM articles WHERE id = ?",
      args: [a.id],
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE articles SET title = ?, excerpt = ?, content = ?, date = ?, locale = ? WHERE id = ?",
        args: [a.title, a.excerpt, a.content, a.date, a.locale, a.id],
      });
      updated++;
      console.log(`  ~ updated: ${a.id} [${a.locale}]`);
    } else {
      await db.execute({
        sql: "INSERT INTO articles (id, title, excerpt, content, date, locale) VALUES (?, ?, ?, ?, ?, ?)",
        args: [a.id, a.title, a.excerpt, a.content, a.date, a.locale],
      });
      inserted++;
      console.log(`  + inserted: ${a.id} [${a.locale}]`);
    }
  }

  console.log(`[seed-seo] done. Inserted: ${inserted}, updated: ${updated}, total: ${ARTICLES.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-seo] failed:", err);
  process.exit(1);
});
