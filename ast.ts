export type Program<A> = { a?: A, varinits: VarDef<A>[], fundefs: FunDef<A>[], stmts: Stmt<A>[] }

export type VarDef<A> = {
  a?: A, name: string,
  type: Type,
  init: Literal<A>
}

export type FunDef<A> = {
  a?: A, name: string,
  params: TypedVar<A>[],
  ret: Type,
  inits: VarDef<A>[],
  body: Stmt<A>[]
}

export type TypedVar<A> = { a?: A, name: string, type: Type }

export enum Type { int = "int", bool = "bool", none = "None" }

export type Literal<A> = { a?: A, tag: "num", value: number }
  | { a?: A, tag: "bool", value: boolean }
  | { a?: A, tag: "none" }

export type Stmt<A> =
  | { a?: A, tag: "assign", name: string, value: Expr<A> }
  | { a?: A, tag: "return", ret: Expr<A> }
  | { a?: A, tag: "pass" }
  | { a?: A, tag: "if", cond: Expr<A>, body: Stmt<A>[], elseBody: Stmt<A>[] }
  | { a?: A, tag: "while", cond: Expr<A>, body: Stmt<A>[] }
  | { a?: A, tag: "expr", expr: Expr<A> }

export type Expr<A> =
  | { a?: A, tag: "id", name: string }
  | { a?: A, tag: "builtin1", name: string, arg: Expr<A> }
  | { a?: A, tag: "builtin2", name: string, arg1: Expr<A>, arg2: Expr<A> }
  | { a?: A, tag: "binexpr", op: BinOp, left: Expr<A>, right: Expr<A> }
  | { a?: A, tag: "uniexpr", op: UniOp, right: Expr<A> }
  | { a?: A, tag: "literal", literal: Literal<A> }
  | { a?: A, tag: "call", name: string, args: Expr<A>[] }

export enum BinOp {
  Add = "+",
  Sub = "-",
  Mul = "*",
  Div = "//",
  Mod = "%",
  Lesser = "<",
  LessEq = "<=",
  Greater = ">",
  GreatEq = ">=",
  Equals = "==",
  NotEquals = "!=",
  Is = "is",
}

export enum UniOp {
  Not = "not",
  Neg = "-",
}
