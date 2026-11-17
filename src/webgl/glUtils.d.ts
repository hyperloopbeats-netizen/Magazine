export const FULLSCREEN_VERT_GLSL: string;
export const GLSL_OPTICAL_COMMON: string;

export function createWebGL2Context(
  canvasEl: HTMLCanvasElement,
  options?: { isScreenshotMode?: boolean; alpha?: boolean }
): WebGL2RenderingContext | null;

export function createProgram(
  gl: WebGL2RenderingContext,
  vertSource: string,
  fragSource: string,
  label?: string
): WebGLProgram;

export function getUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniformNames?: string[]
): Record<string, WebGLUniformLocation | null>;

export function createFullscreenVAO(gl: WebGL2RenderingContext): WebGLVertexArrayObject;

export function drawFullscreenTriangle(
  gl: WebGL2RenderingContext,
  vao: WebGLVertexArrayObject | null
): void;

export function createSolidTexture(
  gl: WebGL2RenderingContext,
  rgba?: [number, number, number, number]
): WebGLTexture;

export function loadImageDecoded(url: string): Promise<HTMLImageElement>;

export function createTextureFromImage(
  gl: WebGL2RenderingContext,
  img: HTMLImageElement,
  options?: { mipmaps?: boolean }
): {
  texture: WebGLTexture;
  width: number;
  height: number;
  aspect: number;
  img: HTMLImageElement;
};

export function resizeCanvasToDisplaySize(
  canvasEl: HTMLCanvasElement,
  maxDpr?: number
): {
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  aspect: number;
  resized: boolean;
};

export function drawImageCover2D(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  destW: number,
  destH: number
): void;
