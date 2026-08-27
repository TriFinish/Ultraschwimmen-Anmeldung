// Navigation: aus der Konfiguration in site.yaml plus dem aktuellen Pfad wird
// eine fertig ausgezeichnete Menüstruktur.
//
// Bewusst eine reine Funktion ohne DOM und ohne Astro-Import. Die Frage „ist
// dieser Eintrag gerade aktiv?" ist die einzige Stelle mit echter Logik im
// Kopfbereich — und die soll man testen können, ohne eine Seite zu rendern.

import type { NavItem } from '../data/schema.js';

export interface ResolvedLeaf {
  label: string;
  href: string;
  isActive: boolean;
}

export interface ResolvedGroup {
  label: string;
  children: ResolvedLeaf[];
  isActive: boolean;
}

export type ResolvedNavItem = ResolvedLeaf | ResolvedGroup;

export function isGroup(item: ResolvedNavItem): item is ResolvedGroup {
  return 'children' in item;
}

/**
 * Bringt einen Pfad auf die eine Form, in der sich Pfade vergleichen lassen:
 * klein, mit führendem und schließendem Schrägstrich, ohne Query und Fragment.
 *
 * Nötig, weil derselbe Ort auf vier Arten hereinkommt: `/zeitplan` aus einem
 * handgeschriebenen Link, `/zeitplan/` aus dem Build, `/Zeitplan/` aus einer
 * alten Verlinkung und `/anmeldung/?regname=…` aus dem Anmeldetrichter.
 */
export function normalizePath(path: string): string {
  const withoutSuffix = path.split(/[?#]/)[0] ?? '';
  const lower = withoutSuffix.toLowerCase();
  const withLeading = lower.startsWith('/') ? lower : `/${lower}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/**
 * Aktiv ist ein Eintrag auf seiner eigenen Seite und auf allem, was darunter
 * liegt: `/aktuelles/` bleibt markiert, während man einen Beitrag liest.
 *
 * Die Startseite ist die Ausnahme. Ihr `href` ist `/` und wäre damit Präfix
 * von allem — sie zählt nur bei exakter Übereinstimmung.
 */
export function isActiveHref(href: string, pathname: string): boolean {
  const target = normalizePath(href);
  const current = normalizePath(pathname);
  if (target === '/') return current === '/';
  return current === target || current.startsWith(target);
}

export function resolveNav(items: NavItem[], pathname: string): ResolvedNavItem[] {
  return items.map((item) => {
    if ('href' in item) {
      return { label: item.label, href: item.href, isActive: isActiveHref(item.href, pathname) };
    }

    const children = item.children.map((child) => ({
      label: child.label,
      href: child.href,
      isActive: isActiveHref(child.href, pathname),
    }));

    // Eine Gruppe hat selbst kein Ziel. Sie ist genau dann markiert, wenn man
    // sich in einem ihrer Einträge befindet.
    return { label: item.label, children, isActive: children.some((c) => c.isActive) };
  });
}
