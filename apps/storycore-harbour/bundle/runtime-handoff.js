import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js"; // NOSONAR -- Anna's version-negotiated SDK is served from this required same-origin platform path.

const HANDOFF = Symbol.for("storycore-harbour.anna-runtime-handoff");
const RUNTIME_GLOBAL = "__STORYCORE_HARBOUR_RUNTIME__";

if (!window[RUNTIME_GLOBAL]) {
  Object.defineProperty(window, RUNTIME_GLOBAL, {
    value: Object.freeze({ AnnaAppRuntime }),
    configurable: false,
    enumerable: false,
    writable: false,
  });
}

if (!AnnaAppRuntime[HANDOFF]) {
  const connect = AnnaAppRuntime.connect.bind(AnnaAppRuntime);

  AnnaAppRuntime.connect = async (...args) => {
    const anna = await connect(...args);
    window.anna = anna;
    window.dispatchEvent(new CustomEvent("storycore-harbour:anna-ready"));
    return anna;
  };

  Object.defineProperty(AnnaAppRuntime, HANDOFF, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}
