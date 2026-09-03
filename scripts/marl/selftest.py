"""Injects an interaction self-test into the built Coordinate lab page.

The lab is driven by real clicks in a real browser, because that is the only
way to check the wiring between the controls, the learners and the replay.
Kept as a script so it survives a rebuild wiping dist/.
"""
import pathlib, sys

HARNESS = r"""
<div id="selftest" style="position:fixed;top:0;left:0;z-index:99999;background:#fff;
     border:2px solid #000;padding:10px;font:12px monospace;max-width:700px;
     white-space:pre-wrap">running...</div>
<script type="module">
const out = document.getElementById('selftest');
const log = [];
const say = (s) => { log.push(s); out.textContent = log.join('\n'); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fail = [];
const check = (name, cond, detail) => {
  if (!cond) fail.push(name);
  say((cond ? 'PASS ' : 'FAIL ') + name.padEnd(22) + (detail ?? ''));
};

try {
  await customElements.whenDefined('switch-grid-play');
  await customElements.whenDefined('joint-action-scale');
  await customElements.whenDefined('coordinate-training');
  await sleep(150);

  // 1. manual play
  const play = document.querySelector('switch-grid-play');
  const step = play.querySelector('[data-step]');
  play.querySelector('[data-agent="0"] [data-a="3"]').click();
  play.querySelector('[data-agent="1"] [data-a="2"]').click();
  for (let i = 0; i < 4; i++) { step.click(); await sleep(25); }
  const status = play.querySelector('[data-status]').textContent.trim();
  check('manual play solves', /Both switches held on step 4/.test(status), status);
  check('step locks on done', step.disabled === true);

  // 2. reset
  play.querySelector('[data-reset]').click();
  await sleep(40);
  check('reset clears', play.querySelector('[data-t]').textContent === '0'
        && step.disabled === false,
        't=' + play.querySelector('[data-t]').textContent);

  // 3. joint action scale
  const jas = document.querySelector('joint-action-scale');
  const sl = jas.querySelector('[data-n]');
  sl.value = '6';
  sl.dispatchEvent(new Event('input', {bubbles:true}));
  await sleep(40);
  const read = jas.querySelector('[data-read]').textContent.trim();
  check('joint action count', read.includes('15,625'), read);

  // 4. train both
  const ctr = document.querySelector('coordinate-training');
  for (const m of ['iql','vdn']) {
    ctr.querySelector(`[data-train="${m}"]`).click();
    let ok = false;
    for (let i = 0; i < 400; i++) {
      await sleep(40);
      if (/trained on/.test(ctr.querySelector('[data-phase]').textContent)) { ok = true; break; }
    }
    check('train ' + m, ok, ctr.querySelector('[data-phase]').textContent.trim());
  }
  const cells = [...ctr.querySelectorAll('[data-rows] tr')]
    .map(tr => [...tr.children].map(c => c.textContent.trim()).join('|'));
  check('metrics table', cells.length === 2 && cells.every(c => c.includes('%')),
        cells.join('   '));
  check('two curves drawn', ctr.querySelectorAll('.ct__line').length === 2,
        'lines=' + ctr.querySelectorAll('.ct__line').length);

  // 5. replay
  const rb = ctr.querySelector('[data-replay="iql"]');
  check('replay enabled', rb.disabled === false);
  rb.click();
  await sleep(900);
  const note = ctr.querySelector('[data-replaynote]').textContent.trim();
  check('replay runs', /step \d+ of \d+/.test(note), note);

  // 6. reset training
  ctr.querySelector('[data-reset]').click();
  await sleep(60);
  check('reset training', ctr.querySelectorAll('.ct__line').length === 0
        && ctr.querySelector('[data-replay="iql"]').disabled === true);

  say('');
  say(fail.length ? 'FAILURES: ' + fail.join(', ') : 'ALL CHECKS PASSED');
} catch (e) {
  say('THREW: ' + (e && e.message ? e.message : String(e)));
}
</script>
"""

src = pathlib.Path('dist/coordinate/lab/index.html')
if not src.exists():
    sys.exit('build dist first')
out = pathlib.Path('dist/co_selftest.html')
out.write_text(src.read_text().replace('</body>', HARNESS + '</body>'))
print(f'wrote {out}')
