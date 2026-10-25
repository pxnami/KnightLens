---
name: KnightLens
description: A calm bilingual chess analysis workbench.
colors:
  primary: "#c4d59b"
  background: "#191c1b"
  surface: "#222623"
  coach: "#293126"
  text: "#eceee8"
  muted: "#a4ada3"
  board-light: "#dce0ce"
  board-dark: "#72866a"
typography:
  body:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 400
  heading:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 500
    letterSpacing: "-0.03em"
rounded:
  control: "5px"
  panel: "8px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
---

## Overview
Operate mode. Follow the user's screenshot layout: board left, explanations and notation right. Independent sage and charcoal identity, with no proprietary Chess.com artwork.

## Colors
Use the pale sage accent for actions and selected state. Classification colors convey move quality with accompanying symbols and labels.

## Typography
Self-hosted DM Sans. Compact, tabular notation; moderate heading sizes. Preserve German and English copy at narrow widths.

## Layout
Maximum width 1420px. Fluid two-column workspace with a larger board. At 760px, stack board above analysis. Initial import protects focus while choosing the game. Evaluation plot and coach are tied to the selected half-move.

## Elevation & Depth
Use restrained soft shadows on the board and import dialog. Analysis sections use tonal surfaces and separators.

## Shapes
Small control radii. Square board cells. Rounded badges are reserved for move annotations.

## Components
Player strips, board and evaluation bar, playback, coach, move table, summary and clickable graph. Best-move arrow and legal destinations explain interaction.

## Do's and Don'ts
Keep analysis uncertainty visible. Never populate fake evaluations or imply Chess.com score compatibility. Honor reduced motion and keyboard navigation.
