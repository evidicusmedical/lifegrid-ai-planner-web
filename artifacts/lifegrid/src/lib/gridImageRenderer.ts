export type GridImageRendererName = "html-to-image" | "html2canvas" | "canvas2d";

export interface GridPngResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  renderer: GridImageRendererName;
}

export type GridPublicationRendererLayout = "day-agenda" | "rolling-day-grid" | "month-matrix" | "month-columns";
export interface GridPngOptions {
  pixelRatio: number;
  backgroundColor: string;
  width: number;
  height: number;
  targeted: boolean;
  firefox: boolean;
  safari: boolean;
  layout?: GridPublicationRendererLayout;
}

export const gridRendererStrategy = (options: Pick<GridPngOptions, "targeted" | "firefox" | "layout">): GridImageRendererName[] => {
  if (options.targeted && options.firefox) return ["canvas2d"];
  if (!options.targeted && options.firefox && options.layout === "month-columns") return ["canvas2d", "html-to-image", "html2canvas"];
  return options.layout === "month-columns"
    ? ["html-to-image", "html2canvas", "canvas2d"]
    : ["html-to-image", "html2canvas"];
};

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

export const EXACT_STRUCTURAL_TEXT_MIN_FONT_SIZE = 9;
/** Structural calendar text is reduced, if necessary, but is never prose-fitted or ellipsized. */
export const fitExactStructuralText = (input: { text: string; fontSize: number; maxWidth: number; measureAt: (text: string, fontSize: number) => number }) => {
  let fontSize = Math.max(EXACT_STRUCTURAL_TEXT_MIN_FONT_SIZE, input.fontSize);
  while (fontSize > EXACT_STRUCTURAL_TEXT_MIN_FONT_SIZE && input.measureAt(input.text, fontSize) > input.maxWidth) fontSize -= 0.5;
  return { text: input.text, fontSize: Math.max(EXACT_STRUCTURAL_TEXT_MIN_FONT_SIZE, fontSize) };
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

  const drawExactTextElement = (element: Element, availableElement: Element) => {
    const text = element.textContent?.trim(); if (!text) return;
    const rect = relativeRect(element), available = relativeRect(availableElement);
    if (rect.height <= 0 || available.width <= 0) return;
    const style = getComputedStyle(element);
    const originalSize = Number.parseFloat(style.fontSize) || 12;
    const maxWidth = Math.max(1, available.x + available.width - rect.x - 6);
    const fitted = fitExactStructuralText({ text, fontSize: originalSize, maxWidth, measureAt: (value, size) => {
      ctx.font = `${style.fontStyle || "normal"} ${style.fontWeight || "400"} ${size}px ${style.fontFamily || "sans-serif"}`;
      return ctx.measureText(value).width;
    }});
    ctx.font = `${style.fontStyle || "normal"} ${style.fontWeight || "400"} ${fitted.fontSize}px ${style.fontFamily || "sans-serif"}`;
    ctx.fillStyle = style.color || "#111827";
    ctx.fillText(fitted.text, rect.x, rect.y);
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
    header.querySelectorAll<HTMLElement>('[data-publication-legend-entry="true"]').forEach((entry) => {
      const entryRect = relativeRect(entry);
      const swatch = entry.querySelector<HTMLElement>("span");
      if (swatch) drawBox(swatch);
      const labelElement = entry.querySelector<HTMLElement>('[data-publication-legend-label="true"]');
      if (!labelElement) return;
      setElementFont(labelElement);
      const label = labelElement.textContent?.trim() ?? "";
      const x = swatch ? relativeRect(swatch).x + relativeRect(swatch).width + 6 : entryRect.x;
      const maxWidth = Math.max(0, entryRect.x + entryRect.width - x);
      const lineHeight = Number.parseFloat(getComputedStyle(labelElement).lineHeight) || 16;
      wrapCanvasText({ text: label, maxWidth, maxLines: 3, measureText: value => ctx.measureText(value).width })
        .forEach((line, index) => ctx.fillText(line, x, entryRect.y + index * lineHeight, maxWidth));
    });
  }

  const empty = node.querySelector<HTMLElement>('[data-testid="targeted-export-empty"]');
  if (empty) {
    drawBox(empty, options.backgroundColor);
    drawTextElement(empty, 0, Math.max(0, relativeRect(empty).width - 12));
  }

  if (options.layout === "day-agenda") {
    const agenda = node.querySelector<HTMLElement>('[data-testid="day-agenda"]');
    if (agenda) {
      drawBox(agenda, options.backgroundColor);
      const date = agenda.querySelector("h2"); if (date) drawTextElement(date);
      const count = agenda.querySelector(":scope > p"); if (count) drawTextElement(count);
      agenda.querySelectorAll<HTMLElement>('article[data-publication-event="true"]').forEach(card => {
        drawBox(card);
        const time = card.querySelector<HTMLElement>('[data-publication-agenda-time="true"]');
        const title = card.querySelector<HTMLElement>('[data-publication-event-title="true"]');
        if (time) drawTextElement(time);
        if (title) drawWrappedEventText(title, Number(card.dataset.exportTitleLines ?? 3));
      });
    }
  }

  node.querySelectorAll("thead th").forEach((cell) => {
    drawBox(cell, options.backgroundColor);
    const labels = Array.from(cell.children).filter(child => child.textContent?.trim());
    if (labels.length) labels.forEach(label => drawTextElement(label, 0, Math.max(0, relativeRect(cell).width - 12)));
    else drawTextElement(cell, 0, Math.max(0, relativeRect(cell).width - 12));
  });

  node.querySelectorAll("tbody td").forEach((cell) => {
    drawBox(cell, options.backgroundColor);
    const testId = cell.getAttribute("data-testid") ?? "";
    const targetedCell = testId.startsWith("targeted-export-day-");
    const monthCell = options.layout === "month-columns";
    if (!targetedCell && !monthCell) return;
    if (targetedCell) {
      const headerRow = cell.firstElementChild;
      if (headerRow) headerRow.querySelectorAll('[data-publication-exact-text="true"]').forEach((span) => drawExactTextElement(span, headerRow));
    } else if (testId.startsWith("row-day-")) {
      drawTextElement(cell, 0, Math.max(0, relativeRect(cell).width - 4));
    } else {
      const weekday = Array.from(cell.children).find(child => child.tagName === "DIV" && /^[A-Z][a-z]?$/.test(child.textContent?.trim() ?? ""));
      if (weekday) drawTextElement(weekday);
    }
    cell.querySelectorAll<HTMLElement>(targetedCell ? "[data-source-event-id]" : '[data-publication-event="true"]').forEach((eventChip) => {
      drawBox(eventChip);
      eventChip.querySelectorAll("span").forEach((span) => {
        if ((span as HTMLElement).dataset.publicationEventTitle === "true") {
          drawWrappedEventText(span, Number(eventChip.dataset.exportTitleLines ?? 3));
        } else {
          drawTextElement(span);
        }
      });
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
  const strategy = gridRendererStrategy(options);
  let finalError: unknown = new Error("INVALID_PNG_OUTPUT");
  for (const renderer of strategy) {
    try {
      if (renderer === "canvas2d") return await withTimeout(renderWithCanvas2d(node, options), RENDER_TIMEOUT_MS, "CANVAS2D");
      if (renderer === "html2canvas") return await renderWithHtml2Canvas(node, options);
      return await withTimeout(renderWithHtmlToImage(node, options), RENDER_TIMEOUT_MS, "HTML_TO_IMAGE");
    } catch (error) {
      finalError = error;
    }
  }
  throw finalError;
};
