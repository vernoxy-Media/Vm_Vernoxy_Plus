const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A4 at 96 dpi. */
const PAGE_W = 794;
const PAGE_H = 1123;

/**
 * The document in its own full-size, off-screen iframe, ready once its images and web fonts
 * (DM Sans) have loaded — printing or capturing earlier would miss them.
 */
async function openDocumentFrame(html: string, title: string): Promise<{ iframe: HTMLIFrameElement; doc: Document; win: Window } | null> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.setAttribute('aria-hidden', 'true');
  // Full A4 size but off-screen: a zero-size or hidden frame prints blank in some browsers.
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PAGE_W}px`,
    height: `${PAGE_H}px`,
    border: '0',
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return null;
  }
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}</style>
</head><body>${html}</body></html>`);
  doc.close();

  const images = Promise.all(
    Array.from(doc.images).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );
  const fonts = doc.fonts ? doc.fonts.ready.then(() => undefined, () => undefined) : Promise.resolve();
  await Promise.all([images, fonts]);
  return { iframe, doc, win };
}

/**
 * Print an HTML document (a Salary Slip, a Quotation) as one A4 page. The browser's print dialog
 * also saves it: choose "Save as PDF"; the file is named after `title`.
 */
export function printHtmlDocument(html: string, title: string): void {
  void openDocumentFrame(html, title).then((frame) => {
    if (!frame) return;
    const { iframe, win } = frame;
    const cleanup = () => {
      win.removeEventListener('afterprint', cleanup);
      iframe.remove();
    };
    win.addEventListener('afterprint', cleanup);
    win.focus();
    win.print();
    window.setTimeout(cleanup, 60_000);
  });
}
