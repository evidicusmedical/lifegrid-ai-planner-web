export const copyText = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(value); return true; } catch { /* use the local fallback */ }
    }
    const textarea = document.createElement('textarea');
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const selection = document.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
    try {
      textarea.value = value;
      textarea.readOnly = true;
      textarea.setAttribute('aria-hidden', 'true');
      Object.assign(textarea.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0' });
      document.body.appendChild(textarea);
      textarea.focus(); textarea.select(); textarea.setSelectionRange(0, value.length);
      return document.execCommand('copy');
    } catch { return false; }
    finally {
      textarea.remove();
      if (selection) { selection.removeAllRanges(); ranges.forEach(range => selection.addRange(range)); }
      active?.focus();
    }
  } catch { return false; }
};

export const downloadText = (value: string, filename: string): boolean => {
  let url: string | undefined;
  let anchor: HTMLAnchorElement | undefined;
  try {
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
    url = URL.createObjectURL(blob);
    anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    return true;
  } catch { return false; }
  finally {
    anchor?.remove();
    if (url) window.setTimeout(() => URL.revokeObjectURL(url!), 1000);
  }
};
