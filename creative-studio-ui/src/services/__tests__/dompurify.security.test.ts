/**
 * Dependency-level regression for GHSA-cg2g-xh64-v4q7.
 * Creative Studio currently exports PDF text, not DOM/template content. These
 * synthetic shadow-root inputs test the installed library, not app exposure.
 */
import { describe, expect, it } from 'vitest';
import createDOMPurify from 'dompurify';

const expressions = ['${storycoreProbe}', '{{storycoreProbe}}', '<%=storycoreProbe%>'];

function appendSplitExpression(root: ShadowRoot, expression: string): void {
  // Removal of the forbidden separators makes individually harmless fragments
  // adjacent. A per-text-node check alone cannot recognize the final expression.
  for (const character of expression) {
    root.append(document.createTextNode(character), document.createElement('object'));
  }
}

describe('DOMPurify shadow-root template safety (dependency regression)', () => {
  it.each(expressions)('scrubs split %s after forbidden elements are removed', (expression) => {
    const purify = createDOMPurify(window);
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    appendSplitExpression(root, expression);
    const control = document.createElement('p');
    control.textContent = 'StoryCore ordinary prose';
    root.append(control);

    expect(purify.sanitize(host, { IN_PLACE: true, SAFE_FOR_TEMPLATES: true })).toBe(host);

    expect(host.shadowRoot).toBe(root);
    expect(root.querySelector('object')).toBeNull();
    expect(root.textContent).not.toContain(expression);
    expect(root.querySelector('p')?.textContent).toBe('StoryCore ordinary prose');
  });

  it('scrubs nested attached roots as well as template content', () => {
    const purify = createDOMPurify(window);
    const host = document.createElement('div');
    const outerRoot = host.attachShadow({ mode: 'open' });
    const child = document.createElement('section');
    outerRoot.append(child);
    const innerRoot = child.attachShadow({ mode: 'open' });
    appendSplitExpression(innerRoot, expressions[0]);
    const template = document.createElement('template');
    template.innerHTML = '$<object></object>{storycoreProbe}';
    innerRoot.append(template);

    purify.sanitize(host, { IN_PLACE: true, SAFE_FOR_TEMPLATES: true });

    expect(outerRoot.querySelector('section')).toBe(child);
    expect(child.shadowRoot).toBe(innerRoot);
    expect(innerRoot.textContent).not.toContain(expressions[0]);
    expect(template.content.textContent).not.toContain(expressions[0]);
    expect(innerRoot.querySelector('object')).toBeNull();
    expect(template.content.querySelector('object')).toBeNull();
  });

  it('keeps default string sanitization compatible with the jsPDF HTML helper', () => {
    const purify = createDOMPurify(window);
    const cleaned = purify.sanitize(
      '<p>Hello <strong>StoryCore</strong> ${literal}</p>' +
        '<img src="x" onerror="storycoreProbe()"><script>storycoreProbe()</script>',
    );
    expect(typeof cleaned).toBe('string');
    const parsed = document.createElement('div');
    parsed.innerHTML = cleaned;
    expect(parsed.querySelector('strong')?.textContent).toBe('StoryCore');
    expect(parsed.querySelector('p')?.textContent).toContain('${literal}');
    expect(parsed.querySelector('script')).toBeNull();
    expect(parsed.querySelector('img')?.hasAttribute('onerror')).toBe(false);
  });
});
