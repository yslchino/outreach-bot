const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require("node:worker_threads");
const {
  AppError
} = require("../lib/errors");
if (!isMainThread) {
  try {
    const {
      parseRows
    } = require("./imports");
    parentPort.postMessage({
      result: parseRows(Buffer.from(workerData.buffer), workerData.filename)
    });
  } catch (err) {
    parentPort.postMessage({
      error: err.message
    });
  }
}
function parseUpload(buffer, filename) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      env: {},
      workerData: {
        buffer,
        filename
      },
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16
      }
    });
    let finished = false;
    const timer = setTimeout(() => {
      finished = true;
      worker.terminate();
      reject(new AppError(400, "Spreadsheet processing timed out. Export a smaller CSV and try again."));
    }, 5000);
    worker.once("message", value => {
      finished = true;
      clearTimeout(timer);
      worker.terminate();
      if (value.error) reject(new AppError(400, value.error));else resolve(value.result);
    });
    worker.once("error", () => {
      finished = true;
      clearTimeout(timer);
      reject(new AppError(400, "Could not process this file. Try a smaller CSV."));
    });
    worker.once("exit", code => {
      if (!finished) {
        clearTimeout(timer);
        reject(new AppError(400, "Spreadsheet processing stopped (" + code + ")."));
      }
    });
  });
}
module.exports = {
  parseUpload
};
