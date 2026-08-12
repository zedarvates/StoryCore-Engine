const stepButtons = [...document.querySelectorAll(".step")];
const stepPanels = [...document.querySelectorAll(".step-panel")];
const fatalPanel = document.getElementById("fatal-error");
const form = document.getElementById("concept-form");
const formError = document.getElementById("form-error");

function enabledSteps() {
  return stepButtons.filter((button) => !button.disabled);
}

function syncStepAccessibility() {
  for (const button of stepButtons) {
    const active = button.classList.contains("active") && !button.disabled;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }

  for (const panel of stepPanels) {
    panel.setAttribute("aria-hidden", String(panel.hidden));
  }
}

function focusPanelHeading(panel) {
  if (!panel || panel.hidden) return;
  const heading = panel.querySelector("h2");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: "start", behavior: "smooth" });
}

function focusVisibleError() {
  queueMicrotask(() => {
    if (formError && !formError.hidden && formError.textContent.trim()) {
      formError.tabIndex = -1;
      formError.focus({ preventScroll: true });
      formError.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

for (const button of stepButtons) {
  button.addEventListener("keydown", (event) => {
    const buttons = enabledSteps();
    const current = buttons.indexOf(button);
    if (current < 0) return;

    let target = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      target = buttons[(current + 1) % buttons.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      target = buttons[(current - 1 + buttons.length) % buttons.length];
    } else if (event.key === "Home") {
      target = buttons[0];
    } else if (event.key === "End") {
      target = buttons.at(-1);
    }

    if (!target) return;
    event.preventDefault();
    target.focus();
    target.click();
  });
}

form?.addEventListener("submit", focusVisibleError);

const observer = new MutationObserver((records) => {
  syncStepAccessibility();

  for (const record of records) {
    if (record.type !== "attributes" || record.attributeName !== "hidden") continue;
    const target = record.target;
    if (target instanceof HTMLElement && !target.hidden) {
      if (target.classList.contains("step-panel") || target.id === "fatal-error") {
        queueMicrotask(() => focusPanelHeading(target));
      }
    }
  }
});

for (const panel of stepPanels) {
  observer.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
}
if (fatalPanel) {
  observer.observe(fatalPanel, { attributes: true, attributeFilter: ["hidden"] });
}
for (const button of stepButtons) {
  observer.observe(button, {
    attributes: true,
    attributeFilter: ["class", "disabled", "aria-current"],
  });
}

syncStepAccessibility();
