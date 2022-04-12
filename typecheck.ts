import { BinOp, Expr, FunDef, Literal, Program, Stmt, Type, TypedVar, VarDef } from "./ast";

export type TypeEnv = {
  vars: Map<string, Type>,
  funcs: Map<string, [Type[], Type]>,
  retType: Type
}

export function typeCheckProgram(prog: Program<null>, env: TypeEnv): Program<Type> {
  const typedInits = typeCheckVarInits(prog.varinits, env);
  const typedFunDefs: FunDef<Type>[] = []
  prog.fundefs.forEach(fundef => {
    typedFunDefs.push(typeCheckFunDef(fundef, env));
  });
  const typedStmts = typeCheckStmts(prog.stmts, env);
  return { varinits: typedInits, fundefs: typedFunDefs, stmts: typedStmts, a: env.retType };

}

export function typeCheckVarInits(inits: VarDef<null>[], env: TypeEnv): VarDef<Type>[] {
  const typedInits: VarDef<Type>[] = [];
  inits.forEach(init => {
    const initType = typeCheckLiteral(init.init);
    if (initType.a !== init.type) {
      throw new Error(`TypeError: Expected type \`${init.type}\`; got type \`{initType.a}\``);

    }
    env.vars.set(init.name, init.type);
    typedInits.push({ ...init, a: init.type, init: initType });
  });

  return typedInits;
}

function typeCheckFunDef(fundef: FunDef<null>, env: TypeEnv): FunDef<Type> {
  // add params to env
  const localEnv: TypeEnv = { ...env, vars: new Map(env.vars), funcs: new Map(env.funcs) };
  fundef.params.forEach(param => {
    localEnv.vars.set(param.name, param.type);
  });

  const typedParams = typeCheckParams(fundef.params);

  // check inits and add to env
  const typedInits = typeCheckVarInits(fundef.inits, localEnv);
  // fundef.inits.forEach(init => {
  //   localEnv.vars.set(init.name,init.type);
  // });

  // add func to env
  env.funcs.set(fundef.name, [fundef.params.map(param => param.type), fundef.ret])

  localEnv.retType = fundef.ret;
  // check body
  const typedStmts = typeCheckStmts(fundef.body, localEnv)
  // check return

  return { ...fundef, params: typedParams, inits: typedInits, body: typedStmts }
}

function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[] {
  return params.map(param => {
    return { ...param, a: param.type }
  });
}

export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[] {
  const typedStmts: Stmt<Type>[] = []

  stmts.forEach(stmt => {
    switch (stmt.tag) {
      case "assign":
        if (!env.vars.has(stmt.name)) {
          throw new Error(`ReferenceError: Not a variable \`${stmt.name}\``);
        }
        const typedValue = typeCheckExpr(stmt.value, env);
        const expectedType = env.vars.get(stmt.name)
        if (typedValue.a !== expectedType) {
          throw new Error(`TypeError: Expected type \`${expectedType}\`; got type \`${typedValue.a}\``);
        }
        typedStmts.push({ ...stmt, a: Type.none })
        break;
      case "return":
        const typedRet = typeCheckExpr(stmt.ret, env);
        if (env.retType !== typedRet.a) {
          throw new Error(`TypeError: Expected type \`${env.retType}\`; got type \`${typedRet.a}\``);
        }
        typedStmts.push({ ...stmt, a: Type.none });
        break;
      case "pass":
        typedStmts.push({ ...stmt, a: Type.none });
        break;
      case "expr":
        const typedExpr = typeCheckExpr(stmt.expr, env);
        typedStmts.push({ ...stmt, expr: typedExpr, a: Type.none });
        break;
    }
  });

  return typedStmts
}

export function typeCheckExpr(expr: Expr<null>, env: TypeEnv): Expr<Type> {
  switch (expr.tag) {
    case "id":
      if (!env.vars.has(expr.name)) {
        throw new Error(`ReferenceError: Not a variable \`${expr.name}\``);
      }
      const idType = env.vars.get(expr.name);
      return { ...expr, a: idType }
    case "builtin1":
      const arg = typeCheckExpr(expr.arg, env);
      return { ...expr, arg, a: Type.int };
    case "builtin2":
      const arg1 = typeCheckExpr(expr.arg1, env);
      const arg2 = typeCheckExpr(expr.arg2, env);
      if (arg1.a !== Type.int || arg2.a !== Type.int) {
        throw new Error(`TypeError: Cannot apply builtin2 \`${expr.name}\` on types \`${arg1.a}\` and \`${arg2.a}\``)
      }
      return { ...expr, arg1, arg2, a: Type.int }
    case "binexpr":
      const left = typeCheckExpr(expr.left, env);
      const right = typeCheckExpr(expr.right, env);
      switch (expr.op) {
        case BinOp.Add:
        case BinOp.Sub:
        case BinOp.Mul:
        case BinOp.Div:
        case BinOp.Mod:
          if (left.a !== Type.int || right.a !== Type.int) {
            throw new Error(`TypeError: Cannot apply operator \`${expr.op}\` on types \`${left.a}\` and \`${right.a}\``)
          }
          return { ...expr, left, right, a: Type.int }
      }
      break;

    case "literal":
      const lit = typeCheckLiteral(expr.literal)
      return { ...expr, a: lit.a };
    case "call":
      if (!env.funcs.has(expr.name)) {
        throw new Error(`ReferenceError: Not a Function \`${expr.name}\``);
      }
      const typedArgs = expr.args.map((arg) => typeCheckExpr(arg, env));
      const [actualArgs, retType] = env.funcs.get(expr.name)
      for (let index = 0; index < typedArgs.length; index++) {
        if (typedArgs[index].a !== actualArgs[index])
          throw new Error(`TypeError: Expected type \`${actualArgs[index]}\`; got type \`${typedArgs[index].a}\` for parameter ${index}`);
      }
      return { ...expr, args: typedArgs, a: retType };

    default:
      break;
  }
}

export function typeCheckLiteral(literal: Literal<null>): Literal<Type> {
  switch (literal.tag) {
    case "num":
      return { ...literal, a: Type.int };
    case "bool":
      return { ...literal, a: Type.bool };
    case "none":
      return { ...literal, a: Type.none };
    default:
      break;
  }
}