/** Only presentational HTML from source data is retained. No event handlers or scripts. */
const allowed = new Set('P DIV SECTION ARTICLE SPAN STRONG B EM I U SMALL SUB SUP BR H2 H3 H4 H5 UL OL LI TABLE THEAD TBODY TFOOT TR TH TD BLOCKQUOTE FIGURE FIGCAPTION IMG'.split(' '));
export function safeHtml(input: string): string {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form,button,input,select,textarea,svg,math').forEach(node => node.remove());
  for (const node of [...doc.body.querySelectorAll('*')].reverse()) {
    if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
    const src = node.getAttribute('src');
    const colspan = node.getAttribute('colspan'); const rowspan = node.getAttribute('rowspan');
    const alt = node.getAttribute('alt');
    for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
    if (node.tagName === 'IMG') {
      if (!src || !/^(?:https:\/\/|\/reading\/images\/|\/ielts\/assets\/)/i.test(src)) { node.remove(); continue; }
      node.setAttribute('src', src); node.setAttribute('alt', alt || '题目配图'); node.setAttribute('loading', 'lazy');
    }
    if (['TH', 'TD'].includes(node.tagName)) {
      if (colspan && /^\d{1,2}$/.test(colspan)) node.setAttribute('colspan', colspan);
      if (rowspan && /^\d{1,2}$/.test(rowspan)) node.setAttribute('rowspan', rowspan);
    }
  }
  return doc.body.innerHTML;
}
export function textFromHtml(value: string) { return new DOMParser().parseFromString(value, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || ''; }
