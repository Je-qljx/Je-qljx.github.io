// Session-local workaround (NOT part of the repo): vite 8.x module runner
// inlines CJS deps without a `require` shim under this Node 24 environment,
// which breaks `astro sync`/`dev`/`build` with "require is not defined".
// This patches ESModulesEvaluator.runInlinedModule to provide real
// require/module/exports/__filename/__dirname to inlined CJS code — but
// only for identifiers the module does not declare itself — and syncs
// `module.exports` replacements back into the module exports object.
// Revert by re-running `npm install` (node_modules is untracked).

import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('./node_modules/vite/dist/node/module-runner.js', import.meta.url);
let src = readFileSync(file, 'utf8');

const markerFrom = 'async runInlinedModule(context, code) {';
const markerTo = 'runExternalModule(filepath)';

const fromIdx = src.indexOf(markerFrom);
const toIdx = src.indexOf(markerTo, fromIdx);
if (fromIdx < 0 || toIdx < 0) {
  console.error('patch markers not found — aborting');
  process.exit(1);
}

const replacement = `async runInlinedModule(context, code, mod) {
		const exportsObj = context[ssrModuleExportsKey];
		let requireShim, moduleShim, filenameShim, dirnameShim;
		if (mod && typeof process < "u" && process.getBuiltinModule) {
			try {
				const nodeModule = process.getBuiltinModule("node:module");
				const nodePath = process.getBuiltinModule("node:path");
				const sourceFile = (mod.file || mod.url || "").replace(/^file:/, "");
				if (sourceFile) {
					filenameShim = sourceFile;
					dirnameShim = nodePath.dirname(sourceFile);
					requireShim = nodeModule.createRequire(sourceFile);
					moduleShim = { exports: exportsObj };
				}
			} catch {}
		}
		const declaredByCode = new RegExp("(?:^|\\\\n)\\\\s*(?:var|let|const)\\\\s+([A-Za-z_$][\\\\w$]*)\\\\b", "g");
		const declared = /* @__PURE__ */ new Set([...code.matchAll(declaredByCode)].map((m) => m[1]));
		const params = [ssrModuleExportsKey, ssrImportMetaKey, ssrImportKey, ssrDynamicImportKey, ssrExportAllKey, ssrExportNameKey];
		const values = [exportsObj, context[ssrImportMetaKey], context[ssrImportKey], context[ssrDynamicImportKey], context[ssrExportAllKey], context[ssrExportNameKey]];
		const shims = { require: requireShim, module: moduleShim, exports: exportsObj, __filename: filenameShim, __dirname: dirnameShim };
		for (const name of Object.keys(shims)) {
			if (declared.has(name) || !new RegExp("\\\\b" + name + "\\\\b").test(code)) continue;
			params.push(name), values.push(shims[name]);
		}
		await new AsyncFunction(...params, "\\"use strict\\";\\n" + code)(...values);
		if (moduleShim && moduleShim.exports !== exportsObj && moduleShim.exports != null) {
			const cjsExports = moduleShim.exports;
			for (const key of Object.keys(cjsExports)) if (key !== "default" && !(key in exportsObj)) Object.defineProperty(exportsObj, key, { enumerable: true, configurable: true, get: () => cjsExports[key] });
			Object.defineProperty(exportsObj, "default", { enumerable: true, configurable: true, get: () => cjsExports });
		}
		Object.seal(exportsObj);
	}
	`;

src = src.slice(0, fromIdx) + replacement + src.slice(toIdx);
writeFileSync(file, src);
console.log('patched', file.pathname);