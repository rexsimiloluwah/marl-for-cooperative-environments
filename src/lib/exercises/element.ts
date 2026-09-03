/**
 * <code-exercise>
 *
 * Behaviour for the exercise component. Kept out of the .astro file so it is
 * type-checked and so the markup stays readable.
 *
 * Two deliberate choices, both about honesty:
 *
 *   Checking runs TESTS, never a string comparison against a stored answer.
 *   Comparing source text would reward typing the expected characters rather
 *   than writing working code, and would fail correct solutions that happen
 *   to be written differently.
 *
 *   Revealing the solution is recorded. The tracker keeps saying the solution
 *   was revealed, because a progress display that cannot distinguish solved
 *   from read is worse than none.
 */
import { createEditor, type Editor } from './editor';
import { python } from './runtime';
import { exerciseState, resetExercise, saveExercise } from '../progress';
import type { CheckOutcome, LoadPhase } from './types';

interface Config {
  id: string;
  starter: string;
  tests: string;
  hints: string[];
  solution?: string;
}

const PHASE_TEXT: Record<LoadPhase, string> = {
  idle: '',
  downloading: 'Downloading Python, about 10 MB, once per visit',
  starting: 'Starting Python',
  ready: '',
  failed: 'Python could not be loaded',
};

class CodeExercise extends HTMLElement {
  private cfg!: Config;
  private editor: Editor | null = null;
  private hintsShown = 0;
  private busy = false;

  connectedCallback() {
    const raw = this.querySelector<HTMLScriptElement>('[data-config]')?.textContent;
    if (!raw) return;
    try {
      this.cfg = JSON.parse(raw) as Config;
    } catch {
      return;
    }

    // Build the editor only when the exercise is nearly on screen. A page can
    // carry several exercises and CodeMirror is not free.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          this.mountEditor();
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(this);

    this.wireButtons();
    this.restore();

    python().onPhase((phase, note) => this.showPhase(phase, note));
  }

  /* ---------------------------------------------------------------- setup */

  private mountEditor() {
    const host = this.querySelector<HTMLElement>('[data-editor]');
    if (!host || this.editor) return;
    const saved = exerciseState(this.cfg.id).draft;
    host.innerHTML = '';
    this.editor = createEditor(host, saved ?? this.cfg.starter, (value) =>
      saveExercise(this.cfg.id, { draft: value })
    );
    host.classList.add('is-live');
  }

  private wireButtons() {
    this.on('[data-run]', () => this.run());
    this.on('[data-check]', () => this.check());
    this.on('[data-hint]', () => this.nextHint());
    this.on('[data-solution]', () => this.reveal());
    this.on('[data-reset]', () => this.reset());
  }

  private on(sel: string, fn: () => void) {
    this.querySelector<HTMLButtonElement>(sel)?.addEventListener('click', fn);
  }

  private restore() {
    const state = exerciseState(this.cfg.id);
    if (state.passed) this.setStatus('passed');
    if (state.revealed) this.markRevealed();
  }

  /* ------------------------------------------------------------- feedback */

  private el<T extends HTMLElement>(sel: string) {
    return this.querySelector<T>(sel);
  }

  private showPhase(phase: LoadPhase, note?: string) {
    const bar = this.el('[data-phase]');
    if (!bar) return;
    const text = PHASE_TEXT[phase];
    const visible = phase === 'downloading' || phase === 'starting' || phase === 'failed';
    bar.hidden = !visible;
    bar.textContent = phase === 'failed' && note ? `${text}: ${note}` : text;
    bar.dataset.state = phase;
  }

  private setStatus(state: 'passed' | 'failed' | 'none') {
    const badge = this.el('[data-status]');
    if (!badge) return;
    badge.hidden = state === 'none';
    badge.dataset.state = state;
    badge.textContent = state === 'passed' ? 'Solved' : 'Not passing yet';
  }

  private setBusy(busy: boolean, label: string) {
    this.busy = busy;
    this.querySelectorAll<HTMLButtonElement>('[data-run],[data-check]').forEach(
      (b) => (b.disabled = busy)
    );
    const bar = this.el('[data-phase]');
    if (busy && bar) {
      bar.hidden = false;
      bar.textContent = label;
      bar.dataset.state = 'busy';
    }
  }

  private writeOutput(text: string, isError = false) {
    const panel = this.el('[data-output]');
    const body = this.el('[data-output-body]');
    if (!panel || !body) return;
    panel.hidden = text.trim() === '';
    body.textContent = text;
    body.dataset.error = String(isError);
  }

  /* ----------------------------------------------------------------- acts */

  private async run() {
    if (this.busy) return;
    this.mountEditor();
    const code = this.editor?.getValue() ?? this.cfg.starter;
    this.writeOutput('');
    this.setBusy(true, 'Running');
    let streamed = '';
    try {
      const out = await python().run(code, (chunk) => {
        streamed += chunk;
        this.writeOutput(streamed);
      });
      this.writeOutput(
        out.error ? `${out.stdout}\n${out.error}`.trim() : out.stdout || 'The code ran and printed nothing.',
        Boolean(out.error)
      );
    } catch (err) {
      this.writeOutput(err instanceof Error ? err.message : String(err), true);
    } finally {
      this.setBusy(false, '');
      this.showPhase(python().phase, python().note);
    }
  }

  private async check() {
    if (this.busy) return;
    this.mountEditor();
    const code = this.editor?.getValue() ?? this.cfg.starter;
    this.setBusy(true, 'Checking');
    try {
      const outcome = await python().check(code, this.cfg.tests);
      this.renderChecks(outcome);
      if (outcome.passed) {
        saveExercise(this.cfg.id, { passed: true, draft: code });
        this.setStatus('passed');
      } else {
        this.setStatus('failed');
      }
    } catch (err) {
      this.writeOutput(err instanceof Error ? err.message : String(err), true);
    } finally {
      this.setBusy(false, '');
      this.showPhase(python().phase, python().note);
    }
  }

  private renderChecks(outcome: CheckOutcome) {
    const panel = this.el('[data-checks]');
    const list = this.el('[data-checks-list]');
    const summary = this.el('[data-checks-summary]');
    if (!panel || !list || !summary) return;

    this.writeOutput(outcome.stdout, false);

    // An exception means the tests never ran. Say that plainly instead of
    // listing assertions that were never evaluated.
    if (outcome.error) {
      panel.hidden = false;
      panel.dataset.state = 'error';
      summary.textContent = 'Your code raised an error before the checks could run.';
      list.innerHTML = '';
      this.writeOutput(outcome.error, true);
      return;
    }

    panel.hidden = false;
    const failed = outcome.checks.filter((c) => !c.passed);
    panel.dataset.state = outcome.passed ? 'passed' : 'failed';
    summary.textContent = outcome.passed
      ? `All ${outcome.checks.length} checks passed.`
      : `${failed.length} of ${outcome.checks.length} checks did not pass.`;

    list.innerHTML = '';
    for (const c of outcome.checks) {
      const li = document.createElement('li');
      li.dataset.passed = String(c.passed);
      const name = document.createElement('span');
      name.className = 'ex__checkName';
      name.textContent = c.name;
      li.appendChild(name);
      if (!c.passed) {
        const detail = document.createElement('span');
        detail.className = 'ex__checkDetail';
        detail.textContent = `got ${c.actual}, expected ${c.expected}`;
        li.appendChild(detail);
        if (c.hint) {
          const hint = document.createElement('span');
          hint.className = 'ex__checkHint';
          hint.textContent = c.hint;
          li.appendChild(hint);
        }
      }
      list.appendChild(li);
    }
  }

  private nextHint() {
    const items = Array.from(this.querySelectorAll<HTMLElement>('[data-hint-item]'));
    if (!items.length) return;
    const panel = this.el('[data-hints]');
    if (panel) panel.hidden = false;
    if (this.hintsShown < items.length) {
      items[this.hintsShown]!.hidden = false;
      this.hintsShown += 1;
    }
    const btn = this.el<HTMLButtonElement>('[data-hint]');
    if (btn) {
      const left = items.length - this.hintsShown;
      btn.textContent = left > 0 ? `Hint (${left} more)` : 'No more hints';
      btn.disabled = left === 0;
    }
  }

  private reveal() {
    const btn = this.el<HTMLButtonElement>('[data-solution]');
    // Two presses: revealing is recorded, so it should not happen by accident.
    if (btn && btn.dataset.armed !== 'true') {
      btn.dataset.armed = 'true';
      btn.textContent = 'Press again to reveal';
      return;
    }
    this.markRevealed();
    saveExercise(this.cfg.id, { revealed: true });
  }

  private markRevealed() {
    const panel = this.el('[data-solution-panel]');
    if (panel) panel.hidden = false;
    const btn = this.el<HTMLButtonElement>('[data-solution]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Solution shown';
    }
  }

  private reset() {
    resetExercise(this.cfg.id);
    this.editor?.setValue(this.cfg.starter);
    this.hintsShown = 0;
    this.writeOutput('');
    const checks = this.el('[data-checks]');
    if (checks) checks.hidden = true;
    const hints = this.el('[data-hints]');
    if (hints) hints.hidden = true;
    this.querySelectorAll<HTMLElement>('[data-hint-item]').forEach(
      (el) => (el.hidden = true)
    );
    const hintBtn = this.el<HTMLButtonElement>('[data-hint]');
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.textContent = 'Hint';
    }
    this.setStatus('none');
  }
}

if (!customElements.get('code-exercise')) {
  customElements.define('code-exercise', CodeExercise);
}
