/**
 * THE FRAME READOUT, the download's: frames a second, what a frame takes, and
 * how much of that is the game's own code. What is left of a frame is the
 * graphics card and the browser, which is what a lower quality buys back.
 */
let on = false;
let frames = 0;
let since = 0;
let work = 0;

/** What one loop's frame took in the game's own code; every loop that draws reports here. */
export function worked(ms: number): void {
  if (on) work += ms;
}

function tick(now: number): void {
  if (!on) return;
  requestAnimationFrame(tick);
  if (since === 0) {
    since = now;
    work = 0;
    return;
  }
  frames++;
  const span = now - since;
  if (span >= 500 && frames > 1) {
    const readout = document.getElementById('frames');
    if (readout) readout.textContent = `${Math.round((frames * 1000) / span)} fps · ${(span / frames).toFixed(1)} ms · game ${(work / frames).toFixed(1)} ms`;
    frames = 0;
    work = 0;
    since = now;
  }
}

export function showFrames(show: boolean): void {
  const readout = document.getElementById('frames');
  if (readout) readout.hidden = !show;
  if (show === on) return;
  on = show;
  frames = 0;
  work = 0;
  since = 0;
  if (on) requestAnimationFrame(tick);
}
