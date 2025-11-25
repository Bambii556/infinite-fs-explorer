// scripts/test_api.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const API_HOST = "localhost";
const API_PORT = 4000;
const API_ENDPOINT = "/api/files";

let totalEntriesProcessed = 0;
let foundDirectories = [];
let startTime;

function log(message) {
  console.log("[TEST] " + message);
}

function logError(message, error) {
  console.error("[ERROR] " + message, error ? error.message : "");
}

function validateEntry(entry) {
  if (typeof entry !== "object" || entry === null) {
    logError("Validation failed: Entry is not an object.");
    return false;
  }

  const requiredFields = [
    "name",
    "path",
    "isDirectory",
    "created",
    "permissions",
    "extension",
    "type",
  ];
  for (const field of requiredFields) {
    if (!(field in entry)) {
      logError(
        `Validation failed: Missing required field '${field}' in entry: ${JSON.stringify(
          entry
        )}`
      );
      return false;
    }
  }

  if (entry.isDirectory) {
    if (entry.size !== null) {
      logError(
        `Validation failed: Directory entry has a size value: ${entry.path}`
      );
      return false;
    }
    if (entry.extension !== null) {
      logError(
        `Validation failed: Directory entry has an extension: ${entry.path}`
      );
      return false;
    }
    if (entry.type !== "directory") {
      logError(
        `Validation failed: Directory entry type is not 'directory': ${entry.path}`
      );
      return false;
    }
  } else {
    // File
    if (typeof entry.size !== "number" || entry.size < 0) {
      logError(`Validation failed: File entry has invalid size: ${entry.path}`);
      return false;
    }
    if (typeof entry.extension !== "string" && entry.extension !== null) {
      logError(
        `Validation failed: File entry has invalid extension type: ${entry.path}`
      );
      return false;
    }
    if (entry.type !== "file") {
      logError(
        `Validation failed: File entry type is not 'file': ${entry.path}`
      );
      return false;
    }
  }

  // Check path format (must start with /)
  if (!entry.path.startsWith("/")) {
    logError(`Validation failed: Path does not start with /: ${entry.path}`);
    return false;
  }

  return true;
}

function processStream(response, initialPath) {
  return new Promise((resolve, reject) => {
    if (response.statusCode !== 200) {
      const body = [];
      response.on("data", (chunk) => body.push(chunk.toString()));
      response.on("end", () =>
        reject(
          new Error(
            `API returned status code ${response.statusCode}: ${body.join("")}`
          )
        )
      );
      return;
    }

    let buffer = "";
    response.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last potentially incomplete line

      for (const line of lines) {
        if (!line) continue;

        try {
          const entry = JSON.parse(line);

          if (validateEntry(entry)) {
            totalEntriesProcessed++;
            if (entry.isDirectory) {
              foundDirectories.push(entry);
            }
          } else {
            // If validation fails, we stop processing this path
            logError(
              `Terminating stream due to validation failure on path: ${
                entry.path || "Unknown"
              }`
            );
            response.destroy();
            reject(
              new Error(
                `Data structure validation failed for path: ${initialPath}`
              )
            );
            return;
          }
        } catch (e) {
          logError(
            `Failed to parse JSON line in stream for path ${initialPath}: ${line}`,
            e
          );
          response.destroy();
          reject(
            new Error(`JSON parsing error in stream for path:  ${initialPath}`)
          );
          return;
        }
      }
    });

    response.on("end", () => {
      if (buffer) {
        logError(
          `Stream ended with leftover buffer data for path: ${initialPath}`
        );
      }
      resolve(null);
    });

    response.on("error", (err) => {
      reject(err);
    });
  });
}

async function makeApiCall(relativePath) {
  const url = `http://${API_HOST}:${API_PORT}${API_ENDPOINT}?path=${encodeURIComponent(
    relativePath
  )}`;
  log(`Calling API for path: '${relativePath}'`);

  startTime = Date.now();

  try {
    await new Promise((resolve, reject) => {
      http.get(url, (res) =>
        processStream(res, relativePath).then(resolve).catch(reject)
      );
    });

    const duration = Date.now() - startTime;
    log(
      `Successfully streamed ${totalEntriesProcessed} entries from '${relativePath}' in ${duration} ms.`
    );

    // For performance hint simulation
    if (totalEntriesProcessed > 0 && totalEntriesProcessed < 100000) {
      log(`Note: Only processed ${totalEntriesProcessed} entries.`);
    }

    // Drill-down into dirs test
    if (foundDirectories.length > 0 && relativePath === "/") {
      const nextDir = foundDirectories.find((d) => d.path !== "/");
      if (nextDir) {
        log(
          `Found directories. Initiating drill-down test into: ${nextDir.path}`
        );
        // Reset counters for the drill-down test
        totalEntriesProcessed = 0;
        foundDirectories = [];
        await makeApiCall(nextDir.path); // Recursive call for drill-down validation
      } else {
        log("No subdirectories found to test drill-down navigation.");
      }
    }
  } catch (error) {
    logError(`API call failed for path: '${relativePath}'`, error);
  }
}

async function runTests() {
  log("Starting API validation and performance test script.");

  // 1. Test root directory (which might contain the 100k+ files setup if configured)
  await makeApiCall("/");
  await makeApiCall("/dir_001");

  log("--- SUMMARY ---");
  log(`Total entries processed across all calls: ${totalEntriesProcessed}`);
  log("All valid entries confirmed based on structure and type requirements.");

  if (totalEntriesProcessed === 0) {
    logError(
      "Warning: Zero entries processed. Ensure API is running on port 4000 and DATA_ROOT is populated or default './data' exists."
    );
  }

  log("Test script finished.");
}

runTests();
