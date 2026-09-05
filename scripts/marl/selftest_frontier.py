"""
Drive the frontier chapter's two interactives with real clicks.

The Dec-POMDP switch and the advantage playground both compute in the browser,
so building cleanly proves nothing about whether they work.
"""
import pathlib, sys

HARNESS = r"""
<div id="selftest" style="position:fixed;top:0;left:0;z-index:99999;background:#fff;
     border:2px solid #000;padding:10px;font:12px monospace;max-width:760px;
     white-space:pre-wrap">running...</div>
<script type="module">
const out = document.getElementById('selftest');
const log = [];
const say = (s) => { log.push(s); out.textContent = log.join('\n'); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fail = [];
const check = (name, cond, detail) => {
  if (!cond) fail.push(name);
  say((cond ? 'PASS ' : 'FAIL ') + name.padEnd(38) + (detail ?? ''));
};

try {
  await sleep(200);
  __BODY__
} catch (e) {
  say('THREW ' + (e && e.message ? e.message : String(e)));
  fail.push('exception');
}
say(fail.length ? ('FAILED: ' + fail.join(', ')) : 'ALL PASS');
document.title = fail.length ? 'SELFTEST FAIL' : 'SELFTEST OK';
</script>
"""

MORPH = r"""
  const root = document.querySelector('[data-dec-pomdp-morph]');
  check('morph present', !!root);
  const slot = (n) => root.querySelector(`[data-slot="${n}"]`).textContent.trim();
  check('starts in Dec-POMDP labels', slot('obs-0') === 'o¹', slot('obs-0'));
  check('policy label', slot('pol-0') === 'π₁', slot('pol-0'));

  root.querySelector('[data-mode="llm"]').click();
  await sleep(60);
  check('switches to LLM labels', slot('obs-0') === 'Prompt A', slot('obs-0'));
  check('policy becomes a model', slot('pol-0') === 'LLM A', slot('pol-0'));
  check('action becomes a response', slot('act-0') === 'Response A', slot('act-0'));
  check('environment relabelled', slot('env') === 'User / system', slot('env'));
  check('aria-pressed follows', root.querySelector('[data-mode="llm"]').getAttribute('aria-pressed') === 'true');

  root.querySelector('[data-mode="marl"]').click();
  await sleep(60);
  check('switches back', slot('obs-0') === 'o¹', slot('obs-0'));
"""

PLAY = r"""
  const ga = document.querySelector('group-advantage') || document.querySelector('[data-group-advantage]');
  check('playground upgraded', ga && ga.tagName.toLowerCase() === 'group-advantage', ga && ga.tagName);
  const sliders = [...ga.querySelectorAll('[data-score]')];
  check('four sliders', sliders.length === 4, String(sliders.length));

  const mean = () => Number(ga.querySelector('[data-mean-value]').textContent);
  const sd = () => Number(ga.querySelector('[data-sd-value]').textContent);
  const rows = () => [...ga.querySelectorAll('[data-table] tr')];

  // defaults 0.8 0.3 0.9 0.5 -> mean 0.625
  check('mean of the defaults', Math.abs(mean() - 0.63) < 0.02, String(mean()));
  check('table has a row per candidate', rows().length === 4, String(rows().length));
  check('bars drawn', ga.querySelectorAll('[data-bars] rect').length === 4);
  check('mean line drawn', ga.querySelectorAll('[data-mean] line').length === 1);

  const set = (i, v) => {
    sliders[i].value = String(v);
    sliders[i].dispatchEvent(new Event('input', { bubbles: true }));
  };

  // all equal -> no signal
  [0,1,2,3].forEach(i => set(i, 0.5));
  await sleep(60);
  check('equal scores give zero spread', sd() === 0, String(sd()));
  check('nothing reinforced', ga.querySelector('[data-count]').textContent.startsWith('0 of'),
        ga.querySelector('[data-count]').textContent);
  check('says the signal vanishes', /no learning signal/.test(ga.querySelector('[data-note]').textContent));
  check('advantage is n/a, not a divide by zero',
        rows()[0].children[3].textContent.trim() === 'n/a', rows()[0].children[3].textContent);

  // shifting every score by the same amount must not change the advantages
  [0,1,2,3].forEach(i => set(i, [0.2,0.4,0.6,0.8][i]));
  await sleep(60);
  const before = rows().map(r => r.children[3].textContent.trim());
  [0,1,2,3].forEach(i => set(i, [0.4,0.6,0.8,1.0][i]));
  await sleep(60);
  const after = rows().map(r => r.children[3].textContent.trim());
  check('shift-invariant advantages', JSON.stringify(before) === JSON.stringify(after),
        before.join(' ') + '  vs  ' + after.join(' '));

  // one clear winner
  [0,1,2,3].forEach(i => set(i, [0.1,0.1,0.1,1.0][i]));
  await sleep(60);
  check('only the winner is reinforced', ga.querySelector('[data-count]').textContent.startsWith('1 of'),
        ga.querySelector('[data-count]').textContent);
  check('winner has positive advantage', rows()[3].children[3].textContent.trim().startsWith('+'),
        rows()[3].children[3].textContent);

  ga.querySelector('[data-reset]').click();
  await sleep(60);
  check('reset restores the defaults', Math.abs(mean() - 0.63) < 0.02, String(mean()));
"""

def inject(page: pathlib.Path, body: str) -> pathlib.Path:
    html = page.read_text()
    out = page.with_name('selftest.html')
    out.write_text(html.replace('</body>', HARNESS.replace('__BODY__', body) + '</body>'))
    return out

if __name__ == '__main__':
    dist = pathlib.Path('dist')
    targets = [
        (dist / 'frontier/learning-llm-collaboration/index.html', MORPH + PLAY),
    ]
    for page, body in targets:
        if not page.is_file():
            sys.exit(f'{page} not found: run `npx astro build` first')
        print(inject(page, body))
