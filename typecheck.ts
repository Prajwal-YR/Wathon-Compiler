import { BinOp, ClassDef, Expr, FunDef, GetAttr, Literal, Program, Stmt, Type, TypedVar, UniOp, VarDef } from "./ast";

export type TypeEnv = {
  vars: Map<string, Type>,
  funcs: Map<string, [Type[], Type]>,
  classes: Map<string, ClassEnv>,
  retType: Type //stores the return type for the current function
}

export type ClassEnv = {
  fields: Map<string, Type>,
  methods: Map<string, [Type[], Type]>
  // retType: Type
}

export function typeCheckProgram(prog: Program<null>, env: TypeEnv): Program<Type> {
  const typedClassDefs: ClassDef<Type>[] = []
  prog.classdefs.forEach(classdef => {
    // add class to env
    env.classes.set(classdef.name, null);
  });
  prog.classdefs.forEach(classdef => {
    typedClassDefs.push(typeCheckClassDef(classdef, env));
  });
  const typedInits = typeCheckVarInits(prog.varinits, env.vars, env.classes);
  const typedFunDefs: FunDef<Type>[] = []
  prog.fundefs.forEach(fundef => {
    // add func to env
    env.funcs.set(fundef.name, [fundef.params.map(param => param.type), fundef.ret])
  });
  prog.fundefs.forEach(fundef => {
    typedFunDefs.push(typeCheckFunDef(fundef, env));
  });

  const typedStmts = typeCheckStmts(prog.stmts, env);
  return { varinits: typedInits, fundefs: typedFunDefs, classdefs: typedClassDefs, stmts: typedStmts, a: env.retType };

}

export function typeCheckVarInits(inits: VarDef<null>[], vars: Map<string, Type>, classes: Map<string, ClassEnv>): VarDef<Type>[] {
  const typedInits: VarDef<Type>[] = [];
  inits.forEach(init => {
    const initType = typeCheckLiteral(init.init);
    if (!checkAssign(init.type, initType.a, classes)) {
      throw new TypeError(`Expected type \`${init.type}\`; got type \`${initType.a}\``);

    }
    if (vars.has(init.name)) {
      throw new TypeError(`Duplicate declaration for \`${init.name}\``)
    }
    vars.set(init.name, init.type);
    typedInits.push({ ...init, a: init.type, init: initType });
  });

  return typedInits;
}

function typeCheckFunDef(fundef: FunDef<null>, env: TypeEnv,): FunDef<Type> {

  // add params to env
  const localEnv: TypeEnv = { ...env, vars: new Map(env.vars), funcs: new Map(env.funcs), classes: new Map(env.classes) };
  fundef.params.forEach(param => {
    localEnv.vars.set(param.name, param.type);
  });

  const typedParams = typeCheckParams(fundef.params);

  // check inits and add to env
  const typedInits = typeCheckVarInits(fundef.inits, localEnv.vars, localEnv.classes);


  localEnv.retType = fundef.ret;
  // check body
  const typedStmts = typeCheckStmts(fundef.body, localEnv)

  // check return
  const lastStmt = typedStmts[typedStmts.length - 1]
  if (lastStmt.tag !== "return") {
    if (lastStmt.tag === "pass") {

    }
    else if (lastStmt.tag !== "if" || lastStmt.elseBody.length == 0 || lastStmt.elseBody[lastStmt.elseBody.length - 1].tag !== "return") {
      throw new TypeError(`All paths must have return for function ${fundef.name}`);
    }

  }

  return { ...fundef, params: typedParams, inits: typedInits, body: typedStmts }
}

export function typeCheckClassDef(classdef: ClassDef<null>, env: TypeEnv): ClassDef<Type> {

  // add params to env
  const classEnv: ClassEnv = { fields: new Map(), methods: new Map() }

  const typedFields = typeCheckVarInits(classdef.fields, classEnv.fields, env.classes);

  const typedMethods: FunDef<Type>[] = []
  classdef.methods.forEach(method => {
    classEnv.methods.set(method.name, [method.params.map(param => param.type), method.ret]);
  });
  env.classes.set(classdef.name, classEnv);
  classdef.methods.forEach(fundef => {
    typedMethods.push(typeCheckFunDef(fundef, env));
  });


  return { ...classdef, fields: typedFields, methods: typedMethods, }

}

function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[] {
  return params.map(param => {
    return { ...param, a: param.type }
  });
}

function checkAssign(left: Type, right: Type, classes: Map<string, ClassEnv>) {
  if (left === right) {
    return true;
  }
  if (typeof left === 'object' && left.tag === 'object') {
    if (!classes.has(left.class)) {
      throw new TypeError(`There is no class named: ${left.class}`);

    }
    return right === "None" || (typeof right === 'object' && right.class === left.class)
  }
  return false;
}

export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[] {
  const typedStmts: Stmt<Type>[] = []

  stmts.forEach(stmt => {
    switch (stmt.tag) {
      case "assign":
        if (typeof stmt.lvalue === 'string') {
          if (!env.vars.has(stmt.lvalue)) {
            throw new ReferenceError(`Not a variable \`${stmt.lvalue}\``);
          }
          const typedValue = typeCheckExpr(stmt.value, env);
          const expectedType = env.vars.get(stmt.lvalue)
          if (!checkAssign(expectedType, typedValue.a, env.classes)) {
            throw new TypeError(`Expected type \`${expectedType}\`; got type \`${typedValue.a}\``);
          }
          typedStmts.push({ ...stmt, value:typedValue, a: "None" })
        }
        else {
          const typedValue = typeCheckExpr(stmt.value, env);
          //@ts-ignore
          const expectedType:GetAttr<Type> = typeCheckExpr(stmt.lvalue, env);
          if (!checkAssign(expectedType.a, typedValue.a, env.classes)) {
            throw new TypeError(`Expected type \`${expectedType.a}\`; got type \`${typedValue.a}\``);
          }
          typedStmts.push({ ...stmt, lvalue:expectedType, value:typedValue, a: "None" })
        }
        
        break;
      case "return":
        const typedRet = typeCheckExpr(stmt.ret, env);
        if (!checkAssign(env.retType, typedRet.a, env.classes)) {
          throw new TypeError(`Expected type \`${env.retType}\`; got type \`${typedRet.a}\``);
        }
        typedStmts.push({ ...stmt, ret:typedRet, a: "None" });
        break;
      case "pass":
        typedStmts.push({ ...stmt, a: "None" });
        break;
      case "if":
        const typedCond = typeCheckExpr(stmt.cond, env);
        if (typedCond.a !== "bool")
          throw new TypeError(`Condition expression cannot be of type \`${typedCond.a}\``);
        const typedBody = typeCheckStmts(stmt.body, env);
        const typedElseBody = typeCheckStmts(stmt.elseBody, env);
        typedStmts.push({
          ...stmt,
          cond: typedCond,
          body: typedBody,
          elseBody: typedElseBody,
          a: "None"
        });
        break;
      case "while":
        const typedWhileCond = typeCheckExpr(stmt.cond, env);
        if (typedWhileCond.a !== "bool")
          throw new TypeError(`Condition expression cannot be of type \`${typedWhileCond.a}\``);
        const typedWhileBody = typeCheckStmts(stmt.body, env);
        typedStmts.push({
          ...stmt,
          cond: typedWhileCond,
          body: typedWhileBody,
          a: "None"
        });
        break;
      case "expr":
        const typedExpr = typeCheckExpr(stmt.expr, env);
        typedStmts.push({ ...stmt, expr: typedExpr, a: typedExpr.a });
        break;
    }
  });

  return typedStmts
}

export function typeCheckExpr(expr: Expr<null>, env: TypeEnv): Expr<Type> {
  switch (expr.tag) {
    case "id":
      if (!env.vars.has(expr.name)) {
        throw new ReferenceError(`Not a variable \`${expr.name}\``);
      }
      const idType = env.vars.get(expr.name);
      return { ...expr, a: idType }

    case "getattr":
      const obj = typeCheckExpr(expr.obj, env);

      if (typeof obj.a !== "object" || obj.a.tag !== "object") {
        throw TypeError("Not an object!")
      }
      let classData = env.classes.get(obj.a.class);
      if (!classData.fields.has(expr.name)) {
        throw new ReferenceError(`\`${expr.name}\` is not a member of class \`${obj.a.class}\``);
      }
      const fieldType = classData.fields.get(expr.name);
      return { ...expr, obj, a: fieldType }


    case "builtin1":
      const arg = typeCheckExpr(expr.arg, env);
      switch (expr.name) {
        case "print":
          return { ...expr, arg, a: "None" };

        case "abs":
          if (arg.a !== "int")
            throw new TypeError(`Expected int; got ${arg.a} for abs()`);
          return { ...expr, arg, a: "int" }
      }
      break;

    case "builtin2":
      const arg1 = typeCheckExpr(expr.arg1, env);
      const arg2 = typeCheckExpr(expr.arg2, env);
      if (arg1.a !== "int" || arg2.a !== "int") {
        throw new TypeError(`Cannot apply builtin2 \`${expr.name}\` on types \`${arg1.a}\` and \`${arg2.a}\``)
      }
      return { ...expr, arg1, arg2, a: "int" }
    case "uniexpr":
      var right = typeCheckExpr(expr.right, env);
      switch (expr.op) {
        case UniOp.Not:
          if (right.a !== "bool")
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on type \`${right.a}\``)
          break;
        case UniOp.Neg:
          if (right.a !== "int")
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on type \`${right.a}\``)
          break;
      }
      return { ...expr, right, a: right.a };
    case "binexpr":
      const left = typeCheckExpr(expr.left, env);
      var right = typeCheckExpr(expr.right, env);
      switch (expr.op) {
        case BinOp.Add:
        case BinOp.Sub:
        case BinOp.Mul:
        case BinOp.Div:
        case BinOp.Mod:
          if (left.a !== "int" || right.a !== "int") {
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on types \`${left.a}\` and \`${right.a}\``)
          }
          return { ...expr, left, right, a: "int" }
        case BinOp.Lesser:
        case BinOp.LessEq:
        case BinOp.GreatEq:
        case BinOp.Greater:
          if (left.a !== "int" || right.a !== "int") {
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on types \`${left.a}\` and \`${right.a}\``)
          }
          return { ...expr, left, right, a: "bool" }
        case BinOp.Equals:
        case BinOp.NotEquals:
          if (left.a !== right.a || right.a === "None") {
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on types \`${left.a}\` and \`${right.a}\``)
          }
          return { ...expr, left, right, a: "bool" }
        case BinOp.Is:
          if ((left.a !== "None" && typeof left.a !== 'object') || (right.a !== "None" && typeof left.a !== 'object')) {
            throw new TypeError(`Cannot apply operator \`${expr.op}\` on types \`${left.a}\` and \`${right.a}\``)
          }
          return { ...expr, left, right, a: "bool" }
      }
      break;

    case "literal":
      const lit = typeCheckLiteral(expr.literal)
      return { ...expr, a: lit.a };
    case "call":
      if (env.funcs.has(expr.name)) { //Functions
        const typedArgs = expr.args.map((arg) => typeCheckExpr(arg, env));
        const [actualArgs, retType] = env.funcs.get(expr.name)
        if (actualArgs.length !== typedArgs.length)
          throw new Error(`Expected ${actualArgs.length} arguments for ${expr.name} got ${typedArgs.length}`)
        for (let index = 0; index < typedArgs.length; index++) {
          if (!checkAssign(actualArgs[index], typedArgs[index].a, env.classes))
            if (typedArgs[index].a !== actualArgs[index])
              throw new TypeError(`Expected type \`${actualArgs[index]}\`; got type \`${typedArgs[index].a}\` for parameter ${index}`);
        }
        return { ...expr, args: typedArgs, a: retType };
      } else if (env.classes.has(expr.name)) { // Constructors
        if (expr.args.length !== 0) {
          throw new Error(`Expected 0 arguments for ${expr.name} got ${expr.args.length}`)
        }
        const retType: Type = { tag: "object", class: expr.name }
        return { ...expr, a: retType };

      }
      else if (expr.obj) { // Methods
        const obj = typeCheckExpr(expr.obj, env);
        if (typeof obj.a !== "object" || obj.a.tag !== 'object') {
          throw new ReferenceError("Not an object");
        }
        const typedArgs = expr.args.map((arg) => typeCheckExpr(arg, env));
        const methods = env.classes.get(obj.a.class).methods
        if (!methods.has(expr.name)) {
          throw new ReferenceError(`There is no method \`${expr.name}\` in class \`${obj.a.class}\``);
        }
        const [actualArgs, retType] = methods.get(expr.name);
        if (actualArgs.length - 1 !== typedArgs.length)
          throw new Error(`Expected ${actualArgs.length - 1} arguments for ${expr.name} got ${typedArgs.length}`)
        for (let index = 0; index < typedArgs.length; index++) {
          if (!checkAssign(actualArgs[index + 1], typedArgs[index].a, env.classes))
            throw new TypeError(`Expected type \`${actualArgs[index + 1]}\`; got type \`${typedArgs[index].a}\` for parameter ${index}`);
        }
        return { ...expr, args: typedArgs, obj, a: retType, };

      } else {
        throw new ReferenceError(`Not a Function or Class \`${expr.name}\``);
      }



    default:
      break;
  }
}

export function typeCheckLiteral(literal: Literal<null>): Literal<Type> {
  switch (literal.tag) {
    case "num":
      return { ...literal, a: "int" };
    case "bool":
      return { ...literal, a: "bool" };
    case "none":
      return { ...literal, a: "None" };
    default:
      break;
  }
}