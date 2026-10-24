<div align="center">

<img src="cover.png" alt="dsh-reasoning-slider Cover" width="280" />

# dsh-reasoning-slider

**Codex-style reasoning-effort slider for the DeepSeek Harness composer model seat.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-%3E%3D%200.2.0--rc.2-blueviolet)](https://deepseek.com)
[![Platform](https://img.shields.io/badge/Platform-Desktop%20%7C%20Web-brightgreen)]()

[English](README.md) • [简体中文](README.zh.md)

</div>

---

## Overview

**`dsh-reasoning-slider`** is a high-polish client plugin for [DeepSeek Harness (DSH)](https://deepseek.com). It reimagines the composer's model seat into a unified, Codex-inspired dual-tier control: switch your model from the top dropdown, and dynamically adjust reasoning effort using an ultra-fluid horizontal slider below.

The plugin mounts non-destructively through Cordis slot injection, cleanly shadowing the default `ModelSelect` component while staying fully synchronized with DSH's internal model directory and the `/model` command.

```
┌──────────────────────────────────────────────┐
│  DeepSeek V4.1 Flash                     ⌄   │   ← Model selector (grouped by provider)
│                                              │
│                     最高                      │   ← Current effort tier (accent colored)
│               更快消耗使用额度                 │   ← Top-tier quota warning caption
│                                              │
│   ●──────●──────◉──────○──────○──────○       │   ← Magnetic slider with drifting particles
└──────────────────────────────────────────────┘
```

---

## Key Features

- 🎚️ **Codex-Style Integrated Control**  
  Combines model selection and reasoning effort into a single, compact composer seat. Click the model row to expand the provider list, or drag the horizontal slider to modulate thinking intensity.

- 🎯 **Dynamic, Model-Adaptive Rungs**  
  Slider tick marks automatically adapt to the exact reasoning levels advertised by the active model (e.g., `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra`). Models lacking reasoning metadata gracefully hide the slider without visual clutter.

- 🎨 **Tier-Aware Aesthetics & Violet River**  
  - **Progressive Blue Tones:** Smooth procedural gradient transition from ice blue (`#A9C9FA`) to reference blue (`#0169CC`) as reasoning steps up.
  - **Animated Top Tier:** The highest tier triggers the signature violet gradient (`#3B45D2` → `#9C72FF`) featuring continuous dual-layer river flow animation, dynamic light sweep, and the quota advisory *"Uses your quota faster"*.

- 🧲 **Magnetic Snapping & Tactile Drag**  
  - A tuned **17.5% magnetic snap zone** glides the knob onto ticks cleanly when released nearby, while leaving the majority of travel smooth and loose for natural dragging.
  - Subtle knob scaling (`1.08x`) and lifted shadow on active pointer drag.

- 🌌 **Procedural Particle Comet Field**  
  - Deterministic particle simulation drifting across the track fill without layout recalculations.
  - Scaled density and velocity: from 5 particles at low rungs up to 25 particles on the top tier with tapered comet tails.

- ⌨️ **Keyboard Accessible & Inclusive**  
  - Full keyboard control: `←` / `→` arrow keys step across rungs; `Home` / `End` jump straight to extremes.
  - Native ARIA roles (`role="slider"`, `role="switch"`), focus-visible rings, and high-contrast labels.

- ⚙️ **Integrated Plugin Settings**  
  Adds a configuration card directly to **Settings → Plugins (`plugins.bundle.config`)** to control particle animations (*All Levels*, *Top Level Only*, or *Disabled*), persisted in `localStorage`.

- 🌐 **Native Bilingual Localization (i18n)**  
  Built-in Chinese (`zh-CN`) and English (`en-US`) dictionaries seamlessly plugged into DSH's `locale` service.

- 🛡️ **Non-Destructive Slot Shadowing & Fault Tolerance**  
  - Registers into `conversation.input.model` at priority `-1`. The stock model seat remains installed beneath; disabling the plugin instantly restores the default UI.
  - Multi-tier exponential backoff retries with graceful fallback if session bindings or remote resolvers are momentarily unavailable.

---

## Requirements

- **DeepSeek Harness** `0.2.0-rc.2` or higher
- Built-in host profile plugins:
  - `dsh-client-ui-model-selection`
  - `dsh-client-locale`

---

## Installation

### Method 1: Via DeepSeek Harness UI (Recommended)

1. Open **DeepSeek Harness**.
2. Navigate to **Settings → Plugins → Add plugin**.
3. Enter the absolute path to this project folder:
   ```text
   path\to\dsh-thing-effort
   ```
4. Restart DeepSeek Harness once (profile dependencies resolve at startup).

> **What happens under the hood:**  
> DSH will run `pnpm add`, register the package in `dsh.profile.bundles`, and apply [`cordis.patch.yml`](cordis.patch.yml).  
> To uninstall, go to **Settings → Plugins**, locate `dsh-reasoning-slider`, and click **Uninstall**.

---

### Method 2: Manual Installation (PowerShell)

If you prefer not to touch profile package manifests with `pnpm`, run the bundled PowerShell installer:

```powershell
# PowerShell 7
pwsh -File scripts\install.ps1

# Windows PowerShell 5.1 (Bypass execution policy for current run)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install.ps1
```

#### Installer Features & Options
- **Profile Target:** Defaults to `$env:DSH_HOME\profiles\desktop` (or `~/.dsh/profiles/desktop`). Specify a custom profile via `-ProfileDir`:
  ```powershell
  pwsh -File scripts\install.ps1 -ProfileDir "C:\path\to\dsh\profile"
  ```
- **Safe Patching:** Backs up existing `cordis.patch.yml` as `cordis.patch.yml.bak-<timestamp>` before writing.
- **Mutual Exclusion Check:** Prevents duplicate registration if the plugin is already installed via the UI.
- **Uninstall / Removal:**
  ```powershell
  pwsh -File scripts\install.ps1 -Remove
  ```

> [!WARNING]  
> Choose **either** Method 1 or Method 2. Applying both simultaneously will cause the plugin to mount twice, resulting in a duplicate seat collision.

---

### Method 3: Install Straight from GitHub

No local checkout needed — give DSH a GitHub specifier instead of a folder path in **Settings → Plugins → Add plugin**:

```text
github:Noplch0/dsh-reasoning-slider
```

`pnpm` only understands the `github:owner/repo` form. A clone URL — `git@github.com:Noplch0/dsh-reasoning-slider.git`, or the same string with the `git@` prefix stripped — fails with:

```text
[ERR_PNPM_UNSUPPORTED_PROTOCOL] Unsupported protocol "github.com:" in the dependency specifier "github.com:Noplch0/dsh-reasoning-slider.git"
```

To pin a branch or commit, append it: `github:Noplch0/dsh-reasoning-slider#master`. Git installs resolve the default branch at install time, so **Settings → Plugins** update checks pick up later commits.

---

## Architecture & Codebase

```
dsh-thing-effort/
├── cover.png              # Plugin cover image
├── icon.svg               # Vector SVG icon for package listings
├── cordis.patch.yml       # Cordis bundle patch entry
├── package.json           # Plugin manifest & bundle declarations
├── lib/
│   ├── index.js           # Host-side entry (Cordis loader bridge)
│   └── client.js          # Browser client runtime (UI seat & renderer)
└── scripts/
    └── install.ps1        # Zero-pnpm PowerShell profile patcher
```

### Component Breakdown

| File | Role | Description |
|---|---|---|
| [`lib/index.js`](lib/index.js) | Node / Host | Minimal loader entry point that exposes the plugin to the Cordis lifecycle tree. |
| [`lib/client.js`](lib/client.js) | Web / Client | Complete UI runtime containing the slider math, SVG icons, React components, CSS, and Cordis slot injectors. |
| [`cordis.patch.yml`](cordis.patch.yml) | Bundle Patch | Profile patch that inserts `reasoning-slider` into the Cordis loader pipeline. |
| [`package.json`](package.json) | Manifest | Declares `dsh.bundle` and `dsh.client` targets, exporting `./client` for browser delivery. |
| [`scripts/install.ps1`](scripts/install.ps1) | Script | Automated PowerShell patcher with backup and rollback support. |

### Cordis Dependency Injection & Lifecycles

The browser plugin strictly sequences its activation through Cordis DI:

```js
// Core root dependencies
inject: ['locale', 'slots', 'sessions']
```

1. **Locale Registration:** Dictionaries (`zh` and `en`) are registered under namespace `reasoning-slider`.
2. **Context Scope Inheritance:** Optional services (`modelDirectories`, `remote`, `remote.session`) are bound via `ctx.inject(...)` to match the exact lifetime of the active session resolver.
3. **Slot Registration (`priority: -1`):** Claims `conversation.input.model` with priority `-1`. Because Cordis renders the lowest active numerical priority in single seats, this seat renders in place of stock `ModelSelect` (priority `0`). If this plugin is uninstalled or deactivated, `ModelSelect` resumes immediately.
4. **Settings Slot:** Registers `SettingsPanel` into `plugins.bundle.config` under key `dsh-reasoning-slider`.

---

## Design Specifications

### Slider Geometry

All visual dimensions adhere to rigorous design specs:

| Parameter | Value | Details |
|---|---|---|
| **Track Height** | `24px` | Fully rounded pill (`border-radius: 999px`) |
| **Knob Diameter** | `26px` | Circular knob centered vertically over track |
| **Travel Inset** | `13px` (`KNOB_R`) | Travel distance is inset by knob radius on each end |
| **Rung Spacing** | `13px + (i / (n-1)) * (100% - 26px)` | Mathematical position of tick index `i` across `n` rungs |
| **Fill Tuck** | `KNOB_R - sqrt(KNOB_R² - TRACK_R²)` | Computes fill underlap so no antialiased gaps or seams appear |
| **Snap Fraction** | `17.5%` (`0.175`) | Magnetic snap radius around each rung |

### Particle Drift Mechanics

The procedural drifting particle field simulates a cosmic stream within the track fill:
- **Maximum Tier (Top):** Locked at **25 particles**, **1-second drift period**, animated violet gradient ribbon with highlight sweep.
- **Intermediate Rungs:** Scaled linearly based on rung index:
  $$\text{particles} = \operatorname{round}\left(5 + 15 \times \frac{i}{n - 2}\right)$$
  $$\text{driftSeconds} = 10 - 8 \times \frac{i}{n - 2}$$
- **Comet Tail:** Continuous gradient fade (`TRAIL_RAMP`) enclosed in a tapered polygon clip-path (`TRAIL_OUTLINE`) eliminating stepped banding artifacts.

---

## Configuration

Display settings are managed per-browser via `localStorage` (`dsh-reasoning-slider/prefs`):

- **Show Particles:** Toggle the entire background particle animation on or off.
- **Only at the Top Level:** Limit particle animations exclusively to the highest reasoning tier.

Access these toggles under **Settings → Plugins → dsh-reasoning-slider**.

---

## Limitations & Notes

- **Version Lock:** Requires DeepSeek Harness `0.2.0-rc.2` or later.
- **Model Metadata:** Reasoning levels depend on upstream model definitions in `modelDirectories`. Models without reasoning capabilities will display standard model switching without the slider.
- **Path Persistence:** The manual PowerShell installer references the absolute path of this repository. If the folder is moved, re-run `scripts\install.ps1`.

---

## License

This project is licensed under the [MIT License](LICENSE).
