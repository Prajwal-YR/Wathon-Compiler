import { parser } from "lezer-python";
import { TreeCursor } from "lezer-tree";
import { BinOp, Expr, Stmt, Literal, Type, TypedVar, FunDef, VarDef, Program } from "./ast";

function traverseLiteral(c: TreeCursor, s: string): Literal<null> {
  switch (c.type.name) {
    case "Number":
      return { tag: "num", value: Number(s.substring(c.from, c.to)) }
    case "Boolean":
      if (s.substring(c.from, c.to) == "True")
        return { tag: "bool", value: true }
      if (s.substring(c.from, c.to) == "False")
        return { tag: "bool", value: false }
      throw new Error("Invalid value for boolean type")
    case "None":
      return { tag: "none" }
    default: throw new Error("ParseError: Expected a literal");

  }
}


function isVarDef(c: TreeCursor, s: string): boolean {
  if (c.type.name !== "AssignStatement")
    return false;
  c.firstChild();
  c.nextSibling();
  const name = c.type.name;
  c.parent();
  // @ts-ignore
  return name === 'TypeDef';
}

function isFunDef(c: TreeCursor, s: string): boolean {
  return c.type.name === "FunctionDefinition";
}

function traverseVarDef(c: TreeCursor, s: string): VarDef<null> {
  c.firstChild();
  const { name, type } = traverseTypedVar(c, s);
  c.nextSibling(); // go to =
  c.nextSibling(); // go to liiteral
  const init = traverseLiteral(c, s);
  c.parent();
  return { name, type, init }
}

export function traverseParameters(c: TreeCursor, s: string): TypedVar<null>[] {
  c.firstChild();  // Focuses on open paren
  const parameters = []
  c.nextSibling(); // Focuses on a VariableName
  do {
    if (c.type.name === ")")
      break;
    parameters.push(traverseTypedVar(c, s));
    c.nextSibling(); // Focuses on a VariableName
  } while (c.nextSibling())
  c.parent();       // Pop to ParamList
  return parameters;
}

function traverseFunDef(c: TreeCursor, s: string): FunDef<null> {
  c.firstChild();  // Focus on def
  c.nextSibling(); // Focus on name of function
  var name = s.substring(c.from, c.to);
  c.nextSibling(); // Focus on ParamList
  var params = traverseParameters(c, s)
  c.nextSibling(); // Focus on Body or TypeDef
  let ret: Type = Type.none;
  if (c.type.name === "TypeDef") {
    c.firstChild(); // go to ->
    c.nextSibling(); // go to return type
    ret = traverseType(c, s);
    c.parent(); // pop
  }
  c.nextSibling(); // go to body
  c.firstChild();  // go into body
  const body: Stmt<null>[] = [];
  const inits: VarDef<null>[] = [];
  while (c.nextSibling()) {
    if (isVarDef(c, s)) {
      inits.push(traverseVarDef(c, s));
    } else if (isFunDef(c, s)) {
      throw new Error("ParseError: Nested Functions not supported")
    }
    else
      body.push(traverseStmt(c, s));
  }
  c.parent();      // Pop to Body
  c.parent();      // Pop to FunctionDefinition
  return {
    name, params, inits, body, ret
  }
}

function traverseType(c: TreeCursor, s: string): Type {
  switch (s.substring(c.from, c.to)) {
    case "int":
      return Type.int;
    case "bool":
      return Type.bool;
    case "None":
      return Type.none;
    default: throw new Error("Invalid Type");

  }
}

function traverseTypedVar(c: TreeCursor, s: string): TypedVar<null> {
  const name = s.substring(c.from, c.to);
  c.nextSibling(); //go to TypeDef
  if (c.type.name !== 'TypeDef') {
    throw new Error("Missed type annotation for " + name);
  }
  c.firstChild(); //go to :
  c.nextSibling(); //go to type
  const type = traverseType(c, s);
  c.parent(); //pop TypeDef
  return { name, type }
}


export function traverseExpr(c: TreeCursor, s: string): Expr<null> {
  switch (c.type.name) {
    case "Number":
    case "Boolean":
    case "None":
      return {
        tag: "literal",
        literal: traverseLiteral(c, s)
      }

    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }

    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // go to arglist
      const args = travesreArgs(c, s);
      c.parent(); // pop CallExpression
      if (callName === 'print' || callName === 'abs') {
        if (args.length !== 1)
          throw new Error("ParseError: Incorrect number of args for builtin1");
        return {
          tag: "builtin1",
          name: callName,
          arg: args[0]
        };
      }
      else if (callName === 'max' || callName === 'min' || callName === 'pow') {
        if (args.length !== 2)
          throw new Error("ParseError: Incorrect number of args for builtin1");
        return {
          tag: "builtin2",
          name: callName,
          arg1: args[0],
          arg2: args[1]
        };
      }
      return { tag: "call", name: callName, args };

    case "UnaryExpression":
      c.firstChild();
      const uniop = s.substring(c.from, c.to);
      if (uniop !== '+' && uniop !== '-')
        throw new Error("ParseError: Unknown unary operator");

      c.parent();
      const value = Number(s.substring(c.from, c.to))
      if (isNaN(value))
        throw new Error("ParseError: Unary operator failed");

      return { tag: "literal", literal: { tag: "num", value } }

    case "BinaryExpression":
      c.firstChild();
      const left = traverseExpr(c, s);
      c.nextSibling();
      var op = traverseBinOp(c, s);

      c.nextSibling()
      const right = traverseExpr(c, s);
      c.parent(); //pop 
      return { tag: "binexpr", op: op, left: left, right: right }

    default:
      throw new Error("ParseError: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function travesreArgs(c: TreeCursor, s: string): Array<Expr<null>> {
  var args: Array<Expr<null>> = []
  c.firstChild(); // go into arglist
  while (c.nextSibling()) { // find single argument in arglist
    if (c.type.name === ")")
      break;
    args.push(traverseExpr(c, s));
    c.nextSibling();
  }
  c.parent(); // pop arglist
  return args;
}

export function traverseBinOp(c: TreeCursor, s: string): BinOp {
  switch (s.substring(c.from, c.to)) {
    case "+":
      return BinOp.Add;
    case "-":
      return BinOp.Sub;
    case "*":
      return BinOp.Mul;
    case "//":
      return BinOp.Div;
    case "%":
      return BinOp.Mod;
    default: throw new Error("ParseError: Unknown binary operator")
  }
}

export function traverseStmt(c: TreeCursor, s: string): Stmt<null> {
  switch (c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // go to equals
      // if(s.substring(c.from, c.to) == "TypeDef")
      c.nextSibling(); // go to value
      const value = traverseExpr(c, s);
      c.parent();
      return {
        tag: "assign",
        name: name,
        value: value
      }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr: expr }
    case "ReturnStatement":
      c.firstChild(); //go to return
      c.nextSibling();
      const ret = traverseExpr(c, s);
      c.parent();
      return { tag: "return", ret }
    case "PassStatement":
      return { tag: "pass" }
    default:
      throw new Error("ParseError: Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverse(c: TreeCursor, s: string): Program<null> {
  switch (c.node.type.name) {
    case "Script":
      const stmts: Stmt<null>[] = [];
      const varinits: VarDef<null>[] = [];
      const fundefs: FunDef<null>[] = [];
      c.firstChild();
      while (true) {
        if (isVarDef(c, s)) {
          varinits.push(traverseVarDef(c, s));
        } else if (isFunDef(c, s)) {
          fundefs.push(traverseFunDef(c, s));
        }
        else break;
        if (c.nextSibling()) {
          continue
        } else {
          return { varinits, fundefs, stmts };
        }
      }

      do {
        if (isVarDef(c, s) || isFunDef(c, s)) {
          throw new Error("ParseError: Variable and function definitions not allowed here");
        }
        stmts.push(traverseStmt(c, s));
      } while (c.nextSibling());
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
      return { varinits, fundefs, stmts };

    default:
      throw new Error("ParseError: Could not parse program at " + c.node.from + " " + c.node.to);
  }
}

export function parse(source: string): Program<null> {
  const t = parser.parse(source);
  return traverse(t.cursor(), source);
}
