// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

import wabt from 'wabt';
import * as compiler from './compiler';
import { parse } from './parser';

// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if (typeof process !== "undefined") {
  const oldProcessOn = process.on;
  process.on = (...args: any): any => {
    if (args[0] === "uncaughtException") { return; }
    else { return oldProcessOn.apply(process, args); }
  };
}

export async function run(source: string, config: any): Promise<number> {
  const wabtInterface = await wabt();
  const parsed = parse(source);
  var returnType = "";
  var returnExpr = "";
  if (parsed.stmts.length > 0) {
    const lastExpr = parsed.stmts[parsed.stmts.length - 1]
    if (lastExpr.tag === "expr" && !(lastExpr.expr.tag === 'builtin1' && lastExpr.expr.name === 'print')) {
      returnType = "(result i32)";
      returnExpr = "(local.get $$last)"
    }
  }

  const compiled = compiler.compile(source);
  const importObject = config.importObject;
  const wasmSource = `(module
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (func $abs (import "imports" "abs") (param i32) (result i32))
    (func $max (import "imports" "max") (param i32 i32) (result i32))
    (func $min (import "imports" "min") (param i32 i32) (result i32))
    (func $pow (import "imports" "pow") (param i32 i32) (result i32))
    (memory (export "memory") 1)
    ${compiled.globals}
    (func (export "exported_func") ${returnType}
      ${compiled.wasmSource}
      ${returnExpr}
    )
  )`;
  console.log("Final Wasm code:\n" + wasmSource);
  const myModule = wabtInterface.parseWat("test.wat", wasmSource);
  var asBinary = myModule.toBinary({});
  var wasmModule = await WebAssembly.instantiate(asBinary.buffer, importObject);
  const result = (wasmModule.instance.exports.exported_func as any)();
  console.log("Memory",wasmModule.instance.exports.memory);
  return result;
}
