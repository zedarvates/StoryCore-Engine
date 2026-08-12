import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const HANDOFF = Symbol.for("storycore-harbour.anna-runtime-handoff");

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
