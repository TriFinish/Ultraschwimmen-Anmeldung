// Eingeschränkter YAML-Parser für anmeldung.yaml. Kein Ersatz für eine
// vollwertige Bibliothek — bewusst klein gehalten, damit die Seite ohne
// Build-Schritt auskommt.

// Minimal parser for the restricted YAML subset used by anmeldung.yaml:
// nested maps, "- key: value" list items, string/bool/number scalars.
// Not a general-purpose YAML parser. Übernommen aus Ultraschwimmen-Info-Site —
// beim Erweitern der YAML auf die Grenzen achten (keine Listen in Listen).
export function parseYamlLite(text) {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    lines.push({ indent: raw.length - raw.trimStart().length, text: trimmed });
  }

  let pos = 0;

  function parseValue(raw) {
    if (raw === '') return undefined;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (/^-?\d+$/.test(raw)) return Number(raw);
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.slice(1, -1);
    }
    return raw;
  }

  function parseBlock(indent) {
    if (pos >= lines.length || lines[pos].indent < indent) return {};
    return lines[pos].text.startsWith('- ') ? parseList(indent) : parseMap(indent);
  }

  function parseList(indent) {
    const arr = [];
    while (pos < lines.length && lines[pos].indent === indent && lines[pos].text.startsWith('- ')) {
      const rest = lines[pos].text.slice(2);
      pos++;
      const item = {};
      const sepIdx = rest.indexOf(':');
      if (sepIdx !== -1) {
        const key = rest.slice(0, sepIdx).trim();
        const valRaw = rest.slice(sepIdx + 1).trim();
        item[key] = valRaw === '' ? parseBlock(indent + 2) : parseValue(valRaw);
      }
      while (pos < lines.length && lines[pos].indent > indent) {
        const subIndent = lines[pos].indent;
        const subLine = lines[pos].text;
        const sIdx = subLine.indexOf(':');
        const key = subLine.slice(0, sIdx).trim();
        const valRaw = subLine.slice(sIdx + 1).trim();
        pos++;
        item[key] = valRaw === '' ? parseBlock(subIndent + 2) : parseValue(valRaw);
      }
      arr.push(item);
    }
    return arr;
  }

  function parseMap(indent) {
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent && !lines[pos].text.startsWith('- ')) {
      const line = lines[pos];
      const sepIdx = line.text.indexOf(':');
      const key = line.text.slice(0, sepIdx).trim();
      const valRaw = line.text.slice(sepIdx + 1).trim();
      pos++;
      obj[key] = valRaw === '' ? parseBlock(indent + 2) : parseValue(valRaw);
    }
    return obj;
  }

  return parseMap(0);
}
