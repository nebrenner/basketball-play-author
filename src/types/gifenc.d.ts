declare module "gifenc" {
  export type GIFPalette = number[][];
  export interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }
  export interface GIFWriteFrameOptions {
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    palette?: GIFPalette;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }
  export function GIFEncoder(options?: GIFEncoderOptions): {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFWriteFrameOptions
    ): void;
  };
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors?: number,
    opts?: Record<string, unknown>
  ): GIFPalette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GIFPalette,
    format?: string
  ): Uint8Array;
  export default GIFEncoder;
}
