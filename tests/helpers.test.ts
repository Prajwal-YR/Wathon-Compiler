import { importObject } from "./import-object.test";
import { run as runner } from "../runner";
import { parse } from "../parser";
import { typeCheckProgram, TypeEnv } from "../typecheck";
// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string): Type {
  try {
    var ast = parse(source)
    console.log(JSON.stringify(ast, null, 2))
    const ProgramEnv: TypeEnv = { vars: new Map(), funcs: new Map(), classes: new Map(), retType: "None", };
    const typedAst = typeCheckProgram(ast, ProgramEnv);
    if (typedAst.stmts.length === 0) {
      return "None";
    } 
    return typedAst.stmts[typedAst.stmts.length - 1].a;
  }
  catch (err) {
    if(err.name === 'TypeError')
    err.message = "TYPE ERROR: " + err.message
    throw err;
  }
}

// Modify run to use `importObject` (imported above) to use for printing
export async function run(source: string) {
  const config = { importObject };
  await runner(source, config);
  return;
}

type Type =
  | "int"
  | "bool"
  | "None"
  | { tag: "object", class: string }

export const NUM: Type = "int";
export const BOOL: Type = "bool";
export const NONE: Type = "None";
export function CLASS(name: string): Type {
  return { tag: "object", class: name }
};
