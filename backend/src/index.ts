import express from "express";
import cors from "cors";
import path from "path";
import { opendir, stat } from "fs/promises";
import { Readable, Transform } from "stream";
import { DirentToJSONStream } from "./utils/DirentToJSONStream.js";

const app = express();
app.use(cors());

// First attempt: Basic streaming of directory entries as JSON lines
app.get("/api/files/v1", async (req, res) => {
  const requestPath = (req.query.path as string) || "";
  const rootDir = path.resolve(process.env.DATA_ROOT || "./data");
  const fullPath = path.resolve(rootDir, "." + requestPath);

  // Security things
  if (!fullPath.startsWith(rootDir)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();

  try {
    let count = 0;
    const dir = await opendir(fullPath);

    for await (const dirent of dir) {
      count++;
      const name = dirent.name;
      const isDir = dirent.isDirectory();
      const filePath = path.join(fullPath, name);

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
          continue;
        }
      }

      const relative = path.relative(rootDir, filePath);
      const cleanPath = relative ? "/" + relative.replace(/\\/g, "/") : "/";

      const obj = {
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

      if (!res.write(JSON.stringify(obj) + "\n")) {
        // Pause if Client cant Handle things.
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
    console.log(`Streamed ${count} entries from: ${requestPath || "/"}`);

    res.end();
  } catch (err: any) {
    console.error("Failed to read directory:", fullPath, err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read directory" });
    }
  }
});

app.get("/api/files", async (req, res) => {
  const requestPath = (req.query.path as string) || "";
  const rootDir = path.resolve(process.env.DATA_ROOT || "./data");
  const fullPath = path.resolve(rootDir, "." + requestPath);

  // Security things
  if (!fullPath.startsWith(rootDir)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");

  try {
    const dir = await opendir(fullPath);

    const direntStream = Readable.from(dir);

    const jsonStream = new DirentToJSONStream(rootDir, fullPath);

    // Pipe: direntStream -> jsonStream -> res
    direntStream
      .pipe(jsonStream)
      .pipe(res)
      .on("finish", () => {
        console.log(`Streamed entries from: ${requestPath || "/"}`);
      })
      .on("error", (err) => {
        console.error("Error during streaming:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to stream directory entries" });
        } else {
          res.end();
        }
      });
  } catch (err: any) {
    console.error("Failed to open directory:", fullPath, err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read directory" });
    }
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(
    `Root directory: ${path.resolve(process.env.DATA_ROOT || "./backend/data")}`
  );
});
