# Wirewise Lab

Wirewise Lab is a visual learning app for practicing residential electrical circuits on a safe, virtual workbench. Learners can drag devices, route color-coded conductors between terminals, receive live circuit checks, and test completed circuits.

## What is included

- Seven guided lessons covering switched lighting, receptacle branches, GFCI protection, single- and two-light three-way switching, fan/light controls, and interconnected smoke alarms
- Drag-and-drop device placement and repositioning
- Drag-to-wire and click-to-wire terminal connections
- Nine draggable device types with live conductor, terminal, and circuit-path validation
- Responsive touch and keyboard-friendly controls
- Local lesson progress and a GitHub Pages deployment workflow

> This app is a simplified educational simulation. It is not a substitute for local electrical code, permits, testing equipment, or a qualified electrician.

## Run locally

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

## Publish with GitHub Pages

Push the project to the repository's `main` branch. In the repository settings, open **Pages** and set **Source** to **GitHub Actions**. The included workflow builds and publishes the site on every push to `main`.

The static exporter automatically handles both `username.github.io` root sites and project sites such as `username.github.io/wirewise-lab`.
