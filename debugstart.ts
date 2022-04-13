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
var source = 
`
def f():
  print(1)
  return
f()
`
var ast_lezer = parser.parse(source);
console.log(stringifyTree(ast_lezer.cursor(),source,0));
var ast = parse(source)
console.log(JSON.stringify(ast,null,2))
const ProgramEnv:TypeEnv = {vars: new Map(), funcs: new Map, retType: Type.none};
const typedAst = typeCheckProgram(ast, ProgramEnv);
console.log(JSON.stringify(typedAst,null,2))

var compiled = compile(source)
console.log(JSON.stringify(compiled,null,2))


