/**
 * Reasoning slider plugin, browser half.
 *
 * Replaces the composer's model seat with a Codex-style control: the model row
 * sits on top, and the reasoning effort below it is a horizontal slider whose
 * tick marks are the levels the selected model actually advertises.
 *
 * Registration shadows the stock `ModelSelect` by claiming the same
 * `conversation.input.model` single seat at a lower priority — slot entries are
 * ordered by ascending priority and the lowest live entry of a cell renders, so
 * both plugins stay loaded and toggling this one off restores the stock UI.
 *
 * All reading and writing goes through the stock per-session
 * `ctx.modelDirectories` directory, so `/model` and this seat stay in sync.
 */
window.__ModuleLoader__.load({
	id: "dsh-reasoning-slider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		const NS = "reasoning-slider";
		/** Seat priority below the stock entry (0), so this one renders instead. */
		const SEAT_PRIORITY = -1;
		/** Knob diameter in px; the knob's travel is inset by its radius on both ends. */
		const KNOB = 26;
		const KNOB_R = KNOB / 2;
		/** Track height in px. */
		const TRACK = 24;
		const TRACK_R = TRACK / 2;
		/**
		 * How far the fill tucks under the knob.
		 *
		 * The knob is a circle of radius `KNOB_R`; the fill is a bar half as tall as
		 * the track. Where the two meet, the widest the circle ever gets at the
		 * fill's own top and bottom edge is `sqrt(KNOB_R² − TRACK_R²)`, so the fill
		 * may run that much past the knob's left edge and still be completely hidden
		 * — no seam of track showing between them, and no sliver of fill peeking out
		 * around the knob's antialiased rim.
		 */
		const FILL_TUCK = KNOB_R - Math.sqrt(KNOB_R * KNOB_R - TRACK_R * TRACK_R);
		/**
		 * How much of the gap between two rungs counts as "on" a rung.
		 *
		 * Within this fraction of the gap the knob is pulled onto the rung; the rest
		 * of the gap stays free for fine dragging. Under a fifth keeps the motion
		 * settled — the knob clicks onto a rung from a comfortable distance instead
		 * of sliding past it — while leaving most of every gap loose, so the slider
		 * never feels sticky.
		 */
		const SNAP_FRACTION = 0.175;
		/** Fixed pool and reserved top rung: all 25 particles, at a one-second drift. */
		const PARTICLES = 25;
		/** Ordinary rungs span these endpoints, independently of ladder length. */
		const PARTICLE_MIN = 5;
		const PARTICLE_MAX = 20;
		const DRIFT_SECONDS = 10;
		const DRIFT_FAST_SECONDS = 2;
		const DRIFT_TOP_SECONDS = 1;
		/** Fade into the top-tier background without slowing the knob or particles. */
		const TOP_FADE_SECONDS = 1.5;
		/**
		 * Comet tail.
		 *
		 * A tail built from discrete echoes can never be smooth: fixed spacing
		 * beads apart on small dots, and discrete opacity levels draw contour rings
		 * on large ones. So the tail is one element whose alpha ramps continuously
		 * and whose outline tapers, sized as a multiple of its own dot so small and
		 * large particles both keep the same shape.
		 */
		const TRAIL_LENGTH = 3;
		/**
		 * Peak alpha of the drifting field.
		 *
		 * The field is texture, not furniture: at full white the dots read as
		 * content and pull the eye off the knob and the level name. Everything below
		 * derives from this one number, so the dot and the head of its tail stay in
		 * step.
		 */
		const PARTICLE_ALPHA = 0.38;
		/** Alpha stops down the tail, as fractions of the dot's own alpha. */
		const TRAIL_FALLOFF = [
			[0, 1],
			[30, 0.72],
			[55, 0.4],
			[78, 0.15],
			[100, 0],
		];
		const alpha = (share) => (share === 0 ? "0" : (PARTICLE_ALPHA * share).toFixed(3));
		const TRAIL_RAMP = `linear-gradient(90deg,${TRAIL_FALLOFF.map(
			([stop, share]) => `rgba(255,255,255,${alpha(share)}) ${stop}%`,
		).join(",")})`;
		/**
		 * Outline of the tail: full height under the dot, then a gentle taper to a
		 * point. The first quarter sits behind the dot, so the visible streak starts
		 * exactly at the dot's edge.
		 */
		const TRAIL_OUTLINE = "polygon(0 0,25% 0,60% 26%,100% 50%,60% 74%,25% 100%,0 100%)";

		const css = `
.drs-root{position:relative;display:flex;min-width:0}
/* Declared for the panel and for the Plugins-page card alike: the switch reads the
 * same track token on both surfaces. */
.drs-root,.drs-page{--drs-track:color-mix(in srgb,var(--dsw-alias-label-primary,#1a1a1a) 11%,transparent);--drs-dot-off:color-mix(in srgb,var(--dsw-alias-label-primary,#1a1a1a) 26%,transparent);--drs-dot-on:rgba(255,255,255,.36)}
.drs-trigger{border-radius:var(--dsw-radius-sm);min-width:0;max-width:min(360px,45cqw);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:6px;padding:0 4px 0 8px;font-size:13px;font-weight:400;line-height:20px;display:flex;font-family:inherit}
.drs-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.drs-trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.drs-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.drs-triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden;display:var(--dsh-composer-model-text-display,block)}
.drs-triggerEffort{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-caption);flex-shrink:1000;overflow:hidden;display:var(--dsh-composer-model-text-display,block)}
/* The top rung wears its own ramp in the composer too. */
.drs-triggerEffortTop{background-image:linear-gradient(90deg,#7c4dff,#b07bff);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.drs-chevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s}
.drs-chevronOpen{transform:rotate(180deg)}

.drs-panel{position:fixed;z-index:1101;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:296px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:8px 14px 14px;border:0;border-radius:var(--dsw-radius-lg,16px);box-shadow:var(--dsw-elevation-prominent);background:var(--dsw-menu-surface-fill,#f8f9fa);backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));-webkit-backdrop-filter:var(--dsw-menu-backdrop-filter,blur(40px) saturate(150%));color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;font-size:13px}
.drs-head{display:flex;align-items:center;gap:4px;min-height:34px}
.drs-modelRow{flex:1;min-width:0;display:flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 4px;border:0;border-radius:var(--dsw-radius-sm);background:0 0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;font-weight:500;cursor:pointer;outline:none;text-align:left}
.drs-modelRow:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-modelRow:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.drs-modelName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;min-width:0;flex:1}

.drs-levelName{margin-top:6px;text-align:center;font-size:15px;font-weight:600;line-height:22px;letter-spacing:.01em;transition:color .18s linear}
.drs-caption{margin-top:1px;text-align:center;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-tertiary);min-height:17px}

.drs-slider{position:relative;margin:9px 0 2px;height:${KNOB}px;touch-action:none;cursor:pointer;outline:none}
/* The track clips its own contents, so the fill and the drifting particles can
 * never render outside the pill's rounded end. */
.drs-track{position:absolute;left:0;right:0;top:50%;height:${TRACK}px;transform:translateY(-50%);border-radius:999px;background:var(--drs-track);overflow:hidden}
/* Square right end on purpose: it lives under the knob, and a rounded cap there
 * is what leaves a wedge of track showing against the knob's curve. */
.drs-fill{position:absolute;left:0;top:0;bottom:0;overflow:hidden;border-radius:999px 0 0 999px;transition:width .34s cubic-bezier(.22,1,.36,1)}
/* Keep both top-tier layers mounted: gradient images themselves cannot interpolate.
 * Opacity cross-fades the violet river and its highlight over the previous blue
 * fill. Their steady-state motion still uses composited transforms. */
.drs-fill::before{content:"";position:absolute;top:0;bottom:0;left:0;width:200%;background-image:linear-gradient(90deg,#3b45d2,#7c63f5,#ad75ff,#9959ff,#9c72ff,#7c63f5,#3b45d2);background-size:50% 100%;animation:drs-river 9s linear infinite}
@keyframes drs-river{from{transform:translateX(0)}to{transform:translateX(-50%)}}
/* A single highlight sweeping the same way, right to left. */
.drs-fill::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 34%,rgba(255,255,255,.42) 50%,transparent 66%);animation:drs-flow 2.8s linear infinite}
@keyframes drs-flow{from{transform:translateX(100%)}to{transform:translateX(-100%)}}
.drs-fill::before,.drs-fill::after{opacity:0;pointer-events:none;transition:opacity .24s ease-out;animation-play-state:paused}
.drs-fill[data-flow="on"]::before,.drs-fill[data-flow="on"]::after{opacity:1;transition-duration:${TOP_FADE_SECONDS}s;transition-timing-function:ease-in-out;animation-play-state:running}

.drs-dot{position:absolute;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:var(--drs-dot-off);transition:opacity .35s ease,background .18s linear}
.drs-dotOn{background:var(--drs-dot-on)}
/* Revealed in slices as the rung rises: a fade, never a restart, so the field
 * never jumps mid-drag.
 *
 * The field lives behind a window exactly as wide as the fill, so particles only
 * ever appear in the coloured part — nothing drifts past the knob. The window
 * carries a canvas pinned to the *track's* width, so the lanes' travel never
 * re-scales as the knob moves; otherwise every drag frame would shift the whole
 * field. */
.drs-field{position:absolute;left:0;top:0;bottom:0;overflow:hidden;border-radius:999px 0 0 999px;transition:width .34s cubic-bezier(.22,1,.36,1)}
.drs-canvas{position:absolute;left:0;top:0;bottom:0}
.drs-lane{position:absolute;inset:0;pointer-events:none;transition:opacity .6s ease;animation-name:drs-drift;animation-timing-function:linear;animation-iteration-count:infinite;animation-duration:calc(var(--drs-drift,${DRIFT_SECONDS}s) * var(--drs-rate,1))}
.drs-particle{position:absolute;left:100%;border-radius:50%;background:rgba(255,255,255,${PARTICLE_ALPHA});pointer-events:none}
/* The tail starts at the dot's own left edge, so the dot covers its first sixth
 * and the streak appears to be drawn out of the dot's middle. Its alpha ramps
 * continuously to nothing and its outline tapers to a point, which is what keeps
 * it free of both beading and contour steps. */
.drs-tail{position:absolute;left:100%;pointer-events:none;background:${TRAIL_RAMP};clip-path:${TRAIL_OUTLINE}}
@keyframes drs-drift{from{transform:translateX(0)}to{transform:translateX(-110%)}}

.drs-knob{position:absolute;top:50%;width:${KNOB}px;height:${KNOB}px;margin:-${KNOB_R}px 0 0 -${KNOB_R}px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0000001f,0 3px 8px #00000014;transition:left .34s cubic-bezier(.22,1,.36,1),transform .18s ease-out}
/* While dragging, a short transition still applies: it smooths the pointer
 * tracking and turns each magnetic snap into a visible glide instead of a jump.
 * The little lift is what makes those clicks readable. */
.drs-slider[data-dragging="true"] .drs-knob,.drs-slider[data-dragging="true"] .drs-fill{transition-duration:.11s}
.drs-slider[data-dragging="true"] .drs-knob{transform:scale(1.08)}
.drs-slider:focus-visible .drs-knob{box-shadow:0 0 0 .5px #00000014,0 0 0 3px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.drs-slider[data-disabled="true"]{cursor:default;opacity:.55}
.drs-slider[data-pending="true"] .drs-knob::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid transparent;border-top-color:var(--dsw-alias-label-tertiary);animation:drs-spin .7s linear infinite}
@keyframes drs-spin{to{transform:rotate(360deg)}}

.drs-hint{margin-top:2px;text-align:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.drs-settings{margin-top:6px;display:flex;flex-direction:column;gap:2px}
/* The Plugins-page card: the page draws its own chrome, so this stays bare. */
.drs-page{display:flex;flex-direction:column;gap:2px}
.drs-page .drs-row{border-radius:var(--dsw-radius-sm)}
.drs-page .drs-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-row{display:flex;align-items:center;gap:10px;min-height:40px;padding:2px}
.drs-rowDisabled{opacity:.45}
.drs-rowText{flex:1;min-width:0;display:flex;flex-direction:column}
.drs-rowLabel{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}
.drs-rowHint{font-size:11px;line-height:15px;color:var(--dsw-alias-label-tertiary)}
.drs-switch{flex:none;position:relative;width:34px;height:20px;padding:0;border:0;border-radius:999px;background:var(--drs-track);cursor:pointer;outline:none;transition:background .18s linear}
.drs-switchOn{background:#7c4dff}
.drs-switch:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.drs-switch:disabled{cursor:default}
.drs-switchKnob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #00000024;transition:transform .18s cubic-bezier(.22,1,.36,1)}
.drs-switchOn .drs-switchKnob{transform:translateX(14px)}
.drs-list{margin-top:6px;max-height:264px;overflow:auto;display:flex;flex-direction:column;gap:1px;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}
.drs-groupLabel{padding:7px 6px 3px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);text-transform:none}
.drs-modelOption{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 8px;border:0;border-radius:var(--dsw-radius-sm);background:0 0;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:400;cursor:pointer;outline:none;text-align:left}
.drs-modelOption:hover{background:var(--dsw-alias-interactive-bg-hover)}
.drs-modelOption:focus-visible{background:var(--dsw-alias-interactive-bg-hover);box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.drs-optionName{flex:1;min-width:0;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.drs-check{flex:none;color:var(--dsw-alias-state-business-primary)}
`;
		const TAG_ID = "dsh-reasoning-slider/ReasoningSlider.css";
		if (
			typeof document !== "undefined" &&
			document.querySelector("style[data-plugin-css=" + JSON.stringify(TAG_ID) + "]") === null
		) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-reasoning-slider";
			tag.dataset.pluginCss = TAG_ID;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		//#region level presentation
		/**
		 * Effort ids that map onto the familiar Codex ladder. Known ids get a
		 * localized ladder name; anything else keeps the adapter's own name.
		 */
		const LEVEL_KEYS = {
			off: "level.off",
			none: "level.off",
			minimal: "level.minimal",
			low: "level.low",
			medium: "level.medium",
			mid: "level.medium",
			high: "level.high",
			xhigh: "level.xhigh",
			max: "level.max",
			ultra: "level.ultra",
		};
		/**
		 * Every rung paints a left-to-right ramp; only its stops move with the
		 * ladder. Below the top rung that ramp runs pale blue to the reference deep
		 * blue, deepening as the rung rises.
		 */
		const BLUE_FROM_LIGHT = [169, 201, 250];
		const BLUE_FROM_DEEP = [91, 155, 243];
		const BLUE_TO_LIGHT = [74, 143, 224];
		const BLUE_TO_DEEP = [1, 105, 204];
		/** The last level is the "spends your quota" tier and gets the violet ramp. */
		const TOP_GRADIENT = "linear-gradient(90deg,#3b45d2 0%,#7c63f5 26%,#ad75ff 50%,#9959ff 74%,#9c72ff 100%)";
		const TOP_TEXT = "#7c4dff";

		const lerp = (a, b, t) => Math.round(a + (b - a) * t);
		const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
		const mix = (from, to, t) => [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];

		/**
		 * The accent for one ladder position.
		 * @param index - zero-based position in the ladder.
		 * @param count - total ladder length.
		 * @returns the fill's gradient, the level name's colour, and whether this is
		 * the top rung (which also animates and drifts fastest).
		 */
		function accentFor(index, count) {
			const last = count - 1;
			if (last <= 0) {
				const solid = hex(BLUE_TO_DEEP);
				return { fill: `linear-gradient(90deg,${hex(BLUE_FROM_DEEP)},${solid})`, text: solid, top: false };
			}
			if (index >= last) return { fill: TOP_GRADIENT, text: TOP_TEXT, top: true };
			const t = last <= 1 ? 1 : index / (last - 1);
			const from = hex(mix(BLUE_FROM_LIGHT, BLUE_FROM_DEEP, t));
			const to = hex(mix(BLUE_TO_LIGHT, BLUE_TO_DEEP, t));
			return { fill: `linear-gradient(90deg,${from},${to})`, text: to, top: false };
		}

		/**
		 * Deterministic particle field.
		 *
		 * The layout is fixed rather than random per render, so React re-rendering a
		 * drag frame never restarts a drift animation.
		 * @returns particle descriptors, slowest first.
		 */
		function makeParticles() {
			const out = [];
			let seed = 0x9e3779b9;
			const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
			for (let index = 0; index < PARTICLES; index += 1) {
				out.push({
					key: `p${index}`,
					top: 16 + next() * 68,
					size: 1.5 + next() * 1.8,
					rate: (0.72 + next() * 0.72).toFixed(3),
					delay: (-next() * 7).toFixed(3),
				});
			}
			return out;
		}

		/**
		 * Ordinary rungs are linearly spaced from 5 to 20 particles and 10 to 2
		 * seconds; the final rung is always 25 particles / 1 second. Round counts
		 * to whole particles. A lone ordinary rung uses the calm endpoints.
		 */
		function fieldFor(index, count) {
			if (count <= 0) return { visible: 0, drift: DRIFT_SECONDS };
			const last = count - 1;
			const rung = Math.min(last, Math.max(0, index));
			if (rung === last) return { visible: PARTICLES, drift: DRIFT_TOP_SECONDS };
			const share = last > 1 ? rung / (last - 1) : 0;
			return {
				visible: Math.round(PARTICLE_MIN + (PARTICLE_MAX - PARTICLE_MIN) * share),
				drift: DRIFT_SECONDS + (DRIFT_FAST_SECONDS - DRIFT_SECONDS) * share,
			};
		}

		/** Where the panel keeps its own display preferences. */
		const PREFS_KEY = "dsh-reasoning-slider/prefs";
		/**
		 * The two switches together pick one of three states:
		 * `particles: false` shows none anywhere, otherwise `topOnly` narrows the
		 * field to the top rung and leaves it on every rung when off.
		 */
		const PREF_DEFAULTS = { particles: true, topOnly: false };

		/**
		 * Read the panel's display preferences.
		 *
		 * Storage is best-effort: a browser that refuses it costs a remembered
		 * toggle, never a working slider.
		 * @returns the stored preferences, filled out with defaults.
		 */
		function readPrefs() {
			try {
				const raw = window.localStorage?.getItem(PREFS_KEY);
				if (raw === null || raw === void 0) return { ...PREF_DEFAULTS };
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return { ...PREF_DEFAULTS };
				return { particles: parsed.particles !== false, topOnly: parsed.topOnly === true };
			} catch {
				return { ...PREF_DEFAULTS };
			}
		}

		/** @param prefs - preferences to remember; a refused write is ignored. */
		function writePrefs(prefs) {
			try {
				window.localStorage?.setItem(PREFS_KEY, JSON.stringify(prefs));
			} catch {
				/* a refused write only costs the memory of the toggle */
			}
		}

		// The toggles are edited on the Plugins page and read by the panel, so the
		// value is one small observable store rather than component state: whichever
		// surface writes, the other follows without a remount.
		let prefsCache = null;
		const prefListeners = new Set();

		/** @returns the current preferences, read once per page. */
		function currentPrefs() {
			if (prefsCache === null) prefsCache = readPrefs();
			return prefsCache;
		}

		/**
		 * @param key - preference name.
		 * @param value - its new value.
		 */
		function setPrefValue(key, value) {
			prefsCache = { ...currentPrefs(), [key]: value };
			writePrefs(prefsCache);
			for (const listener of [...prefListeners]) listener();
		}

		/** @param listener - notified on every preference change. @returns its disposer. */
		function subscribePrefs(listener) {
			prefListeners.add(listener);
			return () => prefListeners.delete(listener);
		}

		/** Knob/tick position as a fraction of the travel range. */
		const ratioOf = (index, count) => (count <= 1 ? 0 : index / (count - 1));

		/** Directory snapshot for a session the seat cannot resolve yet. */
		const NO_STATE = { current: null, routable: null, groups: [], failures: [], status: "idle", pending: null, error: null };
		const NO_NOTIFY = () => {};
		/** Binding notifications are primary; this backoff also covers older hosts. */
		const RETRY_DELAYS = [120, 240, 480, 1000, 2000];
		/** A slow/unavailable session gets a retry entry instead of endless loading. */
		const LOADING_ATTEMPTS = 3;

		/** Subscribe without changing hook order while a source is unavailable. */
		function useSnapshot(source, fallback) {
			const subscribe = React.useCallback(
				(notify) => (source == null ? NO_NOTIFY : source.subscribe(notify)),
				[source],
			);
			const read = React.useCallback(() => (source == null ? fallback : source.getSnapshot()), [source, fallback]);
			return React.useSyncExternalStore(subscribe, read);
		}

		//#region icons
		const Chevron = ({ up }) =>
			h(
				"svg",
				{ className: "drs-chevron" + (up ? "" : " drs-chevronOpen"), width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true },
				h("path", { d: "M4 10l4-4 4 4", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }),
			);

		const IconCheck = () =>
			h(
				"svg",
				{ className: "drs-check", width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true },
				h("path", { d: "M3 8.5l3.2 3.2L13 5", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }),
			);

		/** One labelled switch row of the settings card. */
		const SwitchRow = ({ label, hint, checked, disabled, onChange }) =>
			h(
				"div",
				{ className: "drs-row" + (disabled ? " drs-rowDisabled" : "") },
				h(
					"span",
					{ className: "drs-rowText" },
					h("span", { className: "drs-rowLabel" }, label),
					hint === void 0 ? null : h("span", { className: "drs-rowHint" }, hint),
				),
				h(
					"button",
					{
						type: "button",
						role: "switch",
						"aria-checked": checked,
						"aria-label": label,
						className: "drs-switch" + (checked ? " drs-switchOn" : ""),
						disabled,
						onClick: () => onChange(!checked),
					},
					h("span", { className: "drs-switchKnob" }),
				),
			);

		/**
		 * The plugin's card on the Plugins page.
		 *
		 * Slot entry for `plugins.bundle.config`, keyed by this package's name, so
		 * the switches live in the plugin's own page rather than in the composer
		 * panel. The page owns the title and the crumb and renders `view: 'page'`;
		 * the summary view is handled for completeness.
		 * @param props - the page's locale seat and requested view.
		 * @returns the switches, or a one-line summary of them.
		 */
		function SettingsPanel({ t, view }) {
			const prefs = React.useSyncExternalStore(subscribePrefs, currentPrefs);
			if (view === "summary") {
				const state = !prefs.particles
					? "settings.summaryNone"
					: prefs.topOnly
						? "settings.summaryTopOnly"
						: "settings.summaryAll";
				return h("span", null, t(state));
			}
			return h(
				"div",
				{ className: "drs-page" },
				h(SwitchRow, {
					label: t("settings.particles"),
					hint: t("settings.particlesHint"),
					checked: prefs.particles,
					onChange: (value) => setPrefValue("particles", value),
				}),
				h(SwitchRow, {
					label: t("settings.topOnly"),
					hint: t("settings.topOnlyHint"),
					checked: prefs.topOnly,
					// Nested under the master switch: with the field off everywhere,
					// narrowing it to one rung has nothing left to decide.
					disabled: !prefs.particles,
					onChange: (value) => setPrefValue("topOnly", value),
				}),
			);
		}
		//#endregion

		/**
		 * Records a seat render failure, then lets it through.
		 *
		 * Deliberately no `getDerivedStateFromError`: the slot renderer already
		 * knows how to drop a broken entry and fall back to the stock seat, which
		 * beats a boundary that swallows the subtree. This exists only to make the
		 * failure legible, because the renderer's response to it is invisible from
		 * outside the app.
		 */
		class SeatReporter extends React.Component {
			componentDidCatch(error) {
				reportFailure("seat render failed; the stock model seat takes over", error);
			}

			render() {
				return this.props.children;
			}
		}

		/** The registered seat, wrapped so a render failure is reported. */
		function GuardedSeat(props) {
			// Do not carry an open panel, a drag or an optimistic write into another
			// conversation, even on hosts that reuse the same slot component instance.
			return h(SeatReporter, { key: props.sessionId }, h(ReasoningSeat, props));
		}

		//#region seat component
		/**
		 * Render the composer model seat with the effort ladder as a slider.
		 * @param props - owner share (`locked`), the injected directory face, and
		 * the standard locale seat.
		 * @returns the trigger and, while open, the model/effort panel.
		 */
		function ReasoningSeat({ sessionId, models, sessions, locked, t }) {
			markStage("seat-render", String(sessionId));
			// Borrow the lifecycle source; never retain a session just to draw a seat.
			// Its snapshot identity changes even when a replacement generation has the
			// same reference count. Binding arrival/drop must wake an unresolved seat.
			const retention = React.useMemo(
				() => (typeof sessions.retainInfo === "function" ? sessions.retainInfo(sessionId) : null),
				[sessions, sessionId],
			);
			useSnapshot(retention, null);
			// Address discovery can change without changing retention (subagents).
			useSnapshot(sessions.list, null);
			const addressed = sessions.subagentAddress(sessionId) !== void 0;
			// Resolve inside the component, not the cached inject face: a transient
			// missing binding must never retire this slot entry for the whole page.
			let directory = null;
			let directoryError = null;
			if (!addressed) {
				try {
					directory = models.directoryFor(sessionId);
				} catch (error) {
					directoryError = String(error);
					markStage("directory-pending", directoryError);
				}
			}
			const usable = directory != null && typeof directory.store?.subscribe === "function" && typeof directory.store?.getSnapshot === "function";
			if (!usable && !addressed) {
				// Keep the cause separately: the following seat-waiting breadcrumb
				// otherwise overwrites it in the same browser storage transaction.
				markDirectoryFailure(sessionId, directoryError ?? `directoryFor returned an unusable ${typeof directory}`, sessions);
			}
			const state = useSnapshot(usable ? directory.store : null, NO_STATE);
			const available = usable && !addressed;
			const [attempt, setAttempt] = React.useState(0);
			React.useEffect(() => {
				if (usable || addressed) {
					if (attempt !== 0) setAttempt(0);
					return;
				}
				// Back off, but never abandon the winning slot by returning null. A
				// null subtree does NOT elect the stock entry; it just hides the button.
				const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
				const timer = window.setTimeout(() => setAttempt((value) => value + 1), delay);
				return () => window.clearTimeout(timer);
			}, [attempt, usable, addressed]);
			React.useEffect(() => {
				if (available) directory.load().catch(() => {});
			}, [available, directory]);
			const load = () => {
				if (available) directory.load().catch(() => {});
			};
			const select = (selection) => (available ? directory.select(selection) : Promise.resolve(void 0));
			const [open, setOpen] = React.useState(false);
			const [view, setView] = React.useState("effort");
			const [pos, setPos] = React.useState(null);
			const [dragRatio, setDragRatio] = React.useState(null);
			const [dragging, setDragging] = React.useState(false);
			const [trackWidth, setTrackWidth] = React.useState(0);
			const [pendingIndex, setPendingIndex] = React.useState(null);
			const rootRef = React.useRef(null);
			const panelRef = React.useRef(null);
			const sliderRef = React.useRef(null);
			const draggingRef = React.useRef(false);
			const dragRatioRef = React.useRef(null);
			const modelListRef = React.useRef(null);
			/** How far the current write has got: see the effect below. */
			const flightRef = React.useRef("idle");
			// A same-ID binding replacement (or a dropped binding) is also a new
			// interaction lifetime. Clear before paint so a stale drag/write cannot
			// preview or commit a rung in the replacement directory. Closing also
			// releases the old panel's document/placement listeners.
			React.useLayoutEffect(() => {
				setOpen(false);
				setView("effort");
				setPos(null);
				setDragRatio(null);
				setDragging(false);
				draggingRef.current = false;
				dragRatioRef.current = null;
				flightRef.current = "idle";
				setPendingIndex(null);
			}, [directory]);

			const groups = state.groups ?? [];
			const current = state.current;
			const modelCount = groups.reduce((n, g) => n + (g.models?.length ?? 0), 0);
			const currentGroup = current === null ? undefined : groups.find((g) => g.id === current.provider);
			const currentModel = currentGroup?.models?.find((m) => m.id === current.model);
			const reasoning = currentModel?.reasoning;
			const waiting = current === null && state.status === "loading";

			/** Ladder = advertised efforts, plus an explicit provider-default rung. */
			const ladder = React.useMemo(() => {
				if (reasoning === undefined) return [];
				const base = reasoning.efforts ?? [];
				return reasoning.defaultEffort === undefined
					? [{ id: void 0, name: null, isDefault: true }, ...base]
					: base;
			}, [reasoning]);

			const count = ladder.length;
			const committedId = current?.reasoningEffort ?? reasoning?.defaultEffort;
			let committedIndex = ladder.findIndex((level) => level.id === committedId);
			if (committedIndex < 0) committedIndex = count > 0 ? 0 : -1;
			// While dragging the knob renders at the pointer's own ratio, pulled onto
			// a rung whenever it is close enough to one; the rung is committed on
			// release. Afterwards `pendingIndex` holds that choice until the store
			// reports it, so the panel never falls back through the old rung on the
			// way — which is what made a plain click flash.
			const shownIndex =
				dragRatio !== null
					? Math.round(dragRatio * Math.max(0, count - 1))
					: pendingIndex ?? Math.max(0, committedIndex);
			const shownRatio = dragRatio ?? ratioOf(shownIndex, count);
			const shown = ladder[shownIndex];
			const accent = accentFor(Math.max(0, shownIndex), Math.max(1, count));
			// Keep the last blue ramp underneath the violet layers: replacing this
			// background with the top ramp would make their slow fade invisible.
			const [fillBase, setFillBase] = React.useState(accent.fill);
			React.useLayoutEffect(() => {
				if (!accent.top) setFillBase(accent.fill);
			}, [accent.fill, accent.top]);
			const interactive = available && !locked && current !== null && count > 1;
			/** At the top rung the whole ladder sits inside the fill; the ticks fade there. */
			const ticksHidden = count > 1 && shownIndex >= count - 1;
			/**
			 * Whether the drifting field shows at all.
			 *
			 * The two switches together pick one of three states: off everywhere,
			 * on at every rung, or on at the top rung alone. Both are edited on the
			 * Plugins page and read here through the shared store.
			 */
			const prefs = React.useSyncExternalStore(subscribePrefs, currentPrefs);
			const fieldShown = prefs.particles && (!prefs.topOnly || accent.top);
			// One pool for the life of the component: the field only changes which
			// slice of it is visible, so no drift animation is ever restarted.
			const particles = React.useMemo(makeParticles, []);
			const field = fieldFor(shownIndex, count);
			const fillWidth = `calc(${shownRatio} * (100% - ${KNOB}px) + ${FILL_TUCK}px)`;
			// The field depends on the rung, never on the drag position, so it is
			// built once per rung: a drag frame re-renders the knob and the fill, not
			// a few hundred dots.
			const fieldNodes = React.useMemo(() => {
				if (trackWidth <= 0) return null;
				const dots = particles.map((particle, index) => {
					const size = particle.size;
					const place = (extra) => ({
						top: `${particle.top.toFixed(2)}%`,
						height: `${size.toFixed(2)}px`,
						// Centring each box on the lane's axis is what makes the tail
						// leave the dot's middle rather than its top edge.
						transform: "translateY(-50%)",
						...extra,
					});
					return h(
						"span",
						{
							key: particle.key,
							className: "drs-lane",
							"aria-hidden": true,
							style: {
								"--drs-rate": particle.rate,
								animationDelay: `${particle.delay}s`,
								opacity: index < field.visible ? 1 : 0,
							},
						},
						// Tail first, so the dot paints over where the two meet.
						h("span", {
							className: "drs-tail",
							style: place({ width: `${(size * (1 + TRAIL_LENGTH)).toFixed(2)}px` }),
						}),
						h("span", {
							className: "drs-particle",
							style: place({ width: `${size.toFixed(2)}px` }),
						}),
					);
				});
				return h("div", { className: "drs-canvas", style: { width: `${trackWidth}px` } }, ...dots);
			}, [particles, field.visible, trackWidth]);

			const labelOf = React.useCallback(
				(level) => {
					if (level === void 0) return "";
					if (level.id === void 0) return t("level.default");
					const key = LEVEL_KEYS[String(level.id).toLowerCase()];
					if (key !== void 0) return t(key);
					return level.name ?? String(level.id);
				},
				[t],
			);

			const modelLabel = waiting
				? t("trigger.loading")
				: currentModel?.name ?? (current === null ? t("trigger.fallback") : `${current.provider}/${current.model}`);
			const levelLabel = shown === void 0 ? "" : labelOf(shown);

			//#region data
			const reload = React.useCallback(() => {
				load();
			}, [load]);

			const commit = React.useCallback(
				(index) => {
					const level = ladder[index];
					if (level === void 0 || !interactive) return;
					if (index === committedIndex) return;
					select({
						provider: current.provider,
						model: current.model,
						...(level.id === void 0 ? {} : { reasoningEffort: level.id }),
					});
				},
				[committedIndex, current, interactive, ladder, select],
			);

			/**
			 * Move the ladder, showing the chosen rung immediately.
			 *
			 * The store publishes `pending` synchronously but only republishes
			 * `current` once the write settles, so a commit that relies on `current`
			 * alone would snap back to the previous rung for those frames — a click
			 * on a tick would flash its background and its label. The optimistic
			 * index bridges exactly that gap.
			 * @param index - the rung to select.
			 */
			const chooseRung = React.useCallback(
				(index) => {
					if (!interactive || index === committedIndex) return;
					flightRef.current = "submitted";
					setPendingIndex(index);
					commit(index);
				},
				[commit, committedIndex, interactive],
			);

			// Let the optimistic rung go as soon as the truth arrives, or as soon as
			// a settled write shows it will not: a rejected selection must fall back
			// to what the store actually holds rather than keep the lie on screen.
			React.useEffect(() => {
				if (pendingIndex === null) return;
				if (committedIndex === pendingIndex) {
					flightRef.current = "idle";
					setPendingIndex(null);
					return;
				}
				if (state.pending !== null) {
					flightRef.current = "inflight";
					return;
				}
				// Still waiting for the store to show the write at all; clearing here
				// would reintroduce the very flash this exists to prevent.
				if (flightRef.current !== "inflight") return;
				flightRef.current = "idle";
				setPendingIndex(null);
			}, [committedIndex, pendingIndex, state.pending]);

			//#endregion

			//#region open/close
			const openPanel = React.useCallback(() => {
				markStage("panel-open");
				setView("effort");
				setDragRatio(null);
				dragRatioRef.current = null;
				setOpen(true);
				reload();
				queueMicrotask(() => sliderRef.current?.focus());
			}, [reload]);

			const close = React.useCallback((restoreFocus) => {
				setOpen(false);
				setView("effort");
				setDragRatio(null);
				dragRatioRef.current = null;
				// A reopened panel starts from the store's own value, never from a
				// choice that was still in flight when it closed.
				flightRef.current = "idle";
				setPendingIndex(null);
				if (restoreFocus) queueMicrotask(() => rootRef.current?.querySelector("button")?.focus());
			}, []);

			React.useEffect(() => {
				if (!open) return;
				const onDown = (event) => {
					if (rootRef.current?.contains(event.target) === true) return;
					if (panelRef.current?.contains(event.target) === true) return;
					close(false);
				};
				document.addEventListener("mousedown", onDown);
				return () => document.removeEventListener("mousedown", onDown);
			}, [close, open]);

			React.useEffect(() => {
				if (!open) return;
				const onKey = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						close(true);
					}
				};
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, [close, open]);
			//#endregion

			//#region placement
			React.useLayoutEffect(() => {
				if (!open) {
					setPos(null);
					return;
				}
				const place = () => {
					const rect = rootRef.current?.getBoundingClientRect();
					if (rect === void 0) return;
					const MARGIN = 12;
					const w = panelRef.current?.offsetWidth ?? 0;
					const hgt = panelRef.current?.offsetHeight ?? 0;
					let x = rect.right - w;
					let y = rect.top - 8 - hgt;
					if (w > 0) x = Math.min(Math.max(x, MARGIN), window.innerWidth - w - MARGIN);
					if (hgt > 0) y = Math.min(Math.max(y, MARGIN), window.innerHeight - hgt - MARGIN);
					markStage("panel-placed", `${Math.round(x)},${Math.round(y)} panel ${w}x${hgt} viewport ${window.innerWidth}x${window.innerHeight}`);
					setPos({ left: x, top: y });
				};
				place();
				window.addEventListener("scroll", place, true);
				window.addEventListener("resize", place);
				return () => {
					window.removeEventListener("scroll", place, true);
					window.removeEventListener("resize", place);
				};
			}, [open, view, count, modelCount]);
			//#endregion

			//#region field geometry
			/**
			 * Track width in px.
			 *
			 * The particle lanes must keep a fixed travel basis while the window
			 * clipping them changes width, so the canvas they live on is pinned to
			 * this measurement instead of to a percentage of the fill.
			 *
			 * Measured through a callback ref rather than an effect: the ladder is
			 * unmounted and remounted whenever the view switches — picking a model
			 * does exactly that — and each new track has to be observed in turn. An
			 * effect keyed on the panel being open would keep watching the element
			 * that was removed, never see its replacement, and leave the field with a
			 * canvas too small to draw on until the panel was reopened.
			 */
			const trackObserverRef = React.useRef(null);
			const attachTrack = React.useCallback((element) => {
				trackObserverRef.current?.disconnect();
				trackObserverRef.current = null;
				if (element === null) return;
				const measure = () => {
					const width = element.getBoundingClientRect().width;
					// A detached element reports zero; keeping the last real width beats
					// blanking the field on the way out.
					if (!(width > 0)) return;
					setTrackWidth((current) => (Math.abs(current - width) < 0.5 ? current : width));
				};
				measure();
				if (typeof ResizeObserver === "undefined") {
					window.addEventListener("resize", measure);
					trackObserverRef.current = { disconnect: () => window.removeEventListener("resize", measure) };
					return;
				}
				const observer = new ResizeObserver(measure);
				observer.observe(element);
				trackObserverRef.current = observer;
			}, []);
			//#endregion

			//#region slider input
			/** Pointer x as a 0..1 position along the knob's travel. */
			const ratioAt = React.useCallback((clientX) => {
				const element = sliderRef.current;
				if (element === null || count <= 1) return 0;
				const rect = element.getBoundingClientRect();
				const usable = Math.max(1, rect.width - KNOB);
				return Math.min(1, Math.max(0, (clientX - rect.left - KNOB_R) / usable));
			}, [count]);

			const nearestIndex = React.useCallback(
				(ratio) => Math.round(ratio * Math.max(0, count - 1)),
				[count],
			);

			/**
			 * Pull a raw pointer position onto a rung when it is close enough.
			 *
			 * The knob is magnetic rather than free: near a rung it sits exactly on
			 * it, and only the middle of a gap tracks the pointer continuously.
			 * @param ratio - raw 0..1 position along the travel.
			 * @returns the position to render.
			 */
			const snapRatio = React.useCallback(
				(ratio) => {
					if (count <= 1) return 0;
					const step = 1 / (count - 1);
					const rung = nearestIndex(ratio) * step;
					return Math.abs(ratio - rung) <= step * SNAP_FRACTION ? rung : ratio;
				},
				[count, nearestIndex],
			);

			const applyRatio = React.useCallback((ratio) => {
				dragRatioRef.current = ratio;
				setDragRatio(ratio);
			}, []);

			const onPointerDown = (event) => {
				if (!interactive || event.button !== 0) return;
				event.preventDefault();
				draggingRef.current = true;
				setDragging(true);
				sliderRef.current?.focus();
				applyRatio(snapRatio(ratioAt(event.clientX)));
				event.currentTarget.setPointerCapture?.(event.pointerId);
			};
			const onPointerMove = (event) => {
				if (!draggingRef.current) return;
				const ratio = snapRatio(ratioAt(event.clientX));
				if (ratio !== dragRatioRef.current) applyRatio(ratio);
			};
			const endDrag = (event) => {
				if (!draggingRef.current) return;
				draggingRef.current = false;
				setDragging(false);
				event.currentTarget.releasePointerCapture?.(event.pointerId);
				const pending = dragRatioRef.current;
				applyRatio(null);
				chooseRung(pending === null ? committedIndex : nearestIndex(pending));
			};
			const onSliderKeyDown = (event) => {
				if (!interactive) return;
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					chooseRung(Math.max(0, committedIndex - 1));
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					chooseRung(Math.min(count - 1, committedIndex + 1));
				} else if (event.key === "Home") {
					event.preventDefault();
					chooseRung(0);
				} else if (event.key === "End") {
					event.preventDefault();
					chooseRung(count - 1);
				} else if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
				}
			};
			//#endregion

			//#region model list
			const chooseModel = (group, model) => {
				select({
					provider: group.id,
					model: model.id,
					...(model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }),
				});
				setView("effort");
				setDragRatio(null);
				dragRatioRef.current = null;
				// A different model means a different ladder, so a rung index held over
				// from the old one means nothing.
				flightRef.current = "idle";
				setPendingIndex(null);
				queueMicrotask(() => sliderRef.current?.focus());
			};
			//#endregion

			if (!available) {
				if (addressed) {
					markStage("seat-null", `session ${String(sessionId)} — cannot address models`);
					return null;
				}
				markStage("seat-waiting", `session ${String(sessionId)} — directory not resolvable yet (attempt ${attempt})`);
				const busy = attempt < LOADING_ATTEMPTS;
				const label = t(busy ? "trigger.loading" : "trigger.retry");
				// Keep the entry mounted for arbitrarily late binding notifications.
				// After a brief wait it is an explicit retry, not an endless spinner.
				return h(
					"span",
					{ className: "drs-root" },
					h(
						"button",
						{
							type: "button",
							ref: rootRef,
							className: "drs-trigger",
							disabled: busy || locked,
							"aria-busy": busy,
							"aria-label": label,
							onClick: () => setAttempt(0),
						},
						h("span", { className: "drs-triggerLabel" }, label),
					),
				);
			}
			markStage(
				"seat-visible",
				`session ${String(sessionId)} — ${count} rungs, effort ${String(committedId)}`,
			);

			//#region render
			const trigger = h(
				"button",
				{
					type: "button",
					ref: rootRef,
					className: "drs-trigger",
					disabled: locked,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-label": levelLabel === "" ? t("trigger.aria", { model: modelLabel }) : t("trigger.ariaEffort", { model: modelLabel, effort: levelLabel }),
					title: t("trigger.title"),
					onClick: () => (open ? close(false) : openPanel()),
				},
				h("span", { className: "drs-triggerLabel" }, modelLabel),
				levelLabel !== "" &&
					h(
						"span",
						{
							// The top rung wears its violet ramp here too, so the collapsed
							// seat already announces the tier.
							className: "drs-triggerEffort" + (accent.top ? " drs-triggerEffortTop" : ""),
							"aria-hidden": true,
						},
						`\u00b7 ${levelLabel}`,
					),
				h(Chevron, { up: open }),
			);

			if (!open) return h("span", { className: "drs-root" }, trigger);

			const levelBlock =
				count === 0
					? h("div", { className: "drs-hint" }, t("empty.efforts"))
					: [
							h("div", { key: "name", className: "drs-levelName", style: { color: accent.text } }, levelLabel),
							h(
								"div",
								{ key: "caption", className: "drs-caption" },
								accent.top && count > 1 ? t("caption.top") : "",
							),
							h(
								"div",
								{
									key: "slider",
									ref: sliderRef,
									className: "drs-slider",
									role: "slider",
									tabIndex: interactive ? 0 : -1,
									"aria-label": t("slider.aria"),
									"aria-valuemin": 0,
									"aria-valuemax": Math.max(0, count - 1),
									"aria-valuenow": Math.max(0, shownIndex),
									"aria-valuetext": levelLabel,
									"aria-disabled": !interactive,
									"data-dragging": dragging,
									"data-disabled": !interactive,
									"data-pending": state.pending !== null,
									onPointerDown,
									onPointerMove,
									onPointerUp: endDrag,
									onPointerCancel: endDrag,
									onKeyDown: onSliderKeyDown,
								},
								h(
									"div",
									{
										className: "drs-track",
										ref: attachTrack,
										// A shorter --drs-drift is a faster field; every particle
										// scales its own duration off it.
										style: { "--drs-drift": `${field.drift.toFixed(2)}s` },
									},
									h("div", {
										className: "drs-fill",
										// Only the top rung animates its highlight.
										"data-flow": accent.top ? "on" : void 0,
										style: {
											// The fill runs to the knob's centre and then tucks under
											// it, so the knob reads as riding the fill rather than
											// floating beside a bar that stops short of it.
											width: fillWidth,
											background: accent.top ? fillBase : accent.fill,
										},
									}),
									// The drifting field, behind a window exactly as wide as the
									// fill: particles only ever appear in the coloured part, so
									// none drift past the knob into the empty track.
									fieldShown
										? h("div", { className: "drs-field", style: { width: fillWidth } }, fieldNodes)
										: null,
									...ladder.map((level, index) =>
										h("span", {
											key: `dot:${level.id ?? "default"}`,
											className: "drs-dot" + (index <= shownIndex ? " drs-dotOn" : ""),
											style: {
												left: `calc(${KNOB_R}px + ${ratioOf(index, count)} * (100% - ${KNOB}px))`,
												// The ticks are the ladder, so they show at every rung —
												// except the top one, where the whole ladder sits inside
												// the fill and fixed dots would read as stalled
												// particles. There they fade out together.
												opacity: ticksHidden ? 0 : 1,
											},
										}),
									),
								),
								h("div", {
									className: "drs-knob",
									style: { left: `calc(${KNOB_R}px + ${shownRatio} * (100% - ${KNOB}px))` },
								}),
							),
						];

			const modelBlock = h(
				"div",
				{ className: "drs-list", ref: modelListRef },
				groups.length === 0
					? h("div", { className: "drs-hint" }, waiting ? t("trigger.loading") : t("empty.models"))
					: groups.flatMap((group) => [
							h("div", { key: `g:${group.id}`, className: "drs-groupLabel" }, group.name ?? group.id),
							...(group.models ?? []).map((model) =>
								h(
									"button",
									{
										key: `m:${group.id}/${model.id}`,
										type: "button",
										className: "drs-modelOption",
										onClick: () => chooseModel(group, model),
									},
									h("span", { className: "drs-optionName" }, model.name ?? model.id),
									current !== null && current.provider === group.id && current.model === model.id ? h(IconCheck, null) : null,
								),
							),
						]),
			);

			const panel = h(
				"div",
				{
					ref: panelRef,
					className: "drs-panel",
					role: "dialog",
					"aria-label": t("panel.aria"),
					style: pos ?? { visibility: "hidden", left: 0, top: 0 },
				},
				h(
					"div",
					{ className: "drs-head" },
					h(
						"button",
						{
							type: "button",
							className: "drs-modelRow",
							"aria-expanded": view === "models",
							onClick: () => setView(view === "models" ? "effort" : "models"),
						},
						h("span", { className: "drs-modelName" }, modelLabel),
						h(Chevron, { up: view === "models" }),
					),
				),
				view === "models" ? modelBlock : levelBlock,
			);

			markStage("seat-built", `session ${String(sessionId)} — view ${view}`);
			return h("span", { className: "drs-root" }, trigger, panel);
			//#endregion
		}
		//#endregion

		//#region dictionaries
		const zh = {
			"level.default": "默认",
			"level.off": "关闭",
			"level.minimal": "最低",
			"level.low": "低",
			"level.medium": "中",
			"level.high": "高",
			"level.xhigh": "极高",
			"level.max": "最高",
			"level.ultra": "Ultra",
			"caption.top": "更快消耗使用额度",
			"panel.aria": "模型与推理等级",
			"slider.aria": "推理等级",
			"settings.particles": "显示粒子",
			"settings.particlesHint": "关闭后所有档位都不再显示漂移粒子",
			"settings.topOnly": "只在最高档显示粒子",
			"settings.topOnlyHint": "开启后其余档位不显示粒子",
			"settings.summaryNone": "粒子已全部关闭",
			"settings.summaryTopOnly": "仅最高档显示粒子",
			"settings.summaryAll": "所有档位显示粒子",
			"trigger.title": "模型与推理等级",
			"trigger.loading": "载入中…",
			"trigger.retry": "模型暂不可用，点击重试",
			"trigger.fallback": "选择模型",
			"trigger.aria": "选择模型，当前 {model}",
			"trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
			"empty.efforts": "当前模型未提供推理等级。",
			"empty.models": "没有可用的模型。",
		};
		const en = {
			"level.default": "Default",
			"level.off": "Off",
			"level.minimal": "Minimal",
			"level.low": "Low",
			"level.medium": "Medium",
			"level.high": "High",
			"level.xhigh": "Extra high",
			"level.max": "Maximum",
			"level.ultra": "Ultra",
			"caption.top": "Uses your quota faster",
			"panel.aria": "Model and reasoning effort",
			"slider.aria": "Reasoning effort",
			"settings.particles": "Show particles",
			"settings.particlesHint": "Off hides the drifting field at every level",
			"settings.topOnly": "Only at the top level",
			"settings.topOnlyHint": "Other levels show none while this is on",
			"settings.summaryNone": "Particles are off everywhere",
			"settings.summaryTopOnly": "Particles only at the top level",
			"settings.summaryAll": "Particles at every level",
			"trigger.title": "Model and reasoning effort",
			"trigger.loading": "Loading…",
			"trigger.retry": "Model unavailable — click to retry",
			"trigger.fallback": "Select model",
			"trigger.aria": "Select model, current {model}",
			"trigger.ariaEffort": "Select model, current {model}, reasoning effort {effort}",
			"empty.efforts": "This model provides no reasoning effort levels.",
			"empty.models": "No models are available.",
		};
		//#endregion

		/**
		 * Services that must exist before this plugin body may run.
		 *
		 * Cordis activates the entry only once every name here is provided, so the
		 * body may touch them directly — and, just as important, a scope handed back
		 * by `ctx.inject` can inherit these services plus its own declared deps.
		 * Reading an undeclared Service can throw a `without inject` error —
		 * including nested Remote namespace reads traced back to the caller.
		 *
		 * All three are root services the stock model seat also declares, so they
		 * cannot be absent while that seat works. `modelDirectories` is deliberately
		 * NOT here: it is reached through `ctx.inject`, whose callback simply waits,
		 * so a missing directory leaves the stock seat in place instead of parking
		 * this entry at `pending` — which the boot audit also treats as fatal.
		 */
		const inject = ["locale", "slots", "sessions"];

		/** Diagnostic breadcrumb key; see {@link markStage}. */
		const DIAG_KEY = "dsh-reasoning-slider/diag";
		/** Last value written, so the render path does not rewrite an unchanged one. */
		let lastStage = null;
		let lastDirectoryFailure = null;

		/** Persist only resolver metadata, never Session content or credentials. */
		function markDirectoryFailure(sessionId, error, sessions) {
			try {
				const value = JSON.stringify({
					sessionId,
					error: error.slice(0, 400),
					hasScope: typeof sessions.scope === "function" ? sessions.scope(sessionId) !== void 0 : null,
					hasBinding: typeof sessions.binding === "function" ? sessions.binding(sessionId) !== void 0 : null,
				});
				if (value === lastDirectoryFailure) return;
				lastDirectoryFailure = value;
				window.localStorage?.setItem(`${DIAG_KEY}/directory-error`, value);
			} catch {
				/* a retired context or refused storage must not break the seat */
			}
		}

		/**
		 * Record how far this plugin got.
		 *
		 * Every failure in this file is swallowed on purpose, and the renderer's
		 * console is not reachable from outside the app, so a plugin that loads but
		 * never appears leaves no trace at all. The last stage reached is parked in
		 * local storage instead, where the browser profile can be read back.
		 * @param stage - milestone name.
		 * @param detail - optional text, usually a caught error.
		 */
		function markStage(stage, detail) {
			const value = detail === void 0 ? stage : `${stage} :: ${detail}`;
			// Called from the render path, so an unchanged value must not reach
			// storage again: a drag re-renders every frame.
			if (value === lastStage) return;
			lastStage = value;
			try {
				const stamp = new Date().toISOString().slice(11, 23);
				window.localStorage?.setItem(DIAG_KEY, `${stamp} ${value}`);
			} catch {
				/* diagnostics must never be the reason the plugin fails */
			}
		}

		/**
		 * Report a failure without ever throwing.
		 *
		 * A UI plugin that cannot register is a missing control, not a broken
		 * application: the web boot audit refuses to start the page for any entry
		 * that is not active, so every failure in this file has to stay inside it.
		 * @param message - what failed.
		 * @param error - the caught value.
		 */
		function reportFailure(message, error) {
			const detail = String((error !== null && error !== void 0 && error.stack) || error);
			markStage(`failed: ${message}`, detail.slice(0, 400));
			try {
				console.error(`[reasoning-slider] ${message}`, error);
			} catch {
				/* reporting must not throw either */
			}
		}

		/**
		 * Client plugin body: shadow the composer model seat and render the
		 * Codex-style model/effort panel over the stock model directory.
		 *
		 * Nothing in here may throw synchronously — see {@link reportFailure}.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			markStage("apply");
			try {
				ctx.effect(() => ctx.locale.register(NS, { zh, en }), "reasoning-slider: dictionaries");
			} catch (error) {
				reportFailure("dictionary registration failed", error);
			}
			const slots = ctx.slots;
			// Cordis re-traces nested Service faces to the caller. directoryFor()
			// needs `remote.session` permission there, not just on the resolver.
			// Declare `remote` too to match the stock plugin's complete Remote
			// contract; keep both optional to this plugin's boot activation.
			ctx.inject(["modelDirectories", "remote", "remote.session"], (scope) => {
				try {
					const models = scope.modelDirectories;
					const sessions = scope.sessions;
					// Service proxies and the seat MUST share the optional scope's
					// lifetime. Root-owned registrations survive service replacement and
					// keep calling a retired resolver forever; retries cannot fix that.
					const modelSlots = scope.slots;
					modelSlots.inject("conversation.input.model", () =>
						modelSlots.register(
							{
								name: "conversation.input.model",
								priority: SEAT_PRIORITY,
								locale: NS,
								inject: (sessionId) => ({ sessionId, models, sessions }),
							},
							GuardedSeat,
						),
					);
					markStage("seat-registered");
				} catch (error) {
					reportFailure("seat registration failed; the stock model seat stays in place", error);
				}
			});
			// The display toggles belong to the plugin, not to the composer, so they
			// render on this package's own page in the sidebar's Plugins list. The
			// slot is keyed by the bundle's package name.
			try {
				slots.inject("plugins.bundle.config", () =>
					slots.register({ name: "plugins.bundle.config", key: "dsh-reasoning-slider", locale: NS }, SettingsPanel),
				);
				markStage("card-registered");
			} catch (error) {
				reportFailure("settings card registration failed; the toggles stay at their defaults", error);
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
