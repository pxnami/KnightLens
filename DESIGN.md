---
name: KnightLens
description: A bilingual chess review workbench following the approved Chess.com reference.
colors:
  primary: "#81b64c"
  background: "#302e2b"
  surface: "#262522"
  heading-surface: "#22211e"
  text: "#c3c2c1"
  muted: "#aaa7a2"
  line: "#3d3b38"
  white: "#ffffff"
  board-light: "#cee3ed"
  board-coordinate: "#184e79"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontWeight: 400
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontWeight: 700
    fontSize: "16px"
  coach:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  notation:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 700
rounded:
  control: "4px"
  dialog: "8px"
  speech: "10px"
spacing:
  small: "8px"
  medium: "16px"
  panel: "20px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
  review-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
  coach-bubble:
    backgroundColor: "{colors.white}"
    textColor: "{colors.surface}"
    rounded: "{rounded.speech}"
    padding: "13px 14px"
---

# Design System: KnightLens

## Overview

**Creative North Star: "The Chess Review Desk"**

The user-approved Chess.com screenshot is the visual authority: a dense charcoal workspace, a large blue Icy Sea board with Neo pieces, and a compact review panel. KnightLens retains its name, German and English interface, and independent engine-derived analysis.

The white coach speech bubble and green actions establish the hierarchy. Official Chess.com-hosted Neo, Icy Sea, and Danny coach assets provide the visual references; no generated artwork substitutes for them.

**Key Characteristics:**
- Charcoal navigation and review surfaces.
- Blue board with full-cell Neo pieces.
- White coaching bubble, compact notation, and green actions.
- Arial and Helvetica typography intentionally pinned to the screenshot.

## Colors

The Icy Sea background alone uses brightness(0.7), contrast(2.2) and saturate(1.7) to match the supplied deep-blue reference. Apply this to the background pseudo-element, never the Neo pieces, badges or coordinates.

Warm charcoal neutrals frame the cool board and the familiar green action accent.

### Primary
- **Review Green:** Primary actions, active tabs, status indicators, selection, and keyboard focus.

### Secondary
- **Icy Sea Blue:** The official textured board asset supplies its alternating blue squares; the board-light token is the fallback surface, not a replacement for the image.

### Neutral
- **Workspace Charcoal:** Page background.
- **Panel Charcoal:** Sidebar and review panel.
- **Heading Charcoal:** Review-panel title strip.
- **Soft Stone:** Default text, with muted text for supplementary information.
- **Coach White:** Speech bubble, light evaluation area, and strong text contrast.

**The Position Color Rule.** Move-quality colors always accompany symbols or labels; color alone must not carry the evaluation.

## Typography

**Display Font:** Arial, Helvetica, sans-serif.
**Body Font:** Arial, Helvetica, sans-serif.

**Character:** Compact, familiar interface typography follows the screenshot. The previous DM Sans direction is superseded; do not restore it when extending this design.

### Hierarchy
- **Display:** Heavy import-dialog headings (28px, weight 800; 26px on mobile).
- **Title:** Bold review-panel headings using the title token.
- **Body:** Coach prose uses the coach token; compact desktop layouts reduce it to 12px.
- **Label:** Bold navigation (14px; 12px at the compact desktop breakpoint).
- **Notation:** Bold SAN moves use the notation token; supporting move numbers and evaluations are smaller.

## Layout

`src/style.css` provides the base layout, interactions, and accessibility styles. `src/chesscom.css`, imported afterward, is the approved visual theme layer. Preserve this ordering and keep theme changes in that layer.

Desktop uses a fixed left sidebar (176px), a fluid board column, and a review column (420px) separated by 32px. The workspace is centered and constrained by viewport height and a 1470px maximum. At 1700px and above, the review column becomes 445px with a 40px gap.

At 1200px and below, the sidebar becomes 150px, the review column 345px, and the gap 20px. At 960px and below, navigation becomes a 62px icon rail beside a 330px review column. At 760px and below, navigation becomes a horizontal top bar (58px high); the board stacks above review with an 18px gap. Mobile retains import, analysis, overview, and language access.

Player strips align with the board, accounting for the evaluation bar. In move view, the coach precedes tabs and alternating notation rows, followed by the evaluation graph, five playback buttons, and the full-width analysis action. In overview, the graph precedes the accuracy summary.

## Elevation & Depth

Depth comes primarily from tonal surfaces. The board is flat with no shadow. Primary buttons have a tactile green lower edge (shadow `0 3px 0 #48732e`); the import dialog uses `0 14px 50px #0008` over a dark backdrop without blur.

## Shapes

Board cells and the board silhouette are square. Controls and the review panel use small corners; the import dialog is slightly softer. The white coach bubble has the speech radius and a left-facing tail. Circular move-quality badges are reserved for position annotations. Playback buttons have softly curved corners (7px).

## Components

### Buttons
Green primary actions use a restrained vertical gradient and white bold text. Secondary actions use charcoal gradients. Hover changes the fill; keyboard focus retains the base two-pixel accent outline with three-pixel offset. Disabled actions remain visibly disabled. Reduced-motion preferences disable transitions.

### Inputs / Fields
Import fields use dark inset surfaces, a subdued warm border, white text, and muted placeholders. Preserve labels, error messages, and visible focus styling in both languages.

### Navigation
The charcoal sidebar has left-aligned icons and bold labels. The active item uses a darker fill, white label, and green icon. Compact navigation hides text while retaining accessible names. Mobile moves core actions into the horizontal header.

### Review Panel
Use a darker heading strip and compact spacing rather than independent cards. Alternate notation row tones; highlight the selected move with a warmer gray fill. Small circular quality badges and Neo notation piece icons support the SAN text. Keep the graph and five equal-width playback controls below the notation.

### Board and Coach
Use the Neo piece set, Icy Sea board, and Danny coach URLs centralized in `src/theme.ts`. Pieces fill their cells without filters. The coach image sits beside a white bubble with dark text; explain and next actions sit underneath. Selecting a move updates board, evaluation, coach, graph selection, and best-move arrow together. The amber arrow follows board orientation without intercepting pointer input.

## Do's and Don'ts

### Do:
- Do follow the approved screenshot's charcoal, blue board, white bubble, and green action hierarchy.
- Do preserve KnightLens branding and German and English copy.
- Do retain keyboard navigation, visible focus, and reduced-motion behavior.
- Do keep coaching and classifications tied to actual engine output.

### Don't:
- Don't restore the superseded sage palette or DM Sans typography.
- Don't substitute generated artwork for the official hosted Neo, Icy Sea, or coach assets.
- Don't add decorative glass, glows, or repetitive cards to the review workspace.
- Don't populate fake evaluations or imply exact compatibility with proprietary Chess.com scores.
