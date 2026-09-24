import { getVisibleStageBox } from './utils';

/**
 * Centrare il flusso significa centrarlo in cio' che si vede, non nel rettangolo del
 * contenitore: quello e' coperto a sinistra dal pannello dei blocchi e sfora a destra
 * oltre la finestra. Lo scarto fra i due centri e' la cosa che si rompe in silenzio --
 * il flusso resta sullo schermo, solo spostato -- e per questo sta qui.
 */
describe('getVisibleStageBox', () => {

  const rect = (left: number, right: number, top: number, bottom: number): DOMRect => ({
    left, right, top, bottom,
    width: right - left,
    height: bottom - top,
    x: left, y: top,
    toJSON: () => ({})
  } as DOMRect);

  /** Un pannello vero nel DOM: la funzione lo misura, non lo deduce. */
  function withPanel(width: number, run: () => void): void {
    const panel = document.createElement('div');
    panel.className = 'box-left';
    panel.style.cssText =
      `position: fixed; left: 0; top: 0; width: ${width}px; height: 100px;`;
    document.body.appendChild(panel);
    try {
      run();
    } finally {
      panel.remove();
    }
  }

  it('changes nothing when the whole container is visible', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const box = getVisibleStageBox(rect(0, w, 0, h));

    expect(box.width).toBe(w);
    expect(box.height).toBe(h);
    expect(box.offsetX).toBe(0);
    expect(box.offsetY).toBe(0);
  });

  it('takes the open panel off the left, and shifts the centre by half of it', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    withPanel(230, () => {
      const box = getVisibleStageBox(rect(0, w, 0, h));

      expect(box.width).toBe(w - 230);
      expect(box.offsetX).toBe(115);
    });
  });

  it('ignores a closed panel, which measures zero', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    withPanel(0, () => {
      const box = getVisibleStageBox(rect(0, w, 0, h));

      expect(box.width).toBe(w);
      expect(box.offsetX).toBe(0);
    });
  });

  it('cuts off what spills past the window on the right', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const box = getVisibleStageBox(rect(0, w + 300, 0, h));

    expect(box.width).toBe(w);
    expect(box.offsetX).toBe(-150);
  });

  it('falls back to the whole container when the measurements make no sense', () => {
    // Contenitore non ancora disegnato: meglio la centratura di prima che una
    // divisione per zero.
    const box = getVisibleStageBox(rect(0, 0, 0, 0));

    expect(box.width).toBe(0);
    expect(box.height).toBe(0);
  });
});
