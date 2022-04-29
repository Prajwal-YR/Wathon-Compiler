import { parse } from './parser';
import { TypeEnv, typeCheckProgram } from './typecheck';
import {parser} from "lezer-python";
import { TreeCursor } from "lezer-tree";
import { Type } from './ast';
import { compile } from './compiler';

function stringifyTree(t:TreeCursor, source: string, d:number){
    var str = "";
    var spaces = " ".repeat(d*2);
    str += spaces + t.type.name;
    if(["Number","CallExpression","BinaryExpression","UnaryExpression","Boolean"].includes(t.type.name)){
        str += "-->" + source.substring(t.from, t.to); 
    }
    str += "\n";
    if(t.firstChild()){
        do{
            str += stringifyTree(t, source, d + 1);
            
        
        }while(t.nextSibling());
        t.parent(); 
    }
    return str; 
}
var source =  `
class Rat(object):
 n:int=0
 d:int=0
 def __init__(self:Rat):
    pass
 def new(self:Rat,n:int,d:int)->Rat:
    self.n=n
    self.d=d
    return self
 def mul(self:Rat,other:Rat)->Rat:
    return Rat().new(self.n*other.n,self.d*other.d)
r1:Rat=None
r2:Rat=None
r3:Rat=None
r1 = Rat()
r1.new(4,5)
print(r1.n)
print(r1.d)
r2 = Rat()
r2.new(10,20)
print(r2.n)
print(r2.d)
r3 = r1.mul(r2)
print(r3.n)
print(r3.d)`
source = `
class C(object):
    n:int = 1
    m:int = 10
    def __init__(self:C):
        pass
c:C=None
c=C(1)
c.n
`

var ast_lezer = parser.parse(source);
console.log(stringifyTree(ast_lezer.cursor(),source,0));
var ast = parse(source)
console.log(JSON.stringify(ast,null,2))
const ProgramEnv:TypeEnv = {vars: new Map(), funcs: new Map(), classes:new Map(),  retType: "None", };
const typedAst = typeCheckProgram(ast, ProgramEnv);
// console.log(typedAst.stmts[typedAst.stmts.length-1].a);
console.log(JSON.stringify(typedAst,null,2))

var compiled = compile(source)
console.log("Globals",compiled.globals);
console.log(compiled.wasmSource);


