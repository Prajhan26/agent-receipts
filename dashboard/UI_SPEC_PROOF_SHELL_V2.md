# ProofShell v2

This document locks the current `dashboard` landing page UI as a named reference version.

Use this name in future prompts when you want to preserve or return to this design:

`ProofShell v2`

## Summary

ProofShell v2 evolves ProofShell v1 into a more technical, proof-first product shell with a stronger split hero and a more guided terminal demo surface.

## Core Direction

- dark infrastructure-style layout
- split hero with product proof on the left and value proposition on the right
- sharper panel borders and more product-like composition
- terminal/demo used as a trust-building artifact

## Hero Pattern

### Left Panel

- fixed-height terminal/demo viewport
- animated guided terminal session
- compact session header
- prompt band
- thinking state
- staged command/log output
- proof-oriented outcome summary

### Right Panel

- large value proposition headline
- short supporting copy
- restrained CTA area
- top-aligned stable layout

## Typography

- Heading/display font: `Syne`
- Technical/meta font: `Space Mono`

## Visual Language

- Background: near-black
- Primary text: warm off-white
- Metadata/system text: muted gray
- Success accent: green
- Technical/path/link accent: blue
- Identity accent: salmon/orange

## Sections Included

1. top navigation with status pill
2. split hero with guided terminal session
3. workflow section
4. live receipts section
5. tamper demo section
6. footer

## Difference From ProofShell v1

ProofShell v1:
- proof-first split shell
- simpler quick-start terminal
- less terminal realism

ProofShell v2:
- more explicit guided session behavior
- tighter terminal structure
- denser log storytelling
- more product-demo driven hero

## File Scope

This spec currently corresponds primarily to:

- `dashboard/app/page.tsx`
- `dashboard/app/layout.tsx`
- `dashboard/app/globals.css`

## How To Reference It Later

Examples:

- "Go back to `ProofShell v2`."
- "Keep `ProofShell v2` but redesign the terminal."
- "Branch from `ProofShell v2` and make it more enterprise."

