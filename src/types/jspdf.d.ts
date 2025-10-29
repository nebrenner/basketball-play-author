declare module "jspdf" {
  type JsPdfText = string | string[];

  export class jsPDF {
    constructor(...args: unknown[]);
    internal: {
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    setFontSize(size: number): this;
    text(text: JsPdfText, x: number, y: number): this;
    addPage(): this;
    splitTextToSize(text: string, maxWidth: number): string[];
    addImage(...args: unknown[]): this;
    output(type?: string): Blob;
  }
}
