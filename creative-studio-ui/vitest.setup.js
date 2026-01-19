"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var react_1 = require("@testing-library/react");
var matchers = require("@testing-library/jest-dom/matchers");
// Extend Vitest's expect with jest-dom matchers
vitest_1.expect.extend(matchers);
// Cleanup after each test
(0, vitest_1.afterEach)(function () {
    (0, react_1.cleanup)();
});
// Mock lucide-react icons
vitest_1.vi.mock('lucide-react', function () { return ({
    FileText: function () { return null; },
    FolderOpen: function () { return null; },
    Clock: function () { return null; },
    X: function () { return null; },
    SearchIcon: function () { return null; },
    ImageIcon: function () { return null; },
    MusicIcon: function () { return null; },
    FileIcon: function () { return null; },
    SparklesIcon: function () { return null; },
    ZapIcon: function () { return null; },
    TypeIcon: function () { return null; },
    UploadIcon: function () { return null; },
    GripVerticalIcon: function () { return null; },
    FileTextIcon: function () { return null; },
    ClockIcon: function () { return null; },
    SettingsIcon: function () { return null; },
    CheckCircle2Icon: function () { return null; },
    XCircleIcon: function () { return null; },
    // LLM Settings Panel icons
    Check: function () { return null; },
    AlertCircle: function () { return null; },
    Loader2: function () { return null; },
    Info: function () { return null; },
    Eye: function () { return null; },
    EyeOff: function () { return null; },
    RefreshCw: function () { return null; },
    Edit3: function () { return null; },
    // LLM Config Dialog icons
    Settings: function () { return null; },
    CheckCircle2: function () { return null; },
}); });
