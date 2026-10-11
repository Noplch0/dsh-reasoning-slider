# dsh-reasoning-slider

A DeepSeek Harness **client plugin** that replaces the composer's model seat with a sleek reasoning-effort slider. Choose your model on top, drag the horizontal slider below to adjust reasoning effort across the model's supported levels.

```
┌──────────────────────────────────────────┐
│  DeepSeek V4.1 Flash                  ⌄   │   ← Click to change model
│                                          │
│                  极高                     │   ← Current effort level (colored)
│           更快消耗使用额度                 │   ← Top tier caption
│                                          │
│    ●─────●─────◉─────○─────○─────○       │   ← Drag to adjust
└──────────────────────────────────────────┘
```

## Features

- **Model selector** on top — click to browse available models grouped by provider
- **Horizontal slider** for reasoning effort — drag left/right, click a rung, or use `←`/`→` keys
- **Smart rungs** — slider ticks match exactly what each model supports, no filler
- **Tier-aware colors** — from light blue through reference blue to the violet gradient on the top tier
- **Keyboard-friendly** — arrow keys step through levels, `Home`/`End` jump to extremes
- **Display settings** — configure particle animation on the Plugins page (on at all levels, off, or top level only)
- **Localised** — Chinese and English dictionaries included
- **Theme-aware** — respects DSH light and dark palettes

## Requirements

- **DeepSeek Harness** `0.2.0-rc.2` or later
- Built-in profile plugins: `dsh-client-ui-model-selection`, `dsh-client-locale`

## Installation

### Via DeepSeek Harness (Recommended)

1. **Settings → Plugins → Add plugin**
2. Enter the folder path: `D:\Projects\dsh-thing-effort`
3. Restart DeepSeek Harness once (profile resolution happens at boot)

DSH will:
- Run `pnpm add` to add the package
- Record it in `dsh.profile.bundles`
- Apply the bundle patch ([`cordis.patch.yml`](cordis.patch.yml))

To remove: **Settings → Plugins**, find the plugin and uninstall.

### Manual Installation (PowerShell)

If you prefer not to use pnpm:

```powershell
# PowerShell 7
pwsh -File scripts\install.ps1

# Windows PowerShell 5.1 (unsigned script; bypass for this run)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\install.ps1
```

This adds the plugin as an absolute path in `cordis.patch.yml` (backed up as `cordis.patch.yml.bak-<timestamp>` first).

To remove: `pwsh -File scripts\install.ps1 -Remove`

**Note:** Use only one installation route. Installing via both methods will cause the plugin to mount twice, and the second registration will fail.

## Architecture

The plugin has two halves working together:

| File | Purpose |
|---|---|
| [`lib/index.js`](lib/index.js) | Node half — minimal entry point so the plugin appears in the Loader tree |
| [`lib/client.js`](lib/client.js) | Browser half — the actual UI seat served at `/plugins/dsh-reasoning-slider/client.js` |
| [`cordis.patch.yml`](cordis.patch.yml) | Bundle patch — registers the plugin in the Cordis loader |
| [`package.json`](package.json) | Declares `dsh.bundle` and `dsh.client`, exports the client module |

### How it Works

- **Slot Registration** — claims the `conversation.input.model` seat at priority `-1`, shadowing the default `ModelSelect` without unloading it
- **Model Store** — reads from and writes to the same model directory that `/model` uses, so changes in either surface appear everywhere
- **Per-Session Resolution** — resolves the model directory per render to handle session bindings and late subagent address discovery gracefully
- **Recovery** — automatic retries with exponential backoff for missing bindings, with a visible "click to retry" button
- **Scope-Owned Registration** — when the model service is replaced, the old seat automatically retires and a new one takes its place

### Dependency Injection

The plugin exports an `inject` list that Cordis uses to sequence service availability:

```js
inject: ['locale', 'slots', 'sessions', 'modelDirectories']
```

This ensures all required services are available before `apply()` runs. Without proper ordering, the plugin would fail to activate.

## Configuration

Display settings are stored in browser `localStorage`:

- **Particle animation** — on at every level (default), off everywhere, or only at the top level
- **Per-browser** — each browser remembers its own preference

Settings appear on the plugin's page in **Settings → Plugins**.

## Development & Testing

Local test harnesses are in [`.dev/`](.dev/):

```powershell
cd .dev
pnpm install        # Once: installs React, test renderer, and YAML parser
node render-seat.test.mjs   # Test UI rendering, drag, keyboard, and colors
node bundle.test.mjs        # Verify packaging against DSH expectations
```

Tests cover:
- Trigger and panel rendering with real React
- Drag-to-select and keyboard navigation
- Tier colors and particle scaling
- Model list and provider-default rungs
- Session binding recovery and retries
- Plugin packaging conformance

## Design Notes

### Slider Geometry

Measured from reference design:
- Track: 24px tall, fully rounded
- Knob: 26px, centered on track
- Rung spacing: `13px + (i / (n-1)) × (100% - 26px)` — knob travel inset by its radius
- Fill: runs from track left edge to knob center
- Ticks: 4px white/dark dots at each rung position

### Particle Scaling

The top rung has fixed parameters: **25 particles, 1-second drift period**. Other rungs scale linearly:

```js
share = i / (n - 2)
particles = Math.round(5 + 15 * share)
baseDriftSeconds = 10 - 8 * share
```

For a 6-rung ladder: particles are [5, 9, 13, 16, 20, 25] and drift periods are [10, 8, 6, 4, 2, 1] seconds.

## Limitations

- **Version coupling** — requires DSH `0.2.0-rc.2` or later; future releases that rename `conversation.input.model` or change `modelDirectories` will need updates
- **One ladder per model** — effort levels come from the model's `reasoning` metadata; models without it show no slider
- **Manual path updates** — the PowerShell install uses absolute paths; moving this folder breaks the link until reinstalled
- **No per-session history** — the slider shows the current session's effort and writes changes back; it keeps no history of its own

## License

MIT

---

**Questions?** Check the [DeepSeek Harness documentation](https://deepseek.com) or open an issue in this repository.
