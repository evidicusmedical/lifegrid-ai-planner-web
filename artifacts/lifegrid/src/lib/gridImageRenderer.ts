export type GridImageRendererName = "html-to-image" | "html2canvas";

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
  let host: HTMLDivElement | null = null;
  let captureNode = node;
  try {
    if (options.firefox && options.targeted) {
      host = document.createElement("div");
      const captureClone = node.cloneNode(true) as HTMLElement;
      captureClone.removeAttribute("aria-hidden");
      Object.assign(captureClone.style, {
        position: "absolute", left: "0", top: "0", opacity: "1", zIndex: "0",
        pointerEvents: "none", transform: "none", margin: "0", width: `${options.width}px`,
      });
      Object.assign(host.style, {
        position: "absolute", left: "0", top: "0", width: `${options.width}px`,
        background: options.backgroundColor, zIndex: "0", pointerEvents: "none",
      });
      host.appendChild(captureClone);
      document.body.appendChild(host);
      captureNode = captureClone;
      if (document.fonts?.ready) await withTimeout(document.fonts.ready, 5_000, "HTML2CANVAS");
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      if (captureNode.scrollWidth <= 0 || captureNode.scrollHeight <= 0) {
        throw new Error("CAPTURE_NODE_ZERO_SIZE");
      }
    }
    const renderPromise = html2canvas(captureNode, {
      backgroundColor: options.backgroundColor,
      scale: options.firefox && options.targeted ? Math.min(options.pixelRatio, 1.5) : options.pixelRatio,
      useCORS: !(options.firefox && options.targeted),
      logging: false,
      width: options.width,
      height: options.height,
      scrollX: 0,
      scrollY: 0,
    });
    const canvas = await withTimeout(renderPromise, RENDER_TIMEOUT_MS, "HTML2CANVAS", () => host?.remove());
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
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["HTML2CANVAS_TIMEOUT", "INVALID_PNG_OUTPUT", "EMPTY_PNG_BLOB", "INVALID_PNG_MIME", "CAPTURE_NODE_ZERO_SIZE"].includes(code)) throw error;
    throw new Error("HTML2CANVAS_RENDER_ERROR");
  } finally {
    host?.remove();
  }
};

export const renderGridPng = async (node: HTMLElement, options: GridPngOptions) => {
  if (options.targeted && options.firefox) {
    return renderWithHtml2Canvas(node, options);
  }
  try {
    return await withTimeout(renderWithHtmlToImage(node, options), RENDER_TIMEOUT_MS, "HTML_TO_IMAGE");
  } catch (error) {
    if (!options.targeted) throw error;
    return renderWithHtml2Canvas(node, options);
  }
};
