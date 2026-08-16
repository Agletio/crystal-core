/**
 * Settings — an empty shell on purpose. The rail button and this window exist
 * so there is a place the moment something needs setting; nothing does yet.
 */
const $ = (id: string) => document.getElementById(id)!;

export function isSettingsOpen(): boolean {
  return !$('settings').hidden;
}

export function openSettings(): void {
  $('settings').hidden = false;
}

export function closeSettings(): void {
  $('settings').hidden = true;
}

export function initSettings(): void {
  ($('settings-close') as HTMLButtonElement).onclick = closeSettings;
}
