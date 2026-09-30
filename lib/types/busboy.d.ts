declare module "busboy" {
  import { Readable, Writable } from "stream";

  export interface FileInfo {
    filename: string;
    encoding: string;
    mimeType: string;
  }

  export interface Limits {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  }

  export interface BusboyConfig {
    headers: { [key: string]: string | string[] | undefined };
    highWaterMark?: number;
    fileHwm?: number;
    defCharset?: string;
    defParamCharset?: string;
    preservePath?: boolean;
    limits?: Limits;
  }

  export interface Busboy extends Writable {
    on(event: "file", listener: (name: string, stream: Readable, info: FileInfo) => void): this;
    on(event: "field", listener: (name: string, val: string, info: { nameTruncated: boolean; valueTruncated: boolean; encoding: string; mimeType: string }) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (error: any) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  function Busboy(config: BusboyConfig): Busboy;
  export default Busboy;
}
