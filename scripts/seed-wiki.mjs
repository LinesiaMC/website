/**
 * Seed wiki.json from the LinesiaMC/wiki-gitbook GitHub repository.
 * Run with: node scripts/seed-wiki.mjs
 */

const REPO = "LinesiaMC/wiki-gitbook";
const BRANCH = "main";
const BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const WIKI_FILE = path.join(DATA_DIR, "wiki.json");

let idCounter = 0;
function makeId() {
  idCounter++;
  return `wiki${idCounter.toString().padStart(3, "0")}`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchFile(filePath) {
  const url = `${BASE}/${filePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    let text = await res.text();
    // Remove GitBook-specific stuff
    text = text.replace(/^---[\s\S]*?---\n*/m, ""); // frontmatter
    text = text.replace(/{% hint style="[^"]*" %}/g, "> ");
    text = text.replace(/{% endhint %}/g, "");
    text = text.replace(/{%.*?%}/g, ""); // other liquid tags
    text = text.replace(/\[([^\]]*)\]\(<([^)]+)>\)/g, "[$1]($2)"); // fix angle bracket links
    // Remove cover/icon lines from gitbook
    text = text.replace(/^coverY:.*$/gm, "");
    text = text.replace(/^cover:.*$/gm, "");
    // Remove first H1 if it matches the title (we show title separately)
    text = text.replace(/^#\s+.+\n+/, "");
    return text.trim();
  } catch {
    return "";
  }
}

// Define the full wiki structure based on SUMMARY.md
const WIKI_STRUCTURE = [
  {
    title: "Informations generales",
    icon: "📋",
    slug: "informations-generales",
    file: "informations-generales/README.md",
    children: [
      { title: "Reglement In-Game", icon: "📜", file: "informations-generales/reglement-in-game.md" },
      { title: "Reglement Discord", icon: "💬", file: "informations-generales/reglement-discord.md" },
      { title: "Questions recurrentes", icon: "❓", file: "informations-generales/questions-recurrentes.md" },
      { title: "Discord", icon: "🎮", file: "informations-generales/discord.md" },
      { title: "Fonctionnalites Bot Discord", icon: "🤖", file: "informations-generales/fonctionnalites-bot-discord.md" },
      {
        title: "Tutoriels", icon: "📚", file: "informations-generales/tutoriels/README.md",
        children: [
          { title: "Comment rejoindre Linesia", icon: "🔗", file: "informations-generales/tutoriels/comment-rejoindre-mineberry.md" },
          { title: "Comment voter pour Linesia", icon: "🗳️", file: "informations-generales/tutoriels/comment-voter-pour-mineberry.md" },
          { title: "Grade Soutien Discord", icon: "🏅", file: "informations-generales/tutoriels/comment-avoir-le-grade-soutien-sur-discord.md" },
          { title: "Pack de texture personnalise", icon: "🎨", file: "informations-generales/tutoriels/comment-faire-un-pack-de-texture-personnalise-de-linesia.md" },
          { title: "Devenir influenceur", icon: "📹", file: "informations-generales/tutoriels/comment-devenir-influenceur-sur-linesia.md" },
        ],
      },
    ],
  },
  {
    title: "Gameplay - General",
    icon: "⚔️",
    slug: "gameplay-general",
    file: null,
    children: [
      { title: "Bien debuter", icon: "🌟", file: "gameplay-general/bien-debuter.md" },
      { title: "Les prestiges", icon: "🏆", file: "gameplay-general/les-prestiges.md" },
      { title: "Les zones", icon: "🗺️", file: "gameplay-general/les-zones.md" },
      { title: "Zone Farm", icon: "🌾", file: "gameplay-general/zone-farm.md" },
      { title: "Zone Mine", icon: "⛏️", file: "gameplay-general/zone-mine.md" },
      { title: "Zone Combat", icon: "🗡️", file: "gameplay-general/zone-combat.md" },
      { title: "Zone Peche", icon: "🎣", file: "gameplay-general/zone-fish.md" },
      { title: "Dimension Glace", icon: "❄️", file: "gameplay-general/dimension-glace.md" },
      { title: "Dimension Feu", icon: "🔥", file: "gameplay-general/dimension-feu.md" },
      { title: "Decoration", icon: "🏗️", file: "gameplay-general/decoration.md" },
      { title: "Bases", icon: "🏰", file: "gameplay-general/bases.md" },
      { title: "Raid Faction", icon: "💥", file: "gameplay-general/raid-faction.md" },
      { title: "Quetes Faction", icon: "📋", file: "gameplay-general/quetes-faction.md" },
      { title: "PvP", icon: "⚔️", file: "gameplay-general/pvp.md" },
      {
        title: "Spawners", icon: "🧟", file: "gameplay-general/spawners/README.md",
        children: [
          { title: "Zombies", icon: "🧟", file: "gameplay-general/spawners/zombies.md" },
          { title: "Pigmen", icon: "🐷", file: "gameplay-general/spawners/pigmen.md" },
          { title: "Wither Squelettes", icon: "💀", file: "gameplay-general/spawners/wither-squelettes.md" },
        ],
      },
    ],
  },
  {
    title: "Gameplay - Objets",
    icon: "🎒",
    slug: "gameplay-objets",
    file: null,
    children: [
      {
        title: "Armures", icon: "🛡️", file: "gameplay-objets/armures/README.md",
        children: [
          { title: "Amethyste", icon: "💜", file: "gameplay-objets/armures/amethyste.md" },
          { title: "Rubis", icon: "❤️", file: "gameplay-objets/armures/rubis.md" },
          { title: "Onyx", icon: "🖤", file: "gameplay-objets/armures/onyx.md" },
          { title: "Farm", icon: "🌾", file: "gameplay-objets/armures/farm.md" },
          { title: "Glace", icon: "❄️", file: "gameplay-objets/armures/glace.md" },
          { title: "Feu", icon: "🔥", file: "gameplay-objets/armures/feu.md" },
        ],
      },
      {
        title: "Epees", icon: "🗡️", file: "gameplay-objets/epees/README.md",
        children: [
          { title: "Epee en Amethyste", icon: "💜", file: "gameplay-objets/epees/epee-en-amethyste.md" },
          { title: "Epee en Rubis", icon: "❤️", file: "gameplay-objets/epees/epee-en-rubis.md" },
          { title: "Epee en Onyx", icon: "🖤", file: "gameplay-objets/epees/epee-en-onyx.md" },
        ],
      },
      {
        title: "Minerais", icon: "💎", file: "gameplay-objets/minerais/README.md",
        children: [
          { title: "Amethyste", icon: "💜", file: "gameplay-objets/minerais/amethyste.md" },
          { title: "Rubis", icon: "❤️", file: "gameplay-objets/minerais/rubis.md" },
          { title: "Onyx", icon: "🖤", file: "gameplay-objets/minerais/onyx.md" },
          { title: "Glace", icon: "❄️", file: "gameplay-objets/minerais/glace.md" },
          { title: "Lingot Volcanique", icon: "🌋", file: "gameplay-objets/minerais/lingot_volcanique.md" },
        ],
      },
      {
        title: "Sticks", icon: "🪄", file: "gameplay-objets/sticks/README.md",
        children: [
          { title: "Freeze", icon: "🥶", file: "gameplay-objets/sticks/freeze.md" },
          { title: "Anti-Perle", icon: "🚫", file: "gameplay-objets/sticks/anti-perle.md" },
          { title: "Anti-Item", icon: "🚫", file: "gameplay-objets/sticks/anti-item.md" },
          { title: "Anti-Build", icon: "🚫", file: "gameplay-objets/sticks/anti-build.md" },
          { title: "Anti-Back", icon: "🚫", file: "gameplay-objets/sticks/anti-back.md" },
          { title: "Teleportation", icon: "✨", file: "gameplay-objets/sticks/teleportation.md" },
          { title: "View Vision", icon: "👁️", file: "gameplay-objets/sticks/view-vision.md" },
          { title: "Size", icon: "🔍", file: "gameplay-objets/sticks/size.md" },
          { title: "Effect", icon: "💫", file: "gameplay-objets/sticks/effect.md" },
          { title: "Stick of the God", icon: "⚡", file: "gameplay-objets/sticks/stick-of-the-god.md" },
          { title: "Repair", icon: "🔧", file: "gameplay-objets/sticks/repair.md" },
          { title: "Foudre", icon: "⚡", file: "gameplay-objets/sticks/foudre.md" },
        ],
      },
      {
        title: "Outils", icon: "🔨", file: "gameplay-objets/outils/README.md",
        children: [
          {
            title: "Amethyste", icon: "💜", file: "gameplay-objets/outils/amethyste/README.md",
            children: [
              { title: "Pelle en Amethyste", icon: "🪏", file: "gameplay-objets/outils/amethyste/pelle-en-amethyste.md" },
              { title: "Hache en Amethyste", icon: "🪓", file: "gameplay-objets/outils/amethyste/hache-en-amethyste.md" },
              { title: "Pioche en Amethyste", icon: "⛏️", file: "gameplay-objets/outils/amethyste/pioche-en-amethyste.md" },
              { title: "Houe en Amethyste", icon: "🌾", file: "gameplay-objets/outils/amethyste/houe-en-amethyste.md" },
            ],
          },
          {
            title: "Rubis", icon: "❤️", file: "gameplay-objets/outils/rubis/README.md",
            children: [
              { title: "Pelle en Rubis", icon: "🪏", file: "gameplay-objets/outils/rubis/pelle-en-rubis.md" },
              { title: "Hache en Rubis", icon: "🪓", file: "gameplay-objets/outils/rubis/hache-en-rubis.md" },
              { title: "Pioche en Rubis", icon: "⛏️", file: "gameplay-objets/outils/rubis/pioche-en-rubis.md" },
              { title: "Houe en Rubis", icon: "🌾", file: "gameplay-objets/outils/rubis/houe-en-rubis.md" },
            ],
          },
          {
            title: "Onyx", icon: "🖤", file: "gameplay-objets/outils/onyx/README.md",
            children: [
              { title: "Pelle en Onyx", icon: "🪏", file: "gameplay-objets/outils/onyx/pelle-en-onyx.md" },
              { title: "Hache en Onyx", icon: "🪓", file: "gameplay-objets/outils/onyx/hache-en-onyx.md" },
              { title: "Pioche en Onyx", icon: "⛏️", file: "gameplay-objets/outils/onyx/pioche-en-onyx.md" },
              { title: "Houe en Onyx", icon: "🌾", file: "gameplay-objets/outils/onyx/houe-en-onyx.md" },
            ],
          },
        ],
      },
      {
        title: "Objets Speciaux", icon: "✨", file: "gameplay-objets/objets-speciaux/README.md",
        children: [
          { title: "SwitchBall", icon: "🔄", file: "gameplay-objets/objets-speciaux/switchball.md" },
          { title: "EggTrap", icon: "🥚", file: "gameplay-objets/objets-speciaux/eggtrap.md" },
          { title: "Bump", icon: "⬆️", file: "gameplay-objets/objets-speciaux/bump.md" },
          { title: "Glider", icon: "🪂", file: "gameplay-objets/objets-speciaux/glider.md" },
          { title: "Grappin", icon: "🪝", file: "gameplay-objets/objets-speciaux/grappin.md" },
          { title: "Chorus", icon: "🟣", file: "gameplay-objets/objets-speciaux/chorus.md" },
          { title: "Dynamite", icon: "💣", file: "gameplay-objets/objets-speciaux/dynamite.md" },
        ],
      },
      {
        title: "Blocs Speciaux", icon: "🧱", file: "gameplay-objets/blocs-speciaux/README.md",
        children: [
          { title: "Bloc Anti-Pearl", icon: "🚫", file: "gameplay-objets/blocs-speciaux/bloc-anti-pearl.md" },
          { title: "Elevateur", icon: "⬆️", file: "gameplay-objets/blocs-speciaux/elevateur.md" },
          { title: "Terre Enrichie", icon: "🌱", file: "gameplay-objets/blocs-speciaux/terre-enrichies.md" },
          { title: "Monolith", icon: "🗿", file: "gameplay-objets/blocs-speciaux/monolith.md" },
        ],
      },
    ],
  },
  {
    title: "Economie",
    icon: "💰",
    slug: "economie",
    file: null,
    children: [
      { title: "Argent en jeu", icon: "💵", file: "economie/argent-en-jeu.md" },
    ],
  },
  {
    title: "Personnalisation",
    icon: "🎨",
    slug: "personnalisation",
    file: null,
    children: [
      { title: "Cosmetiques", icon: "✨", file: "personnalisation/cosmetiques.md" },
    ],
  },
  {
    title: "Les Commandes",
    icon: "⌨️",
    slug: "les-commandes",
    file: null,
    children: [
      { title: "Faction", icon: "🏴", file: "les-commandes/faction.md" },
      { title: "Statistiques", icon: "📊", file: "les-commandes/statistiques.md" },
      { title: "Cooldown", icon: "⏱️", file: "les-commandes/cooldown.md" },
      { title: "Classements", icon: "🏅", file: "les-commandes/classements.md" },
      { title: "Shop", icon: "🛒", file: "les-commandes/shop.md" },
      { title: "Hotel de Vente", icon: "🏪", file: "les-commandes/hotel-de-vente.md" },
      { title: "Profil", icon: "👤", file: "les-commandes/profil.md" },
      { title: "Parametres", icon: "⚙️", file: "les-commandes/parametres-en-jeu.md" },
      { title: "Warzone", icon: "☠️", file: "les-commandes/warzone.md" },
      { title: "Trade Cosmetique", icon: "🔄", file: "les-commandes/trade-cosmetique.md" },
    ],
  },
  {
    title: "Evenements",
    icon: "🎉",
    slug: "evenements",
    file: null,
    children: [
      { title: "Outpost", icon: "🏰", file: "evenements/outpost.md" },
      { title: "Domination", icon: "🗺️", file: "evenements/domination.md" },
      { title: "Nexus", icon: "🐉", file: "evenements/nexus.md" },
      { title: "Totem", icon: "🗿", file: "evenements/totem.md" },
      { title: "AFK Money", icon: "💤", file: "evenements/afk-money.md" },
      { title: "Chest Refill", icon: "📦", file: "evenements/chest-refill.md" },
      { title: "Purification", icon: "💎", file: "evenements/purification.md" },
    ],
  },
  {
    title: "Les Boxs",
    icon: "📦",
    slug: "les-boxs",
    file: null,
    children: [
      { title: "Box Commune", icon: "📦", file: "les-boxs/box-commune.md" },
      { title: "Box Farm", icon: "🌾", file: "les-boxs/box-farm.md" },
      { title: "Box Glace", icon: "❄️", file: "les-boxs/box-glace.md" },
      { title: "Box Feu", icon: "🔥", file: "les-boxs/box-feu.md" },
      { title: "Box Legendaire", icon: "⭐", file: "les-boxs/box-legendaire.md" },
      { title: "Pocket Box", icon: "🎁", file: "les-boxs/pocket-box.md" },
    ],
  },
  {
    title: "Les Grades",
    icon: "👑",
    slug: "les-grades",
    file: null,
    children: [
      { title: "Grade Premium", icon: "💎", file: "gameplay-les-grades/grade-premium.md" },
      { title: "Grade Elite", icon: "👑", file: "gameplay-les-grades/grade-elite.md" },
    ],
  },
];

async function processNode(node, parentId, order) {
  const id = makeId();
  const slug = node.slug || slugify(node.title);
  const content = node.file ? await fetchFile(node.file) : "";

  const page = {
    id,
    slug,
    title: node.title,
    content,
    icon: node.icon || "",
    parentId,
    order,
  };

  const pages = [page];

  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const childPages = await processNode(node.children[i], id, i);
      pages.push(...childPages);
    }
  }

  return pages;
}

async function main() {
  console.log("Fetching wiki content from GitHub...");

  const allPages = [];
  for (let i = 0; i < WIKI_STRUCTURE.length; i++) {
    console.log(`Processing: ${WIKI_STRUCTURE[i].title}...`);
    const pages = await processNode(WIKI_STRUCTURE[i], null, i);
    allPages.push(...pages);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(WIKI_FILE, JSON.stringify(allPages, null, 2));
  console.log(`\nDone! ${allPages.length} pages saved to ${WIKI_FILE}`);
}

main().catch(console.error);
