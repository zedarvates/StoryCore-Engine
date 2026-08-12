const PROJECT_PREFIX = "projects/";
const CURRENT_PROJECT_KEY = "projects/current";
const PAGE_LIMIT = 100;
const MAX_PAGES = 100;
const CONFIRMATION_WINDOW_MS = 15_000;

const buttons = [...document.querySelectorAll(".delete-projects-button")];
const status = document.getElementById("deletion-status");
const runProgress = document.getElementById("run-progress");

let armedUntil = 0;
let armTimer = null;
let deleting = false;

for (const button of buttons) {
  button.addEventListener("click", handleDeleteClick);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isArmed() && !deleting) {
    resetConfirmation();
    setStatus("Project deletion cancelled.");
  }
});

async function handleDeleteClick() {
  if (deleting) return;

  if (runProgress && !runProgress.hidden) {
    setStatus("Wait for the current generation to finish before deleting saved projects.", "error");
    return;
  }

  if (!isArmed()) {
    armConfirmation();
    return;
  }

  resetConfirmation();
  await deleteAllSavedProjects();
}

function armConfirmation() {
  armedUntil = Date.now() + CONFIRMATION_WINDOW_MS;
  for (const button of buttons) {
    button.textContent = "Confirm permanent deletion";
    button.classList.add("armed");
    button.setAttribute("aria-label", "Confirm permanent deletion of all StoryCore Harbour saved projects");
  }
  setStatus(
    "Press “Confirm permanent deletion” again within 15 seconds to delete every StoryCore Harbour project saved in this App scope. This cannot be undone.",
    "warning",
  );

  clearTimeout(armTimer);
  armTimer = setTimeout(() => {
    if (!deleting && isArmed()) {
      resetConfirmation();
      setStatus("Deletion confirmation expired. No project was deleted.");
    }
  }, CONFIRMATION_WINDOW_MS + 50);
}

function resetConfirmation() {
  armedUntil = 0;
  clearTimeout(armTimer);
  armTimer = null;
  for (const button of buttons) {
    button.textContent = "Delete saved projects";
    button.classList.remove("armed");
    button.setAttribute("aria-label", "Delete all StoryCore Harbour saved projects");
  }
}

function isArmed() {
  return armedUntil > Date.now();
}

async function deleteAllSavedProjects() {
  deleting = true;
  setButtonsDisabled(true);
  setStatus("Finding StoryCore Harbour projects in your App storage…");

  try {
    const runtime = await getAnnaRuntime();
    const deletedCount = runtime
      ? await deleteAnnaProjects(runtime)
      : deleteLocalPreviewProjects();

    resetProjectUi();
    setStatus(
      deletedCount === 0
        ? "No saved StoryCore Harbour project was found."
        : `Deleted ${deletedCount} saved StoryCore Harbour project record${deletedCount === 1 ? "" : "s"}.`,
      "success",
    );
  } catch (error) {
    setStatus(normalizeDeletionError(error), "error");
  } finally {
    deleting = false;
    setButtonsDisabled(false);
  }
}

async function getAnnaRuntime() {
  if (window.anna?.storage) return window.anna;

  const runtimeStatus = document.getElementById("runtime-status");
  if (runtimeStatus?.classList.contains("offline")) return null;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(window.anna?.storage ? window.anna : null), 5_000);
    window.addEventListener(
      "storycore-harbour:anna-ready",
      () => {
        clearTimeout(timeout);
        resolve(window.anna?.storage ? window.anna : null);
      },
      { once: true },
    );
  });
}

async function deleteAnnaProjects(anna) {
  if (!anna.storage?.list || !anna.storage?.delete || !anna.storage?.get) {
    throw namedError(
      "permission_denied",
      "Anna did not expose the storage list/delete capabilities declared by StoryCore Harbour.",
    );
  }

  const rows = await listAllProjectRows(anna);
  const current = await anna.storage.get({ key: CURRENT_PROJECT_KEY });
  if (current?.exists && !rows.some((row) => row.key === CURRENT_PROJECT_KEY)) {
    rows.push({ key: CURRENT_PROJECT_KEY, etag: current.etag });
  }

  const uniqueRows = deduplicateRows(rows)
    .filter((row) => row.key.startsWith(PROJECT_PREFIX))
    .sort((left, right) => {
      if (left.key === CURRENT_PROJECT_KEY) return 1;
      if (right.key === CURRENT_PROJECT_KEY) return -1;
      return left.key.localeCompare(right.key);
    });

  let deletedCount = 0;
  for (const row of uniqueRows) {
    setStatus(`Deleting ${deletedCount + 1} of ${uniqueRows.length} saved project records…`);
    const args = { key: row.key };
    if (row.etag) args.if_match = row.etag;
    const result = await anna.storage.delete(args);
    if (result?.deleted !== false) deletedCount += 1;
  }

  const remaining = await listAllProjectRows(anna);
  const currentAfter = await anna.storage.get({ key: CURRENT_PROJECT_KEY });
  if (remaining.some((row) => row.key.startsWith(PROJECT_PREFIX)) || currentAfter?.exists) {
    throw namedError(
      "storage_delete_incomplete",
      "Anna still reports one or more StoryCore Harbour project records after deletion.",
    );
  }

  return deletedCount;
}

async function listAllProjectRows(anna) {
  const rows = [];
  const seenCursors = new Set();
  let cursor;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const args = {
      prefix: PROJECT_PREFIX,
      limit: PAGE_LIMIT,
      kind: "kv",
    };
    if (cursor) args.cursor = cursor;

    const result = await anna.storage.list(args);
    if (!result || !Array.isArray(result.items)) {
      throw namedError(
        "storage_list_invalid",
        "Anna returned an invalid project-list response. No project was deleted.",
      );
    }

    for (const item of result.items) {
      if (typeof item?.key === "string" && item.key.startsWith(PROJECT_PREFIX)) {
        rows.push({ key: item.key, etag: item.etag });
      }
    }

    const nextCursor = result.next_cursor;
    if (!nextCursor) return rows;
    if (seenCursors.has(nextCursor)) {
      throw namedError(
        "storage_cursor_loop",
        "Anna returned a repeated storage cursor. No further project was deleted.",
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw namedError(
    "storage_page_limit",
    "StoryCore Harbour reached its storage pagination safety limit. No further project was deleted.",
  );
}

function deduplicateRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    if (!row?.key) continue;
    const previous = byKey.get(row.key);
    byKey.set(row.key, {
      key: row.key,
      etag: row.etag || previous?.etag,
    });
  }
  return [...byKey.values()];
}

function deleteLocalPreviewProjects() {
  const keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(PROJECT_PREFIX)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
  return keys.length;
}

function resetProjectUi() {
  document.getElementById("new-button")?.click();
  const form = document.getElementById("concept-form");
  form?.reset();
  const idea = document.getElementById("idea");
  if (idea) {
    idea.value = "";
    idea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const formError = document.getElementById("form-error");
  if (formError) {
    formError.textContent = "";
    formError.hidden = true;
  }
}

function normalizeDeletionError(error) {
  const name = String(error?.name || error?.code || error?.error?.name || "");
  const message = String(error?.message || error?.error?.message || "Project deletion failed.");

  if (name === "precondition_failed" || name === "STORAGE_ERR_PRECONDITION_FAILED") {
    return "A saved project changed while deletion was running. Nothing was force-deleted. Retry after reloading the App.";
  }
  if (name.includes("permission") || name.includes("not_granted")) {
    return "StoryCore Harbour does not have permission to list or delete its saved App data.";
  }
  if (name.includes("rate") || name.includes("quota")) {
    return "Anna temporarily refused the deletion because of a storage limit. Retry later; remaining projects were not force-deleted.";
  }
  if (name === "storage_delete_incomplete") return message;
  if (name.startsWith("storage_")) return message;
  return `Project deletion failed: ${message}`;
}

function setButtonsDisabled(disabled) {
  for (const button of buttons) button.disabled = disabled;
}

function setStatus(message, tone = "") {
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.className = `message deletion-status ${tone}`.trim();
}

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  error.code = name;
  return error;
}
