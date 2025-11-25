import { stat } from "fs/promises";
import { Transform, TransformCallback } from "stream";
import { Dirent } from "fs";
import path from "path";
import { Entry } from "../type.js";

export class DirentToJSONStream extends Transform {
  private rootDir: string;
  private fullPath: string;

  constructor(rootDir: string, fullPath: string) {
    super({ objectMode: true }); // Process objects, not buffers
    this.rootDir = rootDir;
    this.fullPath = fullPath;
  }

  async _transform(
    dirent: Dirent,
    _encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    const name = dirent.name;
    const isDir = dirent.isDirectory();
    const filePath = path.join(this.fullPath, name);

    let size: number | null = null;
    let createdTime = 0;
    let modifiedTime = Date.now();
    let mode = isDir ? 0o755 : 0o644;

    if (!isDir) {
      try {
        const st = await stat(filePath);
        size = st.size;
        createdTime = st.birthtimeMs;
        modifiedTime = st.mtimeMs;
        mode = st.mode;
      } catch (error) {
        console.warn("Could not stat file:", filePath, error);
        return callback();
      }
    }

    const relative = path.relative(this.rootDir, filePath);
    const cleanPath = relative ? "/" + relative.replace(/\\/g, "/") : "/";

    const obj: Entry = {
      name,
      path: cleanPath,
      size,
      isDirectory: isDir,
      created: createdTime || modifiedTime,
      modified: modifiedTime,
      permissions: mode.toString(8).padStart(11, "0"),
      extension: isDir ? null : path.extname(name).slice(1) || "file",
      type: isDir ? "directory" : "file",
    };

    this.push(JSON.stringify(obj) + "\n");
    callback();
  }

  _flush(callback: TransformCallback) {
    // It is Finished :-)
    callback();
  }
}
