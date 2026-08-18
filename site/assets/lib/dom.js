// Kleine DOM-Helfer, die überall gebraucht werden.

// --- Hilfen -----------------------------------------------------------------
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function fromTemplate(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

export function formatEuro(value) {
  return `${Number(value).toLocaleString('de-DE')} €`;
}
