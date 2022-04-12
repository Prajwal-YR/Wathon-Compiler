import * as mocha from 'mocha';
import { expect } from 'chai';
import { parser } from 'lezer-python';
import { traverseExpr, traverseStmt, traverse, parse } from '../parser';
import { Program, Stmt } from '../ast';

// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(c, s) function', () => {
  it('parses a number in the beginning', () => {
    const source = "987";
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();
    // go to expression
    cursor.firstChild();

    const parsedExpr = traverseExpr(cursor, source);

    // Note: we have to use deep equality when comparing objects
    expect(parsedExpr).to.deep.equal({ tag: "num", value: 987 });
  })

  // TODO: add additional tests here to ensure traverseExpr works as expected
});

describe('traverseStmt(c, s) function', () => {
  // TODO: add tests here to ensure traverseStmt works as expected
  it('parses an assignment statement', () => {
    const source = "x=2";
    const cursor = parser.parse(source).cursor();

    // go to statement
    cursor.firstChild();

    const parsedStmt = traverseStmt(cursor, source);

    // go to expression
    cursor.firstChild();
    cursor.nextSibling(); // go to equals
    cursor.nextSibling(); // go to value
    const value = traverseExpr(cursor, source);



    // Note: we have to use deep equality when comparing objects
    expect(parsedStmt).to.deep.equal({ tag: "define", name: "x", value });
  })
});

describe('traverse(c, s) function', () => {
  // TODO: add tests here to ensure traverse works as expected
  it('traverse a statement', () => {
    const source = "987"
    const t = parser.parse(source);
    const parsed = traverse(t.cursor(), source);
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: 987 } }]);
  });
  it('traverse multiple statements', () => {
    const source = "x=2\nx+2"
    const t = parser.parse(source);
    const parsed = traverse(t.cursor(), source);
    const actual: Array<Program<null>> = []
    const sources = source.split('\n');
    sources.forEach(s => {
      const t = parser.parse(s);
      actual.push(traverse(t.cursor(), s));
    })
    expect(parsed).to.deep.equal(actual);
  });

});

describe('parse(source) function', () => {
  it('parse a number', () => {
    const parsed = parse("987");
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: 987 } }]);
  });

  // TODO: add additional tests here to ensure parse works as expected

  it('parse a negative number', () => {
    const parsed = parse("-987");
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: -987 } }]);
  });

  it('parse a positive number', () => {
    const parsed = parse("+987");
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: 987 } }]);
  });

  it('parse 2+3', () => {
    const parsed = parse("2+3");
    const left = {tag:"num", value:2}
    const right = {tag:"num", value:3}
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "binexpr", op:"+", left, right } }]);
  });
  it('parse 2-3', () => {
    const parsed = parse("2-3");
    const left = {tag:"num", value:2}
    const right = {tag:"num", value:3}
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "binexpr", op:"-", left, right } }]);
  });
  it('parse 2*3', () => {
    const parsed = parse("2*3");
    const left = {tag:"num", value:2}
    const right = {tag:"num", value:3}
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "binexpr", op:"*", left, right } }]);
  });
  it('parse 2/3 should fail', function(done) {
    expect(parse.bind(null,"2/3")).to.throw('ParseError')
    done()
  });
  it('parse 2%3 should fail', function(done) {
    expect(parse.bind(null,"2%3")).to.throw('ParseError')
    done()
  });

  it('parse abs(987)', () => {
    const parsed = parse("abs(987)");
    const arg = { tag: "num", value: 987 }
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "builtin1", name: "abs", arg } }]);
  });
  it('parse print(987)', () => {
    const parsed = parse("print(987)");
    const arg = { tag: "num", value: 987 }
    expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "builtin1", name: "print", arg } }]);
  });
  it('parse max(987,989)', () => {
    const parsed = parse("max(987,989)");
    const arg1 = {tag: "num", value: 987}
    const arg2 = {tag: "num", value: 989}
    expect(parsed).to.deep.equal([{tag: "expr", expr: {tag: "builtin2", name:"max", arg1, arg2}}]);
  }); 
  it('parse min(987,989)', () => {
    const parsed = parse("min(987,989)");
    const arg1 = {tag: "num", value: 987}
    const arg2 = {tag: "num", value: 989}
    expect(parsed).to.deep.equal([{tag: "expr", expr: {tag: "builtin2", name:"min", arg1, arg2}}]);
  }); 
  it('parse pow(2,3)', () => {
    const parsed = parse("pow(2,3)");
    const arg1 = {tag: "num", value: 2}
    const arg2 = {tag: "num", value: 3}
    expect(parsed).to.deep.equal([{tag: "expr", expr: {tag: "builtin2", name:"pow", arg1, arg2}}]);
  });
  
  it('parse abs(987,989) should fail', function(done) {
    expect(parse.bind(null,"abs(987,989)")).to.throw('ParseError')
    done()
  });
  
  it('parse max(987) should fail', function(done) {
    expect(parse.bind(null,"max(987)")).to.throw('ParseError')
    done()
  });

  it('parse max(987,988,989) should fail', function(done) {
    expect(parse.bind(null,"max(987,988,989)")).to.throw('ParseError')
    done()
  });
  
  it('parse min(987) should fail', function(done) {
    expect(parse.bind(null,"min(987)")).to.throw('ParseError')
    done()
  });
  it('parse min(987,988,989) should fail', function(done) {
    expect(parse.bind(null,"min(987,988,989)")).to.throw('ParseError')
    done()
  }); 

  it('parse pow(9) should fail', function(done) {
    expect(parse.bind(null,"pow(9)")).to.throw('ParseError')
    done()
  });

  it('parse sqrt(987) should fail', function(done) {
    expect(parse.bind(null,"sqrt(987)")).to.throw('ParseError')
    done()
  });


});

