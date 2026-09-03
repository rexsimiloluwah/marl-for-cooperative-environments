/**
 * ANNOTATION ENGINE
 *
 * Turns a rendered KaTeX equation into a teaching diagram: labels sit outside
 * the formula and connect to individual sub-terms with drawn arrows.
 *
 * Why measure at runtime rather than author coordinates? Because hand-placed
 * offsets break the moment a font loads, a viewport narrows, or an equation is
 * edited. Terms are tagged in the LaTeX with `\mark{key}{...}`, which KaTeX
 * emits as `data-term="key"`. We find those spans, measure them, and lay the
 * labels out around them. Editing the equation cannot desynchronise the
 * annotations, because there are no coordinates to keep in sync.
 *
 * Term offsets are measured relative to the MATH element, not the stage. That
 * matters: laying out labels changes the stage's padding, which would move the
 * maths and invalidate any stage-relative measurement. Offsets inside the
 * maths are invariant under that change, so one measuring pass suffices.
 */

export type Tone =
  | 'action'
  | 'observe'
  | 'policy'
  | 'comm'
  | 'reward'
  | 'conflict';

export type Side = 'above' | 'below';
export type Shape = 'arrow' | 'underline';

export interface Annotation {
  /** Matches `\mark{term}{...}` in the LaTeX. */
  term: string;
  /** Label text. Kept short; prose belongs in the caption. */
  label: string;
  /** Which side of the equation the label sits on. */
  side?: Side;
  /** Semantic colour. Must match the concept the term refers to. */
  tone?: Tone;
  /** `arrow` draws a connector. `underline` rules the term and sits beneath. */
  shape?: Shape;
  /**
   * Plain-language reading of the term, for screen readers, e.g.
   * "pi sub i of a given o". The visual label layer is aria-hidden because
   * floating labels read as disconnected fragments; this text is emitted in
   * the caption in reading order instead. Worth filling in on any equation
   * whose terms are not obvious from the caption alone.
   */
  reads?: string;
}

/* Layout constants. Tuned against the reference annotation, not arbitrary. */
const LANE_GAP = 6; // vertical gap between stacked label lanes
const LABEL_GAP = 10; // minimum horizontal gap between labels in one lane
const STEM = 16; // connector length from label edge toward the term
const CLEAR = 9; // gap left between an arrowhead and the term itself
const RULE_DROP = 4; // how far an underline sits below the term box
const HEAD = 5; // arrowhead half-width

interface Placed {
  ann: Annotation;
  el: HTMLElement;
  /** Term centre, and top/bottom edges, relative to the maths element. */
  cx: number;
  top: number;
  bottom: number;
  width: number;
  lane: number;
  /** Final label box, relative to the stage. */
  x: number;
  y: number;
  w: number;
  h: number;
}

class AnnotatedEquation extends HTMLElement {
  private mathEl!: HTMLElement;
  private layerEl!: HTMLElement;
  private svgEl!: SVGSVGElement;
  private annotations: Annotation[] = [];
  private placed: Placed[] = [];
  private step = -1; // -1 means "all revealed"
  private ro?: ResizeObserver;
  private rafId = 0;

  connectedCallback() {
    const math = this.querySelector<HTMLElement>('[data-eqn-math]');
    const layer = this.querySelector<HTMLElement>('[data-eqn-layer]');
    const svg = this.querySelector<SVGSVGElement>('[data-eqn-wires]');
    const json = this.querySelector<HTMLScriptElement>('[data-eqn-json]');
    if (!math || !layer || !svg || !json) return;

    this.mathEl = math;
    this.layerEl = layer;
    this.svgEl = svg;

    try {
      this.annotations = JSON.parse(json.textContent || '[]');
    } catch {
      return; // Malformed data must not take the page down.
    }
    if (!this.annotations.length) return;

    this.collectLabels();
    if (!this.placed.length) return;
    this.initStepper();

    // Fonts change every measurement, so lay out again once they settle.
    this.schedule();
    if (document.fonts?.status !== 'loaded') {
      document.fonts?.ready.then(() => this.schedule());
    }

    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(this);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    cancelAnimationFrame(this.rafId);
  }

  /** Coalesce bursts of resize and font events into one layout per frame. */
  private schedule() {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.layout());
  }

  /**
   * Adopts the label elements Astro already rendered, rather than creating
   * them here. That way the labels exist in the HTML: if this script never
   * runs, they degrade to a static row of tone-coloured chips beneath the
   * equation instead of vanishing.
   */
  private collectLabels() {
    const els = this.layerEl.querySelectorAll<HTMLElement>('[data-eqn-label]');
    this.placed = [];
    this.annotations.forEach((ann, i) => {
      const el = els[i];
      if (!el) return;
      this.placed.push({
        ann, el,
        cx: 0, top: 0, bottom: 0, width: 0,
        lane: 0, x: 0, y: 0, w: 0, h: 0,
      });
    });
  }

  /**
   * An `underline` rules the term, so its label belongs below it. Drawn above,
   * the rule reads as a strikethrough and collides with superscripts.
   */
  private sideOf(ann: Annotation): Side {
    if ((ann.shape ?? 'arrow') === 'underline') return 'below';
    return ann.side ?? 'below';
  }

  /**
   * Packs labels into as few lanes as will hold them, by cumulative width.
   * Consecutive-by-x assignment keeps a lane's labels in reading order, so
   * spreading afterwards never has to cross two labels over each other.
   */
  private packLanes(group: Placed[], stageW: number): number {
    let lane = 0;
    let used = 0;
    for (const p of group) {
      const need = (used === 0 ? 0 : LABEL_GAP) + p.w;
      if (used > 0 && used + need > stageW) {
        lane += 1;
        used = p.w;
      } else {
        used += need;
      }
      p.lane = lane;
    }
    return lane + 1;
  }

  /**
   * Spreads one lane horizontally: each label wants to be centred on its own
   * term, and where two labels want overlapping space they are pushed apart
   * instead of being stacked into another lane.
   *
   * This is what stops a deeper label's arrow from crossing a shallower
   * label's box, which was the visible failure of pure stacking.
   */
  private spreadLane(lane: Placed[], stageW: number, offX: number) {
    for (const p of lane) p.x = offX + p.cx - p.w / 2;

    // Forward pass: resolve overlaps by pushing right.
    for (let i = 1; i < lane.length; i += 1) {
      const prev = lane[i - 1]!;
      lane[i]!.x = Math.max(lane[i]!.x, prev.x + prev.w + LABEL_GAP);
    }

    // If that ran off the right edge, anchor the last one and push back left.
    const last = lane[lane.length - 1]!;
    if (last.x + last.w > stageW) {
      last.x = stageW - last.w;
      for (let i = lane.length - 2; i >= 0; i -= 1) {
        const next = lane[i + 1]!;
        lane[i]!.x = Math.min(lane[i]!.x, next.x - lane[i]!.w - LABEL_GAP);
      }
    }

    for (const p of lane) p.x = Math.max(0, p.x);
  }

  private layout() {
    const stage = this.getBoundingClientRect();
    if (!stage.width) return;

    // Hand the labels over to absolute positioning before measuring them,
    // so widths are read in the context they will be laid out in rather than
    // in the static fallback flow.
    this.dataset.positioned = 'true';

    const mathBox = this.mathEl.getBoundingClientRect();

    // ---- measure each term, relative to the maths element ----
    const live: Placed[] = [];
    for (const p of this.placed) {
      const target = this.mathEl.querySelector<HTMLElement>(
        `[data-term="${CSS.escape(p.ann.term)}"]`
      );
      if (!target) {
        // A term named in the annotations is missing from the LaTeX. Hide the
        // orphan label rather than pointing an arrow at nothing. The build
        // also warns about this, so it should never reach a reader.
        p.el.style.display = 'none';
        continue;
      }
      p.el.style.display = '';
      const t = target.getBoundingClientRect();
      p.cx = t.left - mathBox.left + t.width / 2;
      p.top = t.top - mathBox.top;
      p.bottom = t.bottom - mathBox.top;
      p.width = t.width;
      p.w = p.el.offsetWidth;
      p.h = p.el.offsetHeight;
      live.push(p);
    }
    if (!live.length) return;

    // ---- lanes ----
    // Stage width does not change when we adjust vertical padding, so lanes
    // can be packed now and the result used to decide how much room to
    // reserve above and below the formula.
    const stageW = stage.width;
    const groups: Record<Side, Placed[]> = {
      above: live
        .filter((p) => this.sideOf(p.ann) === 'above')
        .sort((x, y) => x.cx - y.cx),
      below: live
        .filter((p) => this.sideOf(p.ann) === 'below')
        .sort((x, y) => x.cx - y.cx),
    };

    const lanesUsed: Record<Side, number> = {
      above: groups.above.length ? this.packLanes(groups.above, stageW) : 0,
      below: groups.below.length ? this.packLanes(groups.below, stageW) : 0,
    };

    // ---- reserve vertical room, then re-read where the maths ended up ----
    //
    // Labels sit in bands above and below the WHOLE formula, not next to each
    // term's own edge. That is how a hand-annotated equation reads, and it is
    // also the only robust choice: a term inside a denominator sits low in the
    // box, so anchoring its label to the term would drop the label on top of
    // the formula. Banding keeps every label clear of the maths and lets the
    // arrow length vary instead.
    const labelH = live[0]!.h || 18;
    const band = (lanes: number) =>
      lanes === 0 ? 0 : lanes * labelH + (lanes - 1) * LANE_GAP + STEM + CLEAR;

    this.style.setProperty('--eqn-pad-top', `${band(lanesUsed.above)}px`);
    this.style.setProperty('--eqn-pad-bottom', `${band(lanesUsed.below)}px`);

    // Padding just changed, so the maths has moved. Re-read its position.
    const stage2 = this.getBoundingClientRect();
    const math2 = this.mathEl.getBoundingClientRect();
    const offX = math2.left - stage2.left;
    const offY = math2.top - stage2.top;
    const mathH = math2.height;

    this.svgEl.setAttribute('width', `${stageW}`);
    this.svgEl.setAttribute('height', `${stage2.height}`);
    this.svgEl.setAttribute('viewBox', `0 0 ${stageW} ${stage2.height}`);

    // ---- spread each lane horizontally ----
    for (const side of ['above', 'below'] as Side[]) {
      for (let lane = 0; lane < lanesUsed[side]; lane += 1) {
        const inLane = groups[side].filter((p) => p.lane === lane);
        if (inLane.length) this.spreadLane(inLane, stageW, offX);
      }
    }

    // ---- place labels and draw connectors ----
    const wires: string[] = [];

    for (const p of live) {
      const side = this.sideOf(p.ann);
      const shape = p.ann.shape ?? 'arrow';
      const tone = p.ann.tone ?? 'policy';
      const colour = `var(--c-${tone})`;
      const up = side === 'above';
      const term = CSS.escape(p.ann.term);

      const anchorX = offX + p.cx;
      const termEdgeY = up ? offY + p.top : offY + p.bottom;

      const laneOffset = p.lane * (labelH + LANE_GAP);
      const labelY = up
        ? offY - CLEAR - STEM - labelH - laneOffset
        : offY + mathH + CLEAR + STEM + laneOffset;

      p.y = labelY;
      p.el.style.transform = `translate(${p.x}px, ${labelY}px)`;

      const labelCx = p.x + p.w / 2;
      const labelEdgeY = up ? labelY + labelH : labelY;

      // `underline` additionally rules the term's full width, which is worth
      // it when the term is wide enough that a single arrow is ambiguous
      // about how much of the expression the label refers to. The arrow then
      // meets the rule rather than the glyph.
      let tipY = termEdgeY + (up ? -CLEAR : CLEAR);
      if (shape === 'underline') {
        const ruleY = termEdgeY + RULE_DROP;
        tipY = ruleY + CLEAR;
        wires.push(
          `<line x1="${anchorX - p.width / 2}" y1="${ruleY}" x2="${anchorX + p.width / 2}" y2="${ruleY}" ` +
            `stroke="${colour}" stroke-width="2" stroke-linecap="round" data-wire="${term}" />`
        );
      }

      // Cubic that leaves the label vertically and arrives vertically, so a
      // horizontally offset label still points cleanly at its term.
      const midY = (labelEdgeY + tipY) / 2;
      wires.push(
        `<path d="M ${labelCx} ${labelEdgeY} C ${labelCx} ${midY}, ${anchorX} ${midY}, ${anchorX} ${tipY}" ` +
          `fill="none" stroke="${colour}" stroke-width="1.5" stroke-linecap="round" data-wire="${term}" />`
      );

      const dir = up ? -1 : 1;
      wires.push(
        `<path d="M ${anchorX - HEAD} ${tipY + dir * HEAD * 1.6} L ${anchorX} ${tipY} ` +
          `L ${anchorX + HEAD} ${tipY + dir * HEAD * 1.6} Z" fill="${colour}" data-wire="${term}" />`
      );
    }

    this.svgEl.innerHTML = wires.join('');
    this.applyStep();
  }

  /* ---------------------------------------------------------------------
     PROGRESSIVE REVEAL
     Stepping is the reduced-motion-friendly form of progressive disclosure:
     discrete states, no animation required. So it is offered unconditionally
     rather than being an animation that has to be disabled.
     --------------------------------------------------------------------- */

  private initStepper() {
    const bar = this.parentElement?.querySelector('[data-eqn-steps]');
    if (!bar) return;

    const prev = bar.querySelector<HTMLButtonElement>('[data-eqn-prev]');
    const next = bar.querySelector<HTMLButtonElement>('[data-eqn-next]');
    const all = bar.querySelector<HTMLButtonElement>('[data-eqn-all]');

    // Tells the stylesheet that reveal state is now under our control.
    // Until this is set, everything stays visible, so the figure is correct
    // with JavaScript disabled or still loading.
    this.dataset.stepping = 'true';

    this.step = 0; // start with the bare equation
    prev?.addEventListener('click', () => this.goto(this.step - 1));
    next?.addEventListener('click', () => this.goto(this.step + 1));
    all?.addEventListener('click', () => this.goto(-1));
  }

  private goto(n: number) {
    const total = this.annotations.length;
    this.step = n < 0 ? -1 : Math.max(0, Math.min(n, total));
    this.applyStep();
  }

  private applyStep() {
    const total = this.annotations.length;
    const shown = this.step < 0 ? total : this.step;

    this.placed.forEach((p, i) => {
      const visible = i < shown;
      p.el.classList.toggle('is-shown', visible);
      this.svgEl
        .querySelectorAll(`[data-wire="${CSS.escape(p.ann.term)}"]`)
        .forEach((w) => w.classList.toggle('is-shown', visible));
    });

    const bar = this.parentElement?.querySelector('[data-eqn-steps]');
    if (!bar) return;
    const prev = bar.querySelector<HTMLButtonElement>('[data-eqn-prev]');
    const next = bar.querySelector<HTMLButtonElement>('[data-eqn-next]');
    const count = bar.querySelector<HTMLElement>('[data-eqn-count]');
    if (prev) prev.disabled = shown === 0;
    if (next) next.disabled = shown >= total;
    if (count) {
      count.textContent =
        shown === 0
          ? 'The equation'
          : `${shown} of ${total} annotation${total === 1 ? '' : 's'}`;
    }
  }
}

if (!customElements.get('annotated-equation')) {
  customElements.define('annotated-equation', AnnotatedEquation);
}
