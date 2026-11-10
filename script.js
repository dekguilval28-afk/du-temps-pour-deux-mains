// ===== À REMPLIR : deux valeurs de votre projet Supabase (Project Settings > API) =====
const SUPABASE_URL = "https://lusozvruydiqtybrrfvn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1c296dnJ1eWRpcXR5YnJyZnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzYzNzMsImV4cCI6MjEwOTAxMjM3M30.gbc6PsqZGLanmoO6rwomE3oOxpRwwcYj38EPPgE3hek";
// ================================================================================

const ALLOWED_TOWNS = ["Blévy", "Maillebois", "Dampierre-sur-Blévy"];

const grid = document.getElementById("listingGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const typeFilter = document.getElementById("typeFilter");
const form = document.getElementById("listingForm");
const feedback = document.getElementById("formFeedback");

if (!window.supabase) {
  feedback.textContent = "Le module de connexion n'a pas pu se charger (vérifiez votre antivirus).";
}
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Mémoire de cet appareil uniquement
const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } },
  write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
};
const KEY_DEMANDES = "dtpdm-mes-demandes"; // annonceId -> { demandeId, token }
const KEY_MINE = "dtpdm-mes-annonces";     // annonceId -> true (annonces publiées sur cet appareil)
let mesDemandes = store.read(KEY_DEMANDES);
let mesAnnonces = store.read(KEY_MINE);

let annonces = [];
let statuts = {};

async function loadAnnonces() {
  if (!sb) return;
  const { data, error } = await sb.from("annonces")
    .select("id,type,categorie,titre,description,commune,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    feedback.textContent = "Impossible de charger les annonces. Vérifiez la configuration Supabase.";
    return;
  }
  annonces = data || [];
  await Promise.all(Object.entries(mesDemandes).map(async ([id, d]) => {
    const { data: s } = await sb.rpc("statut_demande", { p_demande: d.demandeId, p_token: d.token });
    if (s) statuts[id] = s;
  }));
  renderListings();
}

function pill(acceptee) {
  const span = document.createElement("span");
  span.className = `status ${acceptee ? "green" : "red"}`;
  span.textContent = acceptee ? "● Acceptée" : "● En attente";
  return span;
}

function renderListings() {
  const query = searchInput.value.trim().toLocaleLowerCase("fr");
  const category = categoryFilter.value;
  const type = typeFilter.value;
  const filtered = annonces.filter(item => {
    const text = `${item.titre} ${item.description} ${item.commune} ${item.categorie}`.toLocaleLowerCase("fr");
    return (!query || text.includes(query)) && (!category || item.categorie === category) && (!type || item.type === type);
  });

  grid.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune annonce pour le moment.";
    grid.append(empty);
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "listing-card";

    const tag = document.createElement("span");
    tag.className = `tag ${item.type === "need" ? "need" : ""}`;
    tag.textContent = item.type === "need" ? "J'AI BESOIN" : "JE PROPOSE";
    const title = document.createElement("h3");
    title.textContent = item.titre;
    const description = document.createElement("p");
    description.textContent = item.description;
    const meta = document.createElement("div");
    meta.className = "listing-meta";
    meta.textContent = `${item.categorie} · ${item.commune}`;

    const action = document.createElement("div");
    action.className = "listing-action";
    const zone = document.createElement("div");
    zone.className = "demandes-zone";

    if (mesAnnonces[item.id]) {
      const btn = document.createElement("button");
      btn.className = "button button-light small";
      btn.type = "button";
      btn.textContent = "Gérer les demandes (mon code)";
      btn.addEventListener("click", () => gererDemandes(item.id, zone));
      action.append(btn);
    } else if (mesDemandes[item.id]) {
      action.append(pill(statuts[item.id] === "acceptee"));
    } else {
      const btn = document.createElement("button");
      btn.className = "button button-light small";
      btn.type = "button";
      btn.textContent = "Demander à participer";
      btn.addEventListener("click", () => demander(item.id));
      action.append(btn);
    }

    const del = document.createElement("button");
    del.className = "link-btn";
    del.type = "button";
    del.textContent = "Retirer mon annonce";
    del.addEventListener("click", () => supprimer(item.id));
    action.append(del);

    card.append(tag, title, description, meta, action, zone);
    grid.append(card);
  });
}

async function demander(annonceId) {
  if (!sb) return;
  const { data, error } = await sb.rpc("demander_participation", { p_annonce: annonceId });
  if (error || !data?.length) {
    feedback.textContent = "La demande n'a pas pu être envoyée. Réessayez.";
    return;
  }
  mesDemandes[annonceId] = { demandeId: data[0].demande_id, token: data[0].token };
  store.write(KEY_DEMANDES, mesDemandes);
  statuts[annonceId] = "en_attente";
  renderListings();
}

async function gererDemandes(annonceId, zone) {
  const code = prompt("Entrez le code de votre annonce (5 chiffres) :");
  if (!code) return;
  const { data, error } = await sb.rpc("demandes_pour_auteur", { p_annonce: annonceId, p_code: code });
  zone.replaceChildren();
  if (error) {
    zone.textContent = "Code incorrect.";
    return;
  }
  if (!data?.length) {
    const p = document.createElement("p");
    p.className = "listing-meta";
    p.textContent = "Aucune demande pour le moment.";
    zone.append(p);
    return;
  }
  data.forEach(d => {
    const row = document.createElement("div");
    row.className = "demande-row";
    const acceptee = d.statut === "acceptee";
    row.append(pill(acceptee));
    if (!acceptee) {
      const btn = document.createElement("button");
      btn.className = "link-btn";
      btn.type = "button";
      btn.textContent = "Accepter";
      btn.addEventListener("click", async () => {
        await sb.rpc("accepter_demande", { p_demande: d.demande_id, p_code: code });
        gererDemandes(annonceId, zone);
      });
      row.append(btn);
    }
    zone.append(row);
  });
}

async function supprimer(annonceId) {
  const code = prompt("Entrez le code de votre annonce pour la retirer (5 chiffres) :");
  if (!code) return;
  const { data, error } = await sb.rpc("supprimer_annonce", { p_annonce: annonceId, p_code: code });
  if (error || !data) {
    feedback.textContent = "Code incorrect : l'annonce n'a pas été retirée.";
    return;
  }
  delete mesAnnonces[annonceId];
  store.write(KEY_MINE, mesAnnonces);
  feedback.textContent = "Votre annonce a été retirée.";
  await loadAnnonces();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!sb) return;
  const code = document.getElementById("listingCode").value.trim();
  const town = document.getElementById("listingTown").value;
  const title = document.getElementById("listingTitle").value.trim();
  const description = document.getElementById("listingDescription").value.trim();

  if (!/^\d{5}$/.test(code)) {
    feedback.textContent = "Le code doit contenir exactement 5 chiffres.";
    return;
  }
  if (!ALLOWED_TOWNS.includes(town) || !title || !description) {
    feedback.textContent = "Merci de compléter tous les champs avec une commune de la liste.";
    return;
  }

  const { data, error } = await sb.rpc("publier_annonce", {
    p_code: code,
    p_type: document.getElementById("listingType").value,
    p_categorie: document.getElementById("listingCategory").value,
    p_titre: title,
    p_commune: town,
    p_description: description
  });

  if (error) {
    feedback.textContent = "L'annonce n'a pas pu être publiée. Vérifiez les champs et réessayez.";
    return;
  }

  mesAnnonces[data] = true;
  store.write(KEY_MINE, mesAnnonces);
  form.reset();
  feedback.textContent = "Annonce publiée. Gardez bien votre code à 5 chiffres : il vous servira à gérer les demandes.";
  await loadAnnonces();
  document.getElementById("annonces").scrollIntoView({ behavior: "smooth" });
});

[searchInput, categoryFilter, typeFilter].forEach(el => el.addEventListener("input", renderListings));

const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const opened = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(opened));
});
nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  nav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}));
document.getElementById("year").textContent = new Date().getFullYear();

loadAnnonces();

