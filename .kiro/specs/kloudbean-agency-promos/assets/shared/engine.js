/* =============================================================================
   KloudBean Promo — SceneEngine
   -----------------------------------------------------------------------------
   Dependency-free, zero-build scene sequencer with playback controls, speed,
   progress reporting, hold-on-end, keyboard shortcuts, fit-to-viewport scaling,
   and reduced-motion handling.

   Usage (inside a promo HTML):
     const TIMELINE = [{ id:'hook', duration:6, label:'Intro' }, ...];
     const engine = new SceneEngine(document.querySelector('.kb-stage'), {
       timeline: TIMELINE, autoplay: true, holdOnEnd: true
     });
   ============================================================================= */

(function (global) {
  "use strict";

  var ALLOWED_SPEEDS = [0.5, 1, 1.5, 2];

  function clampSpeed(s) {
    return ALLOWED_SPEEDS.indexOf(Number(s)) !== -1 ? Number(s) : 1;
  }

  function SceneEngine(stageEl, options) {
    options = options || {};
    this.stage = stageEl;
    this.timeline = Array.isArray(options.timeline) ? options.timeline.slice() : [];
    this.autoplay = options.autoplay !== false;
    this.holdOnEnd = options.holdOnEnd !== false;
    this.speed = clampSpeed(options.speed || 1);

    this.index = 0;
    this._state = "idle";          // idle | playing | paused | ended
    this._timer = null;            // setTimeout handle for auto-advance
    this._raf = null;              // requestAnimationFrame handle
    this._sceneStart = 0;          // performance.now() at scene start
    this._elapsedBeforePause = 0;  // ms already elapsed in current scene
    this._durationMs = 0;          // current scene duration at current speed

    this._reducedMotion = this._detectReducedMotion();
    if (this._reducedMotion) document.body.classList.add("reduced-motion");

    this._resolveScenes();
    this._buildControls();
    this._bindKeys();
    this._bindResize();
    this._applyScale();

    // Show first scene immediately.
    this._activate(0, true);
    this._renderCounter();

    if (this.timeline.length === 0) {
      // Empty timeline: render whatever first scene exists, no autoplay.
      this._state = "paused";
      this._syncPlayBtn();
      return;
    }

    if (this.autoplay) {
      this.play();
    } else {
      this._state = "paused";
      this._syncPlayBtn();
    }
  }

  /* ---- Setup helpers --------------------------------------------------- */

  SceneEngine.prototype._detectReducedMotion = function () {
    try {
      return global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  };

  SceneEngine.prototype._resolveScenes = function () {
    // Map each timeline entry to its DOM element; warn-and-skip if missing.
    var self = this;
    var resolved = [];
    this.timeline.forEach(function (spec) {
      var el = self.stage.querySelector('[data-scene="' + spec.id + '"]');
      if (!el) {
        console.warn('[SceneEngine] No element for scene id "' + spec.id + '" — skipping.');
        return;
      }
      resolved.push({ spec: spec, el: el });
    });
    this.scenes = resolved;
    this.timeline = resolved.map(function (r) { return r.spec; });

    // If timeline empty but DOM has scenes, show the first one statically.
    if (this.scenes.length === 0) {
      var first = this.stage.querySelector("[data-scene]");
      if (first) this.scenes = [{ spec: { id: "static", duration: 0, label: "" }, el: first }];
    }
  };

  SceneEngine.prototype._buildControls = function () {
    var bar = document.createElement("div");
    bar.className = "kb-controls";
    bar.innerHTML =
      '<button class="kb-btn-ctl" data-act="prev" title="Previous (←)">◀</button>' +
      '<button class="kb-btn-ctl" data-act="toggle" title="Play / Pause (Space)">⏸</button>' +
      '<button class="kb-btn-ctl" data-act="next" title="Next (→)">▶</button>' +
      '<div class="kb-progress"><i></i></div>' +
      '<div class="kb-counter"></div>' +
      '<div class="kb-speed">' +
        ALLOWED_SPEEDS.map(function (s) {
          return '<button data-speed="' + s + '">' + s + '×</button>';
        }).join("") +
      "</div>";
    document.body.appendChild(bar);

    var hint = document.createElement("div");
    hint.className = "kb-hint";
    hint.textContent = "Space play/pause · ← → scenes · C clean-capture";
    document.body.appendChild(hint);

    this._els = {
      bar: bar,
      hint: hint,
      progress: bar.querySelector(".kb-progress > i"),
      counter: bar.querySelector(".kb-counter"),
      playBtn: bar.querySelector('[data-act="toggle"]'),
      speedBtns: Array.prototype.slice.call(bar.querySelectorAll("[data-speed]"))
    };

    var self = this;
    bar.addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-act");
      var sp = e.target.getAttribute && e.target.getAttribute("data-speed");
      if (act === "prev") self.prev();
      else if (act === "next") self.next();
      else if (act === "toggle") self.toggle();
      else if (sp) self.setSpeed(parseFloat(sp));
    });

    this._syncSpeedBtns();
  };

  SceneEngine.prototype._bindKeys = function () {
    var self = this;
    document.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.key === " ") { e.preventDefault(); self.toggle(); }
      else if (e.key === "ArrowRight") { self.next(); }
      else if (e.key === "ArrowLeft") { self.prev(); }
      else if (e.key === "c" || e.key === "C") { document.body.classList.toggle("clean"); }
      else if (e.key === "r" || e.key === "R") { self.replay(); }
    });
  };

  SceneEngine.prototype._bindResize = function () {
    var self = this;
    global.addEventListener("resize", function () { self._applyScale(); });
  };

  /* ---- Fit-to-viewport scaling ---------------------------------------- */

  SceneEngine.prototype._applyScale = function () {
    var w = this.stage.offsetWidth || 1;
    var h = this.stage.offsetHeight || 1;
    var scale = Math.min(global.innerWidth / w, global.innerHeight / h);
    // Leave a tiny margin so shadows aren't clipped.
    scale = scale * 0.98;
    this.stage.style.setProperty("--kb-scale", scale);
  };

  /* ---- Scene activation ----------------------------------------------- */

  SceneEngine.prototype._activate = function (i, immediate) {
    if (!this.scenes.length) return;
    i = Math.max(0, Math.min(i, this.scenes.length - 1));
    var self = this;
    this.scenes.forEach(function (s, n) {
      var el = s.el;
      if (n === i) {
        el.classList.remove("is-leaving");
        el.classList.add("is-active");
      } else {
        if (el.classList.contains("is-active")) {
          el.classList.remove("is-active");
          el.classList.add("is-leaving");
        } else {
          el.classList.remove("is-active", "is-leaving");
        }
      }
    });
    // Restart entrance animations for the active scene.
    if (!immediate) this._restartAnims(this.scenes[i].el);
    else this._restartAnims(this.scenes[i].el);
    this.index = i;
  };

  SceneEngine.prototype._restartAnims = function (sceneEl) {
    // Force reflow so [data-anim] keyframes replay each visit.
    var nodes = sceneEl.querySelectorAll("[data-anim]");
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      n.style.animation = "none";
      // eslint-disable-next-line no-unused-expressions
      n.offsetHeight; // reflow
      n.style.animation = "";
    }
  };

  /* ---- Timing engine -------------------------------------------------- */

  SceneEngine.prototype._currentDurationMs = function () {
    var spec = this.timeline[this.index] || this.scenes[this.index].spec;
    var secs = spec && spec.duration ? spec.duration : 0;
    return (secs / this.speed) * 1000;
  };

  SceneEngine.prototype._startScene = function () {
    this._clearTimers();
    this._elapsedBeforePause = 0;
    this._durationMs = this._currentDurationMs();
    if (this._durationMs <= 0) {
      // Non-advancing scene (e.g., static) — just render progress full.
      this._setProgress(1);
      return;
    }
    this._sceneStart = performance.now();
    this._scheduleAdvance(this._durationMs);
    this._tickProgress();
  };

  SceneEngine.prototype._scheduleAdvance = function (ms) {
    var self = this;
    this._timer = setTimeout(function () { self._advanceFromTimer(); }, ms);
  };

  SceneEngine.prototype._advanceFromTimer = function () {
    if (this.index >= this.scenes.length - 1) {
      // Last scene complete.
      if (this.holdOnEnd) {
        this._state = "ended";
        this._setProgress(1);
        this._syncPlayBtn();
        this._renderCounter();
        return;
      }
      this._activate(0);
      this._startScene();
      this._renderCounter();
      return;
    }
    this._activate(this.index + 1);
    this._startScene();
    this._renderCounter();
  };

  SceneEngine.prototype._tickProgress = function () {
    var self = this;
    cancelAnimationFrame(this._raf);
    function loop() {
      if (self._state !== "playing") return;
      var elapsed = self._elapsedBeforePause + (performance.now() - self._sceneStart);
      var p = self._durationMs > 0 ? Math.min(elapsed / self._durationMs, 1) : 1;
      self._setProgress(p);
      if (p < 1) self._raf = requestAnimationFrame(loop);
    }
    this._raf = requestAnimationFrame(loop);
  };

  SceneEngine.prototype._setProgress = function (p) {
    if (this._els && this._els.progress) {
      this._els.progress.style.width = (p * 100).toFixed(2) + "%";
    }
  };

  SceneEngine.prototype._clearTimers = function () {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  };

  /* ---- Public API ------------------------------------------------------ */

  SceneEngine.prototype.play = function () {
    if (!this.scenes.length) return;
    if (this._state === "ended") { this.replay(); return; }
    if (this._state === "playing") return;

    var resuming = this._state === "paused" && this._elapsedBeforePause > 0;
    this._state = "playing";
    this._syncPlayBtn();

    if (resuming && this._durationMs > 0) {
      // Resume remaining time in the current scene.
      var remaining = Math.max(this._durationMs - this._elapsedBeforePause, 0);
      this._sceneStart = performance.now();
      this._scheduleAdvance(remaining);
      this._tickProgress();
    } else {
      this._startScene();
    }
    this._renderCounter();
  };

  SceneEngine.prototype.pause = function () {
    if (this._state !== "playing") return;
    // Capture elapsed so we can resume precisely.
    this._elapsedBeforePause += performance.now() - this._sceneStart;
    this._clearTimers();
    this._state = "paused";
    this._syncPlayBtn();
  };

  SceneEngine.prototype.toggle = function () {
    if (this._state === "playing") this.pause();
    else this.play();
  };

  SceneEngine.prototype.next = function () {
    if (!this.scenes.length) return;
    if (this.index >= this.scenes.length - 1) {
      // Already last: settle on ended/hold.
      if (this.holdOnEnd) {
        this._clearTimers();
        this._state = "ended";
        this._setProgress(1);
        this._syncPlayBtn();
        this._renderCounter();
      }
      return;
    }
    this._goToInternal(this.index + 1);
  };

  SceneEngine.prototype.prev = function () {
    if (!this.scenes.length) return;
    this._goToInternal(Math.max(this.index - 1, 0));
  };

  SceneEngine.prototype.goTo = function (i) {
    if (!this.scenes.length) return;
    this._goToInternal(Math.max(0, Math.min(i, this.scenes.length - 1)));
  };

  SceneEngine.prototype._goToInternal = function (i) {
    this._clearTimers();
    this._elapsedBeforePause = 0;
    this._activate(i);
    this._renderCounter();
    if (this._state === "playing") {
      this._startScene();
    } else {
      // Keep paused but show correct duration baseline.
      this._durationMs = this._currentDurationMs();
      this._setProgress(0);
      if (this._state === "ended") { this._state = "paused"; this._syncPlayBtn(); }
    }
  };

  SceneEngine.prototype.setSpeed = function (m) {
    var newSpeed = clampSpeed(m);
    if (this._state === "playing" && this._durationMs > 0) {
      // Recompute remaining proportionally so the change is smooth.
      var elapsed = this._elapsedBeforePause + (performance.now() - this._sceneStart);
      var fractionDone = Math.min(elapsed / this._durationMs, 1);
      this.speed = newSpeed;
      var newDuration = this._currentDurationMs();
      this._durationMs = newDuration;
      this._elapsedBeforePause = fractionDone * newDuration;
      this._clearTimers();
      this._sceneStart = performance.now();
      var remaining = Math.max(newDuration - this._elapsedBeforePause, 0);
      this._scheduleAdvance(remaining);
      this._tickProgress();
    } else {
      this.speed = newSpeed;
      this._durationMs = this._currentDurationMs();
    }
    this._syncSpeedBtns();
  };

  SceneEngine.prototype.replay = function () {
    this._clearTimers();
    this._elapsedBeforePause = 0;
    this._activate(0);
    this._state = "playing";
    this._syncPlayBtn();
    this._startScene();
    this._renderCounter();
  };

  Object.defineProperty(SceneEngine.prototype, "state", {
    get: function () { return this._state; }
  });

  /* ---- UI sync --------------------------------------------------------- */

  SceneEngine.prototype._syncPlayBtn = function () {
    if (!this._els) return;
    var playing = this._state === "playing";
    this._els.playBtn.textContent = playing ? "⏸" : (this._state === "ended" ? "↺" : "▶");
    this._els.playBtn.title = this._state === "ended"
      ? "Replay (R)"
      : (playing ? "Pause (Space)" : "Play (Space)");
  };

  SceneEngine.prototype._syncSpeedBtns = function () {
    if (!this._els) return;
    var self = this;
    this._els.speedBtns.forEach(function (b) {
      var on = parseFloat(b.getAttribute("data-speed")) === self.speed;
      b.classList.toggle("is-active", on);
    });
  };

  SceneEngine.prototype._renderCounter = function () {
    if (!this._els) return;
    var total = this.scenes.length;
    var n = this.index + 1;
    var label = (this.timeline[this.index] && this.timeline[this.index].label) ||
                (this.scenes[this.index] && this.scenes[this.index].spec.label) || "";
    var status = this._state === "ended" ? " · done" : "";
    this._els.counter.innerHTML =
      "<b>" + n + " / " + total + "</b><br>" + (label || "") + status;
  };

  global.SceneEngine = SceneEngine;
})(typeof window !== "undefined" ? window : this);
