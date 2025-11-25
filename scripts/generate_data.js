const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..", "backend", "data");
const STRESS_FOLDER_NAME = "dir_001";
const STRESS_FILE_COUNT = 100000;
const MIN_FILES_PER_OTHER_FOLDER = 100;
const MAX_FOLDERS = 50;
const FILE_EXTENSION = ".dat";
const FILE_CONTENT = "Test data for API performance evaluation.";

function log(message) {
  console.log("[DATA GEN] " + message);
}

function logError(message, error) {
  console.error("[DATA GEN ERROR] " + message, error ? error.message : "");
}

function generateData() {
  log(
    "Starting data generation for 100k file stress test (Non-destructive mode)..."
  );

  try {
    if (!fs.existsSync(ROOT_DIR)) {
      fs.mkdirSync(ROOT_DIR, { recursive: true });
      log("Created root data directory: " + ROOT_DIR);
    } else {
      log("Root data directory already exists: " + ROOT_DIR);
    }
  } catch (e) {
    logError("Could not ensure root directory exists.", e);
    return;
  }

  let foldersCreated = 0;
  let totalFilesCreated = 0;
  let filesAdded = 0;

  log(
    "Target: " +
      MAX_FOLDERS +
      " folders. " +
      STRESS_FOLDER_NAME +
      " targeted for " +
      STRESS_FILE_COUNT +
      " files."
  );

  for (let i = 1; i <= MAX_FOLDERS; i++) {
    const folderName = "dir_" + String(i).padStart(3, "0");
    const folderPath = path.join(ROOT_DIR, folderName);

    let targetFileCount;

    if (i === 1) {
      targetFileCount = STRESS_FILE_COUNT;
    } else {
      targetFileCount = MIN_FILES_PER_OTHER_FOLDER;
    }

    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
        foldersCreated++;
        log("Created folder: " + folderName);
      } else {
        log("Folder " + folderName + " already exists. Checking file count.");
      }

      const currentFiles = fs
        .readdirSync(folderPath)
        .filter((file) => path.extname(file) === FILE_EXTENSION).length;

      if (currentFiles >= targetFileCount) {
        log(
          "Folder " +
            folderName +
            " already contains " +
            currentFiles +
            " files (Target: " +
            targetFileCount +
            "). Skipping file creation."
        );
        totalFilesCreated += currentFiles;
        continue;
      }

      const filesToCreate = targetFileCount - currentFiles;
      log(
        "Creating " +
          filesToCreate +
          " new files in " +
          folderName +
          ". (Total in folder will be " +
          targetFileCount +
          ")"
      );

      for (let j = currentFiles + 1; j <= targetFileCount; j++) {
        const fileName = "file_" + String(j).padStart(6, "0") + FILE_EXTENSION;
        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, FILE_CONTENT);
        filesAdded++;
      }
      totalFilesCreated += targetFileCount;
    } catch (e) {
      logError("Error processing folder " + folderName, e);
      break;
    }
  }

  log("Finished structure review/update.");
  log("Total folders reviewed/created: " + foldersCreated);
  log("Total files added in this run: " + filesAdded);
  log("Total files present in relevant folders: " + totalFilesCreated);

  if (
    foldersCreated === MAX_FOLDERS ||
    fs.existsSync(path.join(ROOT_DIR, STRESS_FOLDER_NAME))
  ) {
    log("Data generation prerequisites satisfied for testing.");
  } else {
    logError("Data generation setup appears incomplete.");
  }
}

generateData();
