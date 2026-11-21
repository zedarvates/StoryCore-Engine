import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// This checks shared UI library names even when the production bundle removes
// an unused import. It does not replace the full application type check.
const libraries = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'lucide-react',
  '@mui/material',
  '@mui/icons-material',
  'framer-motion',
  'three',
]);
const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = path.join(root, 'src') + path.sep;
const configPath = path.join(root, 'tsconfig.app.json');
const formatHost = {
  getCanonicalFileName: (file) => file,
  getCurrentDirectory: () => root,
  getNewLine: () => '\n',
};
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
  throw new Error(ts.formatDiagnostics([config.error], formatHost));
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
if (parsed.errors.length) {
  throw new Error(ts.formatDiagnostics(parsed.errors, formatHost));
}
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const failures = [];
let bindings = 0;
const files = new Set();

for (const source of program.getSourceFiles()) {
  if (source.isDeclarationFile || !path.resolve(source.fileName).startsWith(sourceRoot)) {
    continue;
  }
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const moduleName = statement.moduleSpecifier;
    if (!moduleName || !ts.isStringLiteral(moduleName) || !libraries.has(moduleName.text)) continue;
    const clause = ts.isImportDeclaration(statement)
      ? statement.importClause?.namedBindings
      : statement.exportClause;
    if (!clause || (!ts.isNamedImports(clause) && !ts.isNamedExports(clause))) continue;
    const moduleSymbol = checker.getSymbolAtLocation(moduleName);
    const exports = new Set(moduleSymbol ? checker.getExportsOfModule(moduleSymbol).map((entry) => entry.name) : []);
    for (const specifier of clause.elements) {
      const exportedName = specifier.propertyName ?? specifier.name;
      bindings += 1;
      files.add(source.fileName);
      if (!moduleSymbol || !exports.has(exportedName.text)) {
        const location = source.getLineAndCharacterOfPosition(exportedName.getStart(source));
        failures.push(`${path.relative(root, source.fileName)}:${location.line + 1}:${location.character + 1}: ${moduleName.text} does not export ${exportedName.text}`);
      }
    }
  }
}

if (!bindings) failures.push('No shared UI library bindings were checked; verify the source/configuration scope.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`UI library import contracts passed: ${bindings} named bindings in ${files.size} files (not the full application type check).`);
}
