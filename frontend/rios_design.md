---
version: 1.0
name: RI/OS-design-analysis
description: A highly immersive, interactive Web-based Desktop Operating System interface that perfectly mimics macOS. The layout abandons the conventional scrolling web page in favor of an absolute-positioned full-screen canvas. It relies heavily on glassmorphism (backdrop-filter blurs), native system typography, and OS-level micro-interactions to create a gamified professional portfolio.

colors:
  primary-accent: "#007aff"
  primary-accent-dark: "#0a84ff"
  desktop-bg-light: "#f0f0f5"
  desktop-bg-dark: "#141414"
  window-bg-light: "rgba(255, 255, 255, 0.65)"
  window-bg-dark: "rgba(30, 30, 30, 0.65)"
  menu-bg-light: "rgba(255, 255, 255, 0.35)"
  menu-bg-dark: "rgba(30, 30, 30, 0.35)"
  text-primary-light: "#1d1d1f"
  text-primary-dark: "#f5f5f7"
  text-muted-light: "#86868b"
  text-muted-dark: "#a1a1a6"
  border-glass: "rgba(255, 255, 255, 0.2)"
  border-glass-dark: "rgba(255, 255, 255, 0.1)"
  control-close: "#ff5f56"
  control-minimize: "#ffbd2e"
  control-maximize: "#27c93f"
  dock-bg-light: "rgba(255, 255, 255, 0.4)"
  dock-bg-dark: "rgba(0, 0, 0, 0.4)"
  selection-bg: "rgba(0, 122, 255, 0.3)"

typography:
  menu-bar:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.01em
  window-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  app-icon-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0
  body-text:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.01em
  h1-display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  terminal-code:
    fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  pill: 9999px
  full: 50%
  squircle: 22.5%

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  menu-height: 28px
  dock-padding: 8px

components:
  global-menu-bar:
    backgroundColor: "{colors.menu-bg-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.menu-bar}"
    height: "{spacing.menu-height}"
    backdropFilter: "blur(20px) saturate(180%)"
  window-modal:
    backgroundColor: "{colors.window-bg-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border-glass}"
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
    backdropFilter: "blur(20px) saturate(180%)"
  dock-container:
    backgroundColor: "{colors.dock-bg-light}"
    rounded: "{rounded.xl}"
    padding: "{spacing.dock-padding}"
    backdropFilter: "blur(20px)"
    border: "1px solid {colors.border-glass}"
  app-icon:
    rounded: "{rounded.squircle}"
    size: 48px
  traffic-light-close:
    backgroundColor: "{colors.control-close}"
    rounded: "{rounded.full}"
    size: 12px
  traffic-light-minimize:
    backgroundColor: "{colors.control-minimize}"
    rounded: "{rounded.full}"
    size: 12px
  traffic-light-maximize:
    backgroundColor: "{colors.control-maximize}"
    rounded: "{rounded.full}"
    size: 12px
---

## Overview

Roberto Izquierdo's web presence (RI/OS) is a masterclass in **"Show, Don't Tell"** experiential design. Instead of a traditional scrolling layout, the interface is a pixel-perfect, highly immersive **Web-based Desktop Operating System** that borrows heavily from macOS Big Sur/Monterey UI/UX paradigms. The UI chrome does not recede; rather, the UI *is* the product. It establishes technical authority by presenting the portfolio within a functional, windowed, gamified environment.

Density is managed through encapsulation. Instead of long pages, content is chunked into native-feeling "Applications" (About, Projects, Terminal, Calculator) that exist as floating, draggable modal windows on an absolute-positioned canvas.

**Key Characteristics:**
- **OS Metaphor:** Replaces scrolling with window management (drag, minimize, maximize, close).
- **Glassmorphism:** Heavy reliance on `backdrop-filter: blur(20px)` to create translucent menus, windows, and docks that pick up the color of the dynamic desktop wallpaper.
- **Native Typography:** Strict use of the device's native system font stack (`-apple-system`) to guarantee the OS illusion feels authentic on every device.
- **Micro-interactions:** Mac-equivalent keyboard shortcuts (`⌘N`, `⌘W`, `Esc`), dock icon magnification on hover, and active-window z-index elevation.
- **Stateful Environment:** Features a real-time clock, functional contextual menus, and a sliding notification center.

## Colors

> **Source pages analyzed:** The entire RI/OS Single Page Application canvas. The color system relies on CSS variables injected into a light/dark mode theme architecture.

### Brand & Accent
- **Action Blue** (`{colors.primary-accent}` — #007aff): The ubiquitous macOS blue. Used for selected text, active menu highlights, focused states, and the primary accent inside applications.
- **Traffic Lights**: The semantic window controls. Close (`#ff5f56`), Minimize (`#ffbd2e`), and Maximize (`#27c93f`). 

### Surface & Glassmorphism (Light Mode)
- **Window Glass** (`{colors.window-bg-light}` — rgba(255, 255, 255, 0.65)): The core surface for all applications. Achieves its look entirely through `backdrop-filter: blur(20px) saturate(180%)`.
- **Menu Glass** (`{colors.menu-bg-light}` — rgba(255, 255, 255, 0.35)): Thinner, more transparent glass for the top global menu bar.
- **Dock Glass** (`{colors.dock-bg-light}` — rgba(255, 255, 255, 0.4)): Frosty surface holding the application icons.
- **Desktop Background** (`{colors.desktop-bg-light}`): Typically covered by a high-resolution, abstract OS-style wallpaper that dictates the ambient colors shining through the glass surfaces.

### Text
- **Primary Ink** (`{colors.text-primary-light}` — #1d1d1f): Standard macOS near-black for high legibility on frosted white surfaces.
- **Muted Ink** (`{colors.text-muted-light}` — #86868b): Used for secondary information, file paths, or disabled menu items.

### Hairlines & Borders
- **Glass Border** (`{colors.border-glass}` — rgba(255, 255, 255, 0.2)): The critical 1px inner stroke that gives the frosted glass panels a physical, 3D edge. 

## Typography

### Font Family
- **System Stack**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`. By delegating to the system UI font, the site perfectly mimics macOS on Apple devices and degrades gracefully to native UI fonts on Windows/Linux.
- **Monospace Stack**: `Menlo, Monaco, Consolas, monospace`. Used exclusively within the "Terminal" application and code snippets.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.h1-display}` | 32px | 700 | 1.10 | -0.02em | Hero text inside application windows |
| `{typography.body-text}` | 14px | 400 | 1.50 | -0.01em | Standard paragraph content inside windows |
| `{typography.menu-bar}` | 14px | 500 | 1.20 | -0.01em | Top global menu bar links |
| `{typography.window-title}`| 13px | 600 | 1.20 | 0 | Window title bar headers |
| `{typography.terminal-code}`| 13px | 400 | 1.40 | 0 | Terminal prompts and output |
| `{typography.app-icon-label}`| 12px | 400 | 1.20 | 0 | Text labels underneath icons on the desktop |

### Principles
- **OS Scale, Not Web Scale:** Font sizes are noticeably smaller than modern web standards (13-14px base instead of 16-18px). This is intentional, mapping to native OS UI scales rather than reading-optimized web articles.
- **System Weights:** Relies heavily on 400 (Regular) and 500 (Medium) for UI components, matching native macOS window chrome.

## Layout

### Spacing System
- **Base unit:** 4px and 8px grid, directly mirroring native UI development (e.g., Swift/AppKit).
- **Tokens:** `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px.
- **Menu Height:** Strictly `{spacing.menu-height}` (28px) across the top edge.
- **Canvas:** `100vw` by `100vh` with `overflow: hidden`. The browser window acts as a viewport into the virtual OS monitor.

### Layout Architecture
Unlike traditional sites, RI/OS has three absolute layout layers:
1. **Background Layer (z-index 0):** The wallpaper.
2. **Desktop Canvas (z-index 10):** Where icons and floating `{component.window-modal}` elements live.
3. **System UI Layer (z-index 100+):** The fixed `{component.global-menu-bar}` at `top: 0` and the `{component.dock-container}` floating at `bottom: 15px`.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Level 0 | None (Wallpaper) | Base canvas |
| Level 1 | `backdrop-filter: blur(20px)` | Global menu bar, Dock |
| Level 2 | Shadow `0 10px 30px rgba(0,0,0,0.15)` | Inactive background windows |
| Level 3 | Shadow `0 20px 50px rgba(0,0,0,0.3)` | Active, focused foreground window |

**Shadow philosophy.** Elevation is highly dynamic. When a user clicks a background window, JavaScript updates its z-index to the maximum value and swaps its CSS class to apply the Level 3 shadow (`0 20px 50px rgba(0,0,0,0.3)`), physically pulling it forward in the z-space while dimming the shadows of sibling windows.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-screen applications |
| `{rounded.md}` | 10px | Inner UI elements, buttons, and context menus |
| `{rounded.lg}` | 14px | Main `window-modal` corners |
| `{rounded.xl}` | 20px | `dock-container` corners |
| `{rounded.squircle}`| 22.5% | App icons (matching Apple's continuous curve squircle) |
| `{rounded.full}` | 50% | Traffic light window controls (`{component.traffic-light-close}`) |

## Components

### System UI

**`global-menu-bar`** — Fixed at `top: 0`. Background `{colors.menu-bg-light}`, height `{spacing.menu-height}` (28px), text `{colors.text-primary-light}` in `{typography.menu-bar}` (14px / 500). Left side holds dropdown menus (RI Logo, File, Edit, View, Window, Help). Right side holds system tray icons (Clock, Language toggle, Live Chat, Notification Center icon). 

**`dock-container`** — Floating horizontally at the bottom center. Background `{colors.dock-bg-light}`, rounded `{rounded.xl}` (20px), internal padding 8px. Houses a row of `app-icon` components. Features a distinct CSS transition on hover that scales the targeted icon and its immediate neighbors (mimicking macOS Dock magnification).

### Window System

**`window-modal`** — The core content container. Absolute positioning. Background `{colors.window-bg-light}`, rounded `{rounded.lg}` (14px), 1px solid `{colors.border-glass}` border. 
- **Header:** A 40px draggable title bar. Left-aligned are the three traffic lights (`traffic-light-close`, `minimize`, `maximize` at 12px each with 8px gap). Center-aligned is the window title in `{typography.window-title}`.
- **Body:** Contains the actual portfolio content (About, Resume, Projects) with standard HTML scrolling (`overflow-y: auto`) confined *within* the modal.

### Application Types

**`app-icon`** — 48x48px, rounded `{rounded.squircle}`. Often filled with high-res PNGs/SVGs mimicking 3D app designs (like a Safari compass for Web, or a Command Prompt for Terminal). Open apps feature a tiny 4px black/white dot below the icon in the dock to indicate an active state.

**`search-spotlight`** — Triggered via menu or shortcut. A floating, centered search bar. Background `{colors.window-bg-light}`, heavy drop shadow, large `{typography.h1-display}` input text, rounded `{rounded.lg}`. 

## Do's and Don'ts

### Do
- Use `backdrop-filter` for all structural panels to maintain the OS illusion.
- Implement draggable window headers using JavaScript pointer events.
- Maintain the exact traffic light hex codes (`#ff5f56`, `#ffbd2e`, `#27c93f`); they are instantly recognizable semantic signals.
- Use system fonts (`-apple-system`). Do not load external Google fonts for the OS UI chrome.
- Include micro-interactions like the 4px active indicator dot under open applications in the dock.

### Don't
- Don't use traditional page scrolling on the `<body>`. Scrolling only happens inside the `{component.window-modal}` content areas.
- Don't use standard web navigation (headers/footers) — replace them with menus and dock icons.
- Don't flatten the design. Shadows and glass borders are mandatory to separate floating windows from the wallpaper.

## Responsive Behavior

### Breakpoints
Building a desktop OS for a mobile screen is technically contradictory. RI/OS handles this via a paradigm shift at the mobile breakpoint.

| Name | Width | Key Changes |
|---|---|---|
| Phone/Touch | ≤ 768px | The OS metaphor degrades into a full-screen card/PWA app metaphor. |
| Desktop | > 768px | Full OS drag-and-drop window management. |

### Mobile Paradigm Shift
- **Window to Screen:** On mobile, `{component.window-modal}` components lose their border radius, expand to `100vw` and `100vh`, and cover the entire screen like a native mobile app view.
- **Controls:** The traffic light controls disappear. Navigation changes to touch-friendly gestures ("Swipe up to close") or standard back buttons.
- **PWA Prompt:** Detects iOS/Android and prompts the user to "Add to Home Screen". Once installed, the browser UI disappears, rendering it indistinguishable from a native application.

## Iteration Guide

1. To add a new portfolio section, create a new `{component.window-modal}` instance.
2. Register an `{component.app-icon}` in the `{component.dock-container}` and bind an onClick event to toggle the modal's `display` state and push its `z-index` to the top.
3. Ensure the new modal content inherits `{typography.body-text}` and respects the internal `{spacing.lg}` padding.
4. Maintain the Mac shortcut bindings (e.g., mapping `ESC` to close the currently focused top-level window or `⌘M` to minimize).

## Known Gaps
- **Accessibility (a11y):** Heavy reliance on absolute positioning and custom DOM structures can make screen-reader navigation highly complex compared to semantic HTML web pages. Focus trapping inside modals must be manually programmed.
- **Performance:** Rendering multiple large elements with `backdrop-filter: blur(20px)` and heavy box-shadows is GPU-intensive and can cause frame drops on low-end devices or older browsers.
- **Deep Linking:** Because it acts as a Single Page Application canvas, direct URL routing to specific windows (e.g., `robertoizquierdo.com/projects`) requires complex History API management to automatically spawn the correct window on page load.