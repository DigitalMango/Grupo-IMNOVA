// Script utilitario para archivado/ediciones en páginas públicas
// Incluye: sincronización con Firestore (si está disponible), localStorage como fallback

// Claves de almacenamiento local
const ARCHIVED_KEY = 'archivedProperties';
const OVERRIDES_KEY = 'propertyOverrides';

// Obtiene y guarda archivados en localStorage
function getArchivedState() {
  try {
    const saved = localStorage.getItem(ARCHIVED_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (_) {
    return {};
  }
}

function setArchivedStateLocal(state) {
  try {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(state || {}));
  } catch (_) {}
}

// Overrides (cambios de título/precio/ubicación, etc.)
function getOverrides() {
  try {
    const saved = localStorage.getItem(OVERRIDES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (_) {
    return {};
  }
}

function setOverridesLocal(overrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides || {}));
  } catch (_) {}
}

// Lee estados desde Firestore si está disponible (Firebase v8 global)
async function fetchRemoteArchivedFlags() {
  try {
    if (typeof firebase === 'undefined' || !firebase.firestore) return null;
    const db = firebase.firestore();
    const doc = await db.collection('config').doc('archived').get();
    const data = doc.exists ? doc.data() : null;
    return data && data.flags ? data.flags : null;
  } catch (_) {
    return null;
  }
}

async function fetchRemoteOverrides() {
  try {
    if (typeof firebase === 'undefined' || !firebase.firestore) return null;
    const db = firebase.firestore();
    const doc = await db.collection('config').doc('overrides').get();
    const data = doc.exists ? doc.data() : null;
    return data && data.data ? data.data : null;
  } catch (_) {
    return null;
  }
}

// Sincroniza estados remotos a localStorage. Retorna { flags, overrides }
async function syncRemoteState() {
  const [flags, overrides] = await Promise.all([
    fetchRemoteArchivedFlags(),
    fetchRemoteOverrides()
  ]);
  if (flags && typeof flags === 'object') setArchivedStateLocal(flags);
  if (overrides && typeof overrides === 'object') setOverridesLocal(overrides);
  return { flags: getArchivedState(), overrides: getOverrides() };
}

// Filtra propiedades (objeto id -> propiedad) usando archivados
function getFilteredProperties(propertiesObject) {
  const archivedState = getArchivedState();
  const filteredProperties = {};
  Object.keys(propertiesObject || {}).forEach(key => {
    if (!archivedState[key]) {
      filteredProperties[key] = propertiesObject[key];
    }
  });
  return filteredProperties;
}

function applyArchiveFilter(propertiesObject) {
  return getFilteredProperties(propertiesObject);
}

// Aplica overrides a un objeto de propiedades por id (mutación in-place)
function applyOverridesToObject(propertiesById, overrides) {
  const ov = overrides || getOverrides();
  if (!propertiesById || !ov) return propertiesById;
  Object.keys(ov).forEach(id => {
    if (propertiesById[id]) {
      propertiesById[id] = { ...propertiesById[id], ...ov[id] };
    }
  });
  return propertiesById;
}

// Aplica overrides a un arreglo de propiedades (mutación in-place)
function applyOverridesToArray(propertiesArray, overrides) {
  const ov = overrides || getOverrides();
  if (!Array.isArray(propertiesArray) || !ov) return propertiesArray;
  propertiesArray.forEach((p, idx) => {
    const o = ov[p.id];
    if (o) propertiesArray[idx] = { ...p, ...o };
  });
  return propertiesArray;
}

// Intenta actualizar los textos visibles en tarjetas estáticas basadas en overrides y el botón openModal('id')
function applyOverridesToStaticCards() {
  const ov = getOverrides();
  if (!ov || Object.keys(ov).length === 0) return;
  // Etiquetar tarjetas primero
  tagCardsWithPropId();
  const cards = document.querySelectorAll('[data-prop-id]');
  cards.forEach(card => {
    const id = card.getAttribute('data-prop-id');
    const override = ov[id];
    if (!override) return;
    // Título
    if (override.title) {
      const titleEl = card.querySelector('h3, .card-title, .title');
      if (titleEl) titleEl.textContent = override.title;
    }
    // Precio (priceDisplay o price)
    const priceText = override.priceDisplay || override.price;
    if (priceText) {
      // Buscar elementos que ya parezcan precio o etiquetas con $ al inicio
      const candidates = card.querySelectorAll('[data-price], .price, .card-price, p, span, div');
      for (const el of candidates) {
        const t = (el.textContent || '').trim();
        if (t.startsWith('$')) {
          el.textContent = priceText;
          break;
        }
      }
    }
  });
}

// Oculta tarjetas en el DOM cuyo id esté archivado
function hideArchivedCards() {
  const archivedState = getArchivedState();
  // Etiquetar tarjetas primero para que sean detectables
  tagCardsWithPropId();
  const allCards = document.querySelectorAll('[data-prop-id]');
  allCards.forEach(node => {
    const id = node.getAttribute('data-prop-id');
    if (archivedState[id]) {
      const outer = node.closest('.property-card') || node;
      outer.remove();
    }
  });
}

// Asegura que cada tarjeta estática tenga data-prop-id leyendo el onclick de su botón
function tagCardsWithPropId() {
  // Selecciona elementos con atributo onclick y filtra por los que llaman a openModal('id')
  const withOnclick = document.querySelectorAll('[onclick]');
  withOnclick.forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const match = onclick.match(/openModal\(['"]([^'"]+)['"]\)/);
    if (!match) return;
    const id = match[1];
    // Buscar contenedor principal .property-card
    let card = btn.closest('.property-card');
    if (!card) {
      // Subir manualmente algunos niveles para encontrar la tarjeta real
      let current = btn;
      for (let i = 0; i < 6 && current && !card; i++) {
        current = current.parentElement;
        if (!current) break;
        if (current.classList && current.classList.contains('property-card')) {
          card = current;
          break;
        }
      }
    }
    // Si no se detecta, usa el ancestro más grande disponible
    if (!card) card = btn.closest('[class*="rounded"], [class*="shadow"], [class*="overflow"]') || btn.parentElement;
    if (card && !card.hasAttribute('data-prop-id')) card.setAttribute('data-prop-id', id);
  });
}

// Exporta funciones en window para uso desde las páginas
window.getArchivedState = getArchivedState;
window.applyArchiveFilter = applyArchiveFilter;
window.hideArchivedCards = hideArchivedCards;
window.syncRemoteState = syncRemoteState;
window.applyOverridesToObject = applyOverridesToObject;
window.applyOverridesToArray = applyOverridesToArray;
window.applyOverridesToStaticCards = applyOverridesToStaticCards;
window.tagCardsWithPropId = tagCardsWithPropId;

// ====== Propiedades remotas (creadas desde el Dashboard) ======
async function fetchRemoteProperties() {
  try {
    if (typeof firebase === 'undefined' || !firebase.firestore) return [];
    const db = firebase.firestore();
    const snap = await db.collection('properties').get();
    const list = [];
    snap.forEach(doc => {
      const p = doc.data();
      if (p && p.id) list.push(p);
    });
    return list;
  } catch (_) {
    return [];
  }
}

function mergeRemoteIntoArray(localArray, remoteArray) {
  if (!Array.isArray(localArray) || !Array.isArray(remoteArray)) return localArray || [];
  const seen = new Set(localArray.map(p => p.id));
  remoteArray.forEach(p => { if (p && p.id && !seen.has(p.id)) localArray.push(p); });
  return localArray;
}

window.fetchRemoteProperties = fetchRemoteProperties;
window.mergeRemoteIntoArray = mergeRemoteIntoArray;

// Ejecución proactiva para páginas estáticas: intenta ocultar/actualizar varias veces al cargar
(function bootstrapStaticSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const run = () => {
    try {
      tagCardsWithPropId();
      hideArchivedCards();
      applyOverridesToStaticCards();
    } catch (_) {}
  };
  document.addEventListener('DOMContentLoaded', () => {
    run();
    setTimeout(run, 400);
    setTimeout(run, 1200);
  });
})();