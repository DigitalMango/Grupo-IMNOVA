// Script para filtrar propiedades archivadas en todas las páginas públicas
// Este archivo debe ser incluido en todas las páginas que muestren propiedades

// Función para obtener el estado de archivado desde localStorage
function getArchivedState() {
  const saved = localStorage.getItem('archivedProperties');
  return saved ? JSON.parse(saved) : {};
}

// Función para filtrar propiedades y excluir las archivadas
function getFilteredProperties(propertiesObject) {
  const archivedState = getArchivedState();
  const filteredProperties = {};
  
  Object.keys(propertiesObject).forEach(key => {
    if (!archivedState[key]) {
      filteredProperties[key] = propertiesObject[key];
    }
  });
  
  return filteredProperties;
}

// Función para aplicar el filtro a cualquier objeto de propiedades
function applyArchiveFilter(propertiesObject) {
  return getFilteredProperties(propertiesObject);
}

// Oculta tarjetas en el DOM cuyo id esté archivado.
// Busca elementos con onclick="openModal('ID')" y elimina la tarjeta contenedora
function hideArchivedCards() {
  const archivedState = getArchivedState();
  const modalBtns = document.querySelectorAll('[onclick*="openModal(\'"], [onclick*="openModal(\""]');
  modalBtns.forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const match = onclick.match(/openModal\(['"]([^'"]+)['"]\)/);
    if (match) {
      const propId = match[1];
      if (archivedState[propId]) {
        const card = btn.closest('.property-card') || btn.closest('.bg-white');
        if (card && card.parentNode) {
          card.parentNode.removeChild(card);
        }
      }
    }
  });
} 