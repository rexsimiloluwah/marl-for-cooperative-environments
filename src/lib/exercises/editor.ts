/**
 * CODE EDITOR
 *
 * CodeMirror 6, themed from the project's design tokens and loaded lazily.
 *
 * A plain textarea was the tempting shortcut and the wrong one: Python is
 * whitespace-significant, and in a textarea Tab moves focus instead of
 * indenting, so the first thing a learner tries to do fails. Real
 * indentation handling, undo, and bracket matching are the minimum for
 * typing Python at all.
 */
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import {
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

/**
 * Syntax colours drawn from the semantic palette rather than a stock theme,
 * so code sits in the same visual language as the prose and the diagrams.
 * Both themes work because every value is a token that already flips.
 */
const highlight = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--c-policy-ink)', fontWeight: '600' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: 'var(--c-policy-ink)', fontWeight: '600' },
  { tag: [t.name, t.deleted, t.character, t.propertyName], color: 'var(--ink)' },
  { tag: [t.function(t.variableName), t.labelName], color: 'var(--c-observe-ink)' },
  { tag: [t.definition(t.variableName)], color: 'var(--ink)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--c-reward-ink)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--c-conflict-ink)' },
  { tag: [t.comment, t.blockComment, t.lineComment], color: 'var(--ink-faint)', fontStyle: 'italic' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: 'var(--ink-muted)' },
  { tag: t.self, color: 'var(--c-comm-ink)' },
  { tag: t.invalid, color: 'var(--c-conflict-ink)' },
]);

const theme = EditorView.theme({
  '&': {
    fontSize: 'var(--t-small)',
    backgroundColor: 'var(--surface)',
    color: 'var(--ink)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    padding: 'var(--s-2) 0',
  },
  // Line height is set on the line itself, not only the scroller. Starlight's
  // prose line-height otherwise cascades into the editor and nearly doubles
  // the spacing, which makes even a short function look sprawling.
  '.cm-content': { caretColor: 'var(--ui)', lineHeight: '1.55' },
  '.cm-line': { lineHeight: '1.55', padding: '0 var(--s-4)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--ink-faint)',
    border: 'none',
    paddingInlineEnd: 'var(--s-2)',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink-muted)' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--ui-tint)' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--ui-tint)' },
  '.cm-cursor': { borderLeftColor: 'var(--ui)' },
});

export interface Editor {
  getValue(): string;
  setValue(next: string): void;
  focus(): void;
  destroy(): void;
}

export function createEditor(
  parent: HTMLElement,
  initial: string,
  onChange?: (value: string) => void
): Editor {
  const extensions: Extension[] = [
    lineNumbers(),
    history(),
    python(),
    syntaxHighlighting(highlight),
    theme,
    // Four spaces, matching the Python convention the exercises are written in.
    indentUnit.of('    '),
    // `indentWithTab` last so Tab indents rather than moving focus. This does
    // trap Tab inside the editor, so Escape-then-Tab is the documented way
    // out and the exercise UI says so.
    keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange?.(update.state.doc.toString());
    }),
  ];

  const view = new EditorView({
    state: EditorState.create({ doc: initial, extensions }),
    parent,
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (next) =>
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
      }),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
