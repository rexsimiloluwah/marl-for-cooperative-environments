"""Drive a flashcard deck with real clicks: flip, reveal all, filter, search."""
import pathlib, sys

HARNESS = r"""
<div id="selftest" style="position:fixed;top:0;left:0;z-index:99999;background:#fff;
     border:2px solid #000;padding:10px;font:12px monospace;max-width:820px;
     white-space:pre-wrap">running...</div>
<script type="module">
const out = document.getElementById('selftest');
const log = [];
const say = (s) => { log.push(s); out.textContent = log.join('\n'); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fail = [];
const check = (name, cond, detail) => {
  if (!cond) fail.push(name);
  say((cond ? 'PASS ' : 'FAIL ') + name.padEnd(40) + (detail ?? ''));
};
try {
  await sleep(250);
  const deck = document.querySelector('[data-deck]');
  const cells = [...deck.querySelectorAll('[data-card]')];
  const count = deck.querySelector('[data-count]');
  const backs = () => cells.filter(c => c.querySelector('.fc__flip').dataset.flip === 'true').length;
  const visible = () => cells.filter(c => !c.hidden).length;

  check('deck rendered', !!deck, deck && deck.dataset.deck);
  check('ten cards', cells.length === 10, String(cells.length));
  check('all answers hidden at load', backs() === 0, String(backs()));
  check('count line', /10 cards/.test(count.textContent), count.textContent.trim());

  // maths rendered at build time, not shipped as dollar signs
  const html = deck.innerHTML;
  check('KaTeX rendered', html.includes('katex'), '');
  check('no raw LaTeX dollars', !/\$[^$<]{2,}\$/.test(deck.textContent), '');
  check('no literal backslash commands', !/\\\\(sum|pi|mathcal|frac)/.test(deck.textContent), '');

  // flip one card by its button
  const first = cells[0];
  first.querySelector('[data-toggle]').click();
  await sleep(60);
  check('button reveals one card', backs() === 1, String(backs()));
  check('aria-expanded set', first.querySelector('[data-toggle]').getAttribute('aria-expanded') === 'true');
  check('front hidden from assistive tech', first.querySelector('.fc__face--front').getAttribute('aria-hidden') === 'true');
  check('back exposed to assistive tech', first.querySelector('.fc__face--back').getAttribute('aria-hidden') === 'false');
  check('label changes', /Hide answer/.test(first.querySelector('[data-label]').textContent));

  // clicking the card body toggles it back
  first.querySelector('.fc__flip').click();
  await sleep(60);
  check('clicking the card hides it again', backs() === 0, String(backs()));

  // reveal all / hide all
  deck.querySelector('[data-reveal-all]').click();
  await sleep(60);
  check('reveal all opens every card', backs() === 10, String(backs()));
  deck.querySelector('[data-hide-all]').click();
  await sleep(60);
  check('hide all closes every card', backs() === 0, String(backs()));

  // filter by type
  const eq = [...deck.querySelectorAll('[data-filter]')].find(b => b.dataset.filter === 'Equation');
  eq.click();
  await sleep(60);
  const shown = visible();
  check('equation filter narrows the deck', shown > 0 && shown < 10, shown + ' of 10');
  check('only equation cards shown',
        cells.filter(c => !c.hidden).every(c => c.dataset.type === 'Equation'));
  check('count reflects the filter', /of 10 cards/.test(count.textContent), count.textContent.trim());

  [...deck.querySelectorAll('[data-filter]')].find(b => b.dataset.filter === 'all').click();
  await sleep(60);
  check('all filter restores the deck', visible() === 10, String(visible()));

  // search
  const input = deck.querySelector('[data-search]');
  input.value = 'partial observability';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(60);
  check('search narrows to a match', visible() >= 1 && visible() < 10, String(visible()));

  input.value = 'zzzznotacard';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(60);
  check('no match shows the empty note', visible() === 0 && !deck.querySelector('[data-empty]').hidden);

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(60);
  check('clearing search restores the deck', visible() === 10, String(visible()));

  // search must reach answer text, not just the question
  input.value = 'stochastic';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(60);
  check('search reaches answer text', visible() >= 1, String(visible()));

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(60);

  // a card must not change size when it turns
  const flips = cells.map(c => c.querySelector('.fc__flip'));
  const before = flips.map(f => f.getBoundingClientRect().height);
  check('every card has a measured height', before.every(h => h > 40), before.map(h => Math.round(h)).join(' '));
  deck.querySelector('[data-reveal-all]').click();
  await sleep(400);
  const after = flips.map(f => f.getBoundingClientRect().height);
  const moved = before.map((h, i) => Math.abs(h - after[i])).filter(d => d > 1);
  check('height is stable across the flip', moved.length === 0, moved.length + ' cards resized');

  // the back must actually fit
  const overflowing = cells.filter(c => {
    const back = c.querySelector('.fc__face--back');
    return back.scrollHeight > back.clientHeight + 2;
  });
  check('answers fit their card', overflowing.length === 0, overflowing.length + ' overflow');

  // each type carries its own tone
  const tones = new Set(cells.map(c => c.querySelector('.fc__card').dataset.tone));
  check('cards are toned by type', tones.size > 1, [...tones].join(' '));
  deck.querySelector('[data-hide-all]').click();
  await sleep(60);
} catch (e) {
  say('THREW ' + (e && e.message ? e.message : String(e)));
  fail.push('exception');
}
say(fail.length ? ('FAILED: ' + fail.join(', ')) : 'ALL PASS');
document.title = fail.length ? 'FAIL' : 'OK';
</script>
"""

if __name__ == '__main__':
    page = pathlib.Path('dist/resources/flashcards/background/index.html')
    if not page.is_file():
        sys.exit('build first')
    out = page.with_name('selftest.html')
    out.write_text(page.read_text().replace('</body>', HARNESS + '</body>'))
    print(out)
