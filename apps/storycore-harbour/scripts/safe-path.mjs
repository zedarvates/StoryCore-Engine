import { realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));

export async function resolveExistingAppFile(inputPath, options = {}) {
  const allowedExtensions = new Set(
    (options.allowedExtensions || []).map((extension) => String(extension).toLowerCase()),
  );

  if (typeof inputPath !== "string" || !inputPath.trim() || inputPath.includes("\0")) {
    throw pathError("ERR_APP_PATH_INVALID", "A non-empty app-local file path is required.");
  }

  const rootPath = await realpath(APP_ROOT);
  const candidatePath = await realpath(resolve(rootPath, inputPath));
  const relativePath = relative(rootPath, candidatePath);

  if (!isWithinRoot(relativePath)) {
    throw pathError("ERR_APP_PATH_OUTSIDE_ROOT", "The requested file is outside StoryCore Harbour.");
  }

  const fileInfo = await stat(candidatePath);
  if (!fileInfo.isFile()) {
    throw pathError("ERR_APP_PATH_NOT_FILE", "The requested path is not a regular file.");
  }

  if (allowedExtensions.size > 0 && !allowedExtensions.has(extname(candidatePath).toLowerCase())) {
    throw pathError("ERR_APP_PATH_EXTENSION", "The requested file type is not allowed.");
  }

  return {
    absolutePath: candidatePath,
    displayPath: relativePath.split(sep).join("/"),
  };
}

export function safeFileErrorCode(error) {
  const code = String(error?.code || error?.name || "");
  const allowed = new Set([
    "ERR_APP_PATH_INVALID",
    "ERR_APP_PATH_OUTSIDE_ROOT",
    "ERR_APP_PATH_NOT_FILE",
    "ERR_APP_PATH_EXTENSION",
    "ENOENT",
    "EACCES",
    "EPERM",
    "SyntaxError",
  ]);
  return allowed.has(code) ? code : "ERR_FILE_VALIDATION_FAILED";
}

function isWithinRoot(relativePath) {
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

function pathError(code, message) {
  const error = new Error(message);
  error.name = code;
  error.code = code;
  return error;
}
