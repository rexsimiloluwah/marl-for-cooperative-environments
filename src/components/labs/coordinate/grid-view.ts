/**
 * SVG renderer for the switch gridworld.
 *
 * Shared by the manual-play panel and the trajectory replay so that a learner
 * sees the identical picture in both, and a trained policy's behaviour is
 * directly comparable with their own attempts.
 *
 * Draws into a caller-supplied <svg>. No animation library: positions move by
 * a CSS transition on the transform, which the reduced-motion rule in the
 * component's stylesheet disables.
 */
import { GRID, SWITCHES } from '../../../lib/marl/coordinate/environment';
import type { Cell } from '../../../lib/marl/coordinate/types';

const SVG = 'http://www.w3.org/2000/svg';
export const TILE = 44;
export const PAD = 10;
export const SIZE = GRID * TILE + PAD * 2;

const el = <K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

const cx = (c: Cell) => PAD + c.col * TILE + TILE / 2;
const cy = (c: Cell) => PAD + c.row * TILE + TILE / 2;

export interface GridView {
  update(positions: readonly [Cell, Cell], onSwitch: readonly [boolean, boolean]): void;
}

export function createGridView(svg: SVGSVGElement): GridView {
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.replaceChildren();

  // tiles
  for (let r = 0; r < GRID; r += 1) {
    for (let c = 0; c < GRID; c += 1) {
      svg.append(
        el('rect', {
          x: PAD + c * TILE,
          y: PAD + r * TILE,
          width: TILE,
          height: TILE,
          rx: 3,
          class: 'cg__tile',
        }),
      );
    }
  }

  // switches, drawn under the agents
  const switchNodes = SWITCHES.map((s, i) =>
    svg.appendChild(
      el('rect', {
        x: PAD + s.col * TILE + 6,
        y: PAD + s.row * TILE + 6,
        width: TILE - 12,
        height: TILE - 12,
        rx: 4,
        class: `cg__switch cg__switch--${i}`,
      }),
    ),
  );
  SWITCHES.forEach((s, i) => {
    const label = el('text', {
      x: cx(s),
      y: cy(s) + 4,
      'text-anchor': 'middle',
      class: 'cg__switchLabel',
    });
    label.textContent = i === 0 ? 'A' : 'B';
    svg.append(label);
  });

  const agentNodes = [0, 1].map((i) => {
    const g = el('g', { class: `cg__agent cg__agent--${i}` });
    g.append(el('circle', { r: 13, class: 'cg__agentBody' }));
    const label = el('text', { 'text-anchor': 'middle', y: 4, class: 'cg__agentLabel' });
    label.textContent = i === 0 ? 'A' : 'B';
    g.append(label);
    svg.append(g);
    return g;
  });

  return {
    update(positions, onSwitch) {
      agentNodes.forEach((g, i) => {
        g.setAttribute('transform', `translate(${cx(positions[i])} ${cy(positions[i])})`);
      });
      switchNodes.forEach((s, i) => {
        s.classList.toggle('is-active', onSwitch[i]);
      });
      const both = onSwitch[0] && onSwitch[1];
      svg.classList.toggle('is-solved', both);
    },
  };
}
