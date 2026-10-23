# Luumo — Design System (MASTER)

> Source de vérité visuelle pour **Luumo Web** (Next.js) et **Luumo Mobile** (Expo).
> Construite directement à partir du **logo officiel LUUMO** (Vert Pin Profond `#115040`, Or Solaire `#F3BC33` et Ambre Chaud `#E8A02B` sur fond clair épuré).

## 1. Identité issue du Logo LUUMO

Le logo LUUMO repose sur trois éléments graphiques :
1. **La typographie géométrique vert pin profond (`#115040`)** : inspire la stabilité, la rigueur financière et la croissance.
2. **L'onde dorée et ambrée au pied du `L` (`#F3BC33` → `#E8A02B`)** : apporte chaleur, fluidité et dynamisme commercial.
3. **Le cœur solaire doré au centre du `O` (`#F3BC33`)** : point focal lumineux sur fond blanc pur.

*Aucune bande tricolore (rouge/jaune/vert) n'est utilisée : l'interface adopte exclusivement le duo **Vert Pin `#115040` + Or/Ambre `#F3BC33`–`#E8A02B`** sur des surfaces claires et lumineuses.*

## 2. Palette de Couleurs

| Rôle | Hex | Usage |
|---|---|---|
| `primary` (Vert Luumo) | `#115040` | Couleur exacte du lettrage LUUMO. Actions principales, navigation active, montants clés. |
| `primary-strong` | `#0B382C` | Sidebar profonde, états hover/pressed. |
| `primary-soft` | `#E8F2EE` | Fond de pastilles d'icônes, badges « Payé / En stock », surbrillance douce. |
| `gold` (Or Solaire du `O`) | `#F3BC33` | Accent signature du logo : CTA « Encaisser », point focal, barres du jour. |
| `amber` (Onde du `L`) | `#E8A02B` | Dégradé chaud avec `gold` (`linear-gradient(135deg, #F3BC33, #E8A02B)`). |
| `gold-soft` | `#FEF6DF` | Fonds de cartes d'accent, badges « Partiel / Stock bas ». |
| `gold-text` | `#8F5E00` | Texte ambré foncé sur fond clair (contraste WCAG AA > 5:1). |
| `alert` (Ambre Terracotta) | `#C2410C` | Créances (dettes clients) et ruptures de stock — harmonisé avec l'onde orangée du `L`. |
| `alert-soft` | `#FFEDD5` | Fond des badges d'alerte et dettes. |
| `bg` (Albâtre Sauge) | `#F7F9F8` | Fond général d'application, lumineux et reposant. |
| `card` | `#FFFFFF` | Cartes, tables, modales (comme le fond blanc du logo). |
| `border` | `#DCE5E1` | Bordures fines 1px teintées sauge. |
| `muted` | `#EEF3F1` | Fonds secondaires, champs de saisie, lignes au survol. |
| `text` | `#0B2920` | Texte principal (contraste > 14:1). |
| `text-muted` | `#526B63` | Texte secondaire et libellés. |

## 3. Typographie

- **Titres, wordmark & chiffres clés :** `Outfit` 600–700, `letter-spacing: -0.02em` (proche du dessin géométrique de `LUUMO`).
- **Texte & tables :** `Rubik` 400–500.
- **Montants :** `font-variant-numeric: tabular-nums` partout, format `1 250 000 GNF` (0 décimale).

## 4. Signature graphique & Composants

- **Logo officiel :** Fichiers `/luumo-logo.png` (fond clair) et `/luumo-logo-white.png` (sur fond `#0B382C`).
- **Filet d'accent Luumo (`BrandAccentBar`) :** Fine ligne dégradée `linear-gradient(90deg, #115040 0%, #F3BC33 65%, #E8A02B 100%)` rappelant la transition du `L` vers son onde dorée.
- **Bouton d'encaissement signature :** Dégradé solaire `#F3BC33 → #E8A02B` avec texte `#0B2920` en gras.
