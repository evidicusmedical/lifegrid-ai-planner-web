export type GridImageRendererName = "html-to-image" | "html2canvas" | "canvas2d";

export interface GridPngResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  renderer: GridImageRendererName;
}

export interface GridPngOptions {
  pixelRatio: number;
  backgroundColor: string;
  width: number;
  height: number;
  targeted: boolean;
  firefox: boolean;
  safari: boolean;
}

const RENDER_TIMEOUT_MS = 22_000;

/** Deterministic publication-title wrapping. Date labels intentionally never use this helper. */
export const wrapCanvasText = (input: { text: string; maxWidth: number; maxLines: number; measureText: (text: string) => number }) => {
  const { maxWidth, maxLines, measureText } = input;
  if (maxWidth <= 0 || maxLines <= 0) return [];
  const tokens = input.text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const appendToken = (token: string) => {
    while (measureText(token) > maxWidth && token.length > 1) {
      let cut = 1;
      while (cut < token.length && measureText(token.slice(0, cut + 1)) <= maxWidth) cut += 1;
      if (line) { lines.push(line); line = ''; }
      lines.push(token.slice(0, cut)); token = token.slice(cut);
    }
    const candidate = line ? `${line} ${token}` : token;
    if (line && measureText(candidate) > maxWidth) { lines.push(line); line = token; }
    else line = candidate;
  };
  tokens.forEach(appendToken);
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const result = lines.slice(0, maxLines);
  let final = result[maxLines - 1];
  while (final.length && measureText(`${final}…`) > maxWidth) final = final.slice(0, -1);
  result[maxLines - 1] = `${final.trimEnd()}…`;
  return result;
};

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string, onTimeout?: () => void) =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      onTimeout?.();
      reject(new Error(`${label}_TIMEOUT`));
    }, timeoutMs);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });

const validatePng = async (
  dataUrl: string,
  width: number,
  height: number,
  renderer: GridImageRendererName,
): Promise<GridPngResult> => {
  if (width <= 0 || height <= 0 || !dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("INVALID_PNG_OUTPUT");
  }
  const blob = await (await fetch(dataUrl)).blob();
  if (!blob.size) throw new Error("EMPTY_PNG_BLOB");
  if (blob.type !== "image/png") throw new Error("INVALID_PNG_MIME");
  return { dataUrl, blob, width, height, renderer };
};

const renderWithHtmlToImage = async (node: HTMLElement, options: GridPngOptions) => {
  const { toPng } = await import("html-to-image");
  const captureOptions = {
    pixelRatio: options.pixelRatio,
    backgroundColor: options.backgroundColor,
    width: options.width,
    height: options.height,
    cacheBust: true,
  };
  let dataUrl = await toPng(node, captureOptions);
  if (options.safari) {
    await toPng(node, captureOptions);
    dataUrl = await toPng(node, captureOptions);
  }
  return validatePng(dataUrl, options.width, options.height, "html-to-image");
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string"
    ? resolve(reader.result)
    : reject(new Error("INVALID_PNG_OUTPUT"));
  reader.onerror = () => reject(reader.error ?? new Error("INVALID_PNG_OUTPUT"));
  reader.readAsDataURL(blob);
});

const renderWithHtml2Canvas = async (node: HTMLElement, options: GridPngOptions) => {
  const { default: html2canvas } = await withTimeout(import("html2canvas"), RENDER_TIMEOUT_MS, "HTML2CANVAS");
  const renderPromise = html2canvas(node, {
    backgroundColor: options.backgroundColor,
    scale: options.pixelRatio,
    useCORS: true,
    logging: false,
    width: options.width,
    height: options.height,
    windowWidth: Math.max(window.innerWidth, options.width),
    windowHeight: Math.max(window.innerHeight, options.height),
  });
  const canvas = await withTimeout(renderPromise, RENDER_TIMEOUT_MS, "HTML2CANVAS");
  if (canvas.width <= 0 || canvas.height <= 0) throw new Error("INVALID_PNG_OUTPUT");
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => {
    if (!value) reject(new Error("EMPTY_PNG_BLOB"));
    else resolve(value);
  }, "image/png"));
  if (!blob.size) throw new Error("EMPTY_PNG_BLOB");
  if (blob.type !== "image/png") throw new Error("INVALID_PNG_MIME");
  const dataUrl = await blobToDataUrl(blob);
  if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("INVALID_PNG_OUTPUT");
  return { dataUrl, blob, width: canvas.width, height: canvas.height, renderer: "html2canvas" as const };
};

const isTransparent = (value: string) =>
  value === "transparent" || value === "rgba(0, 0, 0, 0)" || value === "rgba(0,0,0,0)";

const renderWithCanvas2d = async (node: HTMLElement, options: GridPngOptions): Promise<GridPngResult> => {
  await new Promise(requestAnimationFrame);
  const nodeRect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(options.width || nodeRect.width));
  const height = Math.max(1, Math.ceil(options.height || node.scrollHeight || nodeRect.height));
  const scale = Math.min(Math.max(options.pixelRatio, 1), 1.5);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("INVALID_PNG_OUTPUT");
  ctx.scale(scale, scale);
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "top";

  const relativeRect = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - nodeRect.left,
      y: rect.top - nodeRect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const setElementFont = (element: Element) => {
    const style = getComputedStyle(element);
    ctx.font = `${style.fontStyle || "normal"} ${style.fontWeight || "400"} ${style.fontSize || "12px"} ${style.fontFamily || "sans-serif"}`;
    ctx.fillStyle = style.color || "#111827";
  };

  const fitText = (text: string, maxWidth: number) => {
    if (maxWidth <= 0 || ctx.measureText(text).width <= maxWidth) return text;
    let clipped = text;
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return clipped.length ? `${clipped}…` : "";
  };

  const drawTextElement = (element: Element, insetX = 0, maxWidthOverride?: number) => {
    const text = element.textContent?.trim();
    if (!text) return;
    const rect = relativeRect(element);
    if (rect.width <= 0 || rect.height <= 0) return;
    setElementFont(element);
    const maxWidth = Math.max(0, maxWidthOverride ?? rect.width);
    ctx.fillText(fitText(text, maxWidth), rect.x + insetX, rect.y, maxWidth || undefined);
  };

  const drawWrappedEventText = (element: Element, maxLines = 3) => {
    const text = element.textContent?.trim(); if (!text) return;
    const rect = relativeRect(element); if (rect.width <= 0 || rect.height <= 0) return;
    setElementFont(element);
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 14;
    wrapCanvasText({ text, maxWidth: rect.width, maxLines, measureText: value => ctx.measureText(value).width })
      .forEach((line, index) => ctx.fillText(line, rect.x, rect.y + index * lineHeight, rect.width));
  };

  const drawBox = (element: Element, fallbackBackground?: string) => {
    const rect = relativeRect(element);
    if (rect.width <= 0 || rect.height <= 0) return;
    const style = getComputedStyle(element);
    const background = style.backgroundColor;
    if (background && !isTransparent(background)) {
      ctx.fillStyle = background;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else if (fallbackBackground) {
      ctx.fillStyle = fallbackBackground;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    const border = style.borderTopColor || style.borderColor;
    if (border && !isTransparent(border)) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, Math.max(0, rect.width - 1), Math.max(0, rect.height - 1));
    }
  };

  const header = node.querySelector<HTMLElement>('[data-testid="export-publication-header"]');
  if (header) {
    const headerStyle = getComputedStyle(header);
    const headerRect = relativeRect(header);
    const border = headerStyle.borderBottomColor;
    if (border && !isTransparent(border)) {
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(headerRect.x, headerRect.y + headerRect.height - 1);
      ctx.lineTo(headerRect.x + headerRect.width, headerRect.y + headerRect.height - 1);
      ctx.stroke();
    }
    const title = header.querySelector("h1");
    if (title) drawTextElement(title);
    header.querySelectorAll("p").forEach((paragraph) => drawTextElement(paragraph));
    header.querySelectorAll<HTMLElement>('[aria-label="Categories"] > div > span').forEach((entry) => {
      const entryRect = relativeRect(entry);
      const swatch = entry.querySelector<HTMLElement>("span");
      if (swatch) drawBox(swatch);
      setElementFont(entry);
      const label = entry.textContent?.trim() ?? "";
      const x = swatch ? relativeRect(swatch).x + relativeRect(swatch).width + 6 : entryRect.x;
      ctx.fillText(fitText(label, Math.max(0, entryRect.x + entryRect.width - x)), x, entryRect.y);
    });
  }

  const empty = node.querySelector<HTMLElement>('[data-testid="targeted-export-empty"]');
  if (empty) {
    drawBox(empty, options.backgroundColor);
    drawTextElement(empty, 0, Math.max(0, relativeRect(empty).width - 12));
  }

  node.querySelectorAll("thead th").forEach((cell) => {
    drawBox(cell, options.backgroundColor);
    drawTextElement(cell, 0, Math.max(0, relativeRect(cell).width - 12));
  });

  node.querySelectorAll("tbody td").forEach((cell) => {
    drawBox(cell, options.backgroundColor);
    const testId = cell.getAttribute("data-testid") ?? "";
    if (!testId.startsWith("targeted-export-day-")) return;
    const headerRow = cell.firstElementChild;
    if (headerRow) {
      headerRow.querySelectorAll("span").forEach((span) => drawTextElement(span));
    }
    cell.querySelectorAll<HTMLElement>("[data-source-event-id]").forEach((eventChip) => {
      drawBox(eventChip);
      eventChip.querySelectorAll("span").forEach((span) => drawWrappedEventText(span, Number(eventChip.dataset.exportTitleLines ?? 3)));
    });
    Array.from(cell.querySelectorAll<HTMLElement>("div")).forEach((candidate) => {
      const text = candidate.textContent?.trim() ?? "";
      if (/^\+\d+ more$/.test(text) && candidate.children.length === 0) drawTextElement(candidate);
    });
  });

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => {
    if (!value) reject(new Error("EMPTY_PNG_BLOB"));
    else resolve(value);
  }, "image/png"));
  if (!blob.size) throw new Error("EMPTY_PNG_BLOB");
  if (blob.type !== "image/png") throw new Error("INVALID_PNG_MIME");
  const dataUrl = await blobToDataUrl(blob);
  if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("INVALID_PNG_OUTPUT");
  return {
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
    renderer: "canvas2d",
  };
};

export const renderGridPng = async (node: HTMLElement, options: GridPngOptions) => {
  if (options.targeted && options.firefox) {
    return withTimeout(renderWithCanvas2d(node, options), RENDER_TIMEOUT_MS, "CANVAS2D");
  }
  try {
    return await withTimeout(renderWithHtmlToImage(node, options), RENDER_TIMEOUT_MS, "HTML_TO_IMAGE");
  } catch (error) {
    if (!options.targeted) throw error;
    return renderWithHtml2Canvas(node, options);
  }
};
