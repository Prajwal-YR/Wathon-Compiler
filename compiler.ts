import { Stmt, Expr, BinOp, Type, FunDef, Literal } from "./ast";
import { parse } from "./parser";
import { typeCheckProgram, TypeEnv } from "./typecheck";

// https://learnxinyminutes.com/docs/wasm/



type CompileResult = {
  globals: string,
  wasmSource: string,
};

// const definedVars = new Set();

export function compile(source: string): CompileResult {
  const ast = parse(source);
  const ProgramEnv: TypeEnv = { vars: new Map(), funcs: new Map, retType: Type.none };
  const typedAst = typeCheckProgram(ast, ProgramEnv);
  const emptyEnv: TypeEnv = { vars: new Map(), funcs: new Map, retType: Type.none };

  const scratchVar: string = `(local $$last i32)`;
  var globals:string[] = [];
  typedAst.varinits.forEach((v) => {
    globals.push(`(global $${v.name} (mut i32) ${resolveLiteral(v.init)})`);
  });

  typedAst.fundefs.forEach((f)=>{
    globals = globals.concat(codeGenFun(f, emptyEnv));
  });
  const commandGroups = typedAst.stmts.map(stmt=>codeGenStmt(stmt,emptyEnv));
  const commands = [].concat.apply([scratchVar], commandGroups);
  console.log("Generated: ", commands.join("\n"));
  return {
    globals: globals.join("\n"),
    wasmSource: commands.join("\n"),
  };
}

function codeGenFun(fundef: FunDef<Type>, localEnv:TypeEnv): Array<string> {
  // Construct the environment for the function body
  const funEnv:TypeEnv = { vars: new Map(), funcs: new Map, retType: Type.none };
  // Construct the code for params and variable declarations in the body
  fundef.inits.forEach(init => {
    funEnv.vars.set(init.name,init.type);
  });
  fundef.params.forEach(param => {
    funEnv.vars.set(param.name,param.type);
  });
  // Construct the code for params and variable declarations in the body
  const params = fundef.params.map(p => `(param $${p.name} i32)`).join(" ");
  const varDecls = fundef.inits.map(v => `(local $${v.name} i32)`).join("\n");

  const stmts = fundef.body.map(s => codeGenStmt(s,funEnv)).flat();
  const stmtsBody = stmts.join("\n");
  return [`(func $${fundef.name} ${params} (result i32)
    (local $$last i32)
    ${varDecls}
    ${stmtsBody}
    (i32.const 0))`];
}

function codeGenStmt(stmt: Stmt<Type>, localEnv:TypeEnv): Array<string> {
  switch (stmt.tag) {
    case "assign":
      var valStmts = codeGenExpr(stmt.value, localEnv);
      if(localEnv.vars.has(stmt.name))
        return valStmts.concat([`(local.set $${stmt.name})`]);
      
      return valStmts.concat([`(global.set $${stmt.name})`]);
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, localEnv);
      return exprStmts.concat([`(local.set $$last)`]);
    case "return":
      var retStmts = codeGenExpr(stmt.ret, localEnv);
      return [...retStmts, `return`];
  }
}

function resolveLiteral(literal: Literal<Type>): string {
  switch (literal.tag) {
    case "num":
      return `(i32.const ${literal.value})`;

    case "bool":
      return `(i32.const ${Number(literal.value)})`;

    case "none":
      return "(i32.const 0)";
  }
}

function codeGenExpr(expr: Expr<Type>, localEnv:TypeEnv): Array<string> {
  switch (expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg, localEnv);
      return argStmts.concat([`(call $${expr.name})`]);
    case "builtin2":
      const arg1Stmts = codeGenExpr(expr.arg1, localEnv);
      const arg2Stmts = codeGenExpr(expr.arg2, localEnv);
      return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
    case "literal":
      return [resolveLiteral(expr.literal)];

    case "id":
      if(localEnv.vars.has(expr.name))
        return [`(local.get $${expr.name})`];

      return [`(global.get $${expr.name})`];


    case "binexpr":
      const leftexpr = codeGenExpr(expr.left, localEnv);
      const rightexpr = codeGenExpr(expr.right, localEnv);
      const op = codeGenBinOp(expr.op);
      return [...leftexpr, ...rightexpr, op];

    case "call":
      const argsStmts = expr.args.map((arg)=>codeGenExpr(arg,localEnv)).flat();
      return [...argsStmts, `(call $${expr.name})`];

  }
}

function codeGenBinOp(op: BinOp): string {
  switch (op) {
    case BinOp.Add:
      return "(i32.add)";
    case BinOp.Sub:
      return "(i32.sub)";
    case BinOp.Mul:
      return "(i32.mul)";
    case BinOp.Div:
      return "(i32.div_s)";
    case BinOp.Mod:
      return "(i32.rem_s)";
  }
}
