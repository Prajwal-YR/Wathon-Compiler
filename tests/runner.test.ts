import { run } from '../runner';
import { expect } from 'chai';
import 'mocha';

const importObject = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    print: (arg : any) => {
      importObject.output += arg;
      importObject.output += "\n";
      return arg;
    },
    print_num: (arg: any) => {
      importObject.output += String(arg);
      importObject.output += "\n";
      return 0;
    },
    print_bool: (arg: any) => {
      if (arg === 0) { importObject.output += "False"; }
      else { importObject.output += "True"; }
      importObject.output += "\n";
      return 0;
    },
    print_none: (arg: any) => {
      importObject.output += "None";
      importObject.output += "\n";
      return 0;
    },
    abs: Math.abs,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
  },

  output: ""
};

// Clear the output before every test
beforeEach(function () {
  importObject.output = "";
});
  
// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
describe('run(source, config) function', () => {
  const config = { importObject };
  
  // We can test the behavior of the compiler in several ways:
  // 1- we can test the return value of a program
  // Note: since run is an async function, we use await to retrieve the 
  // asynchronous return value. 
  it('returns the right number', async () => {
    const result = await run("987", config);
    expect(result).to.equal(987);
  });

  it('returns the right number (signed)', async () => {
    const result = await run("-987", config);
    expect(result).to.equal(-987);
  });

  it('returns the right number (signed)', async () => {
    const result = await run("+987", config);
    expect(result).to.equal(987);
  });

  
  // 2- we can test the behavior of the compiler by also looking at the log 
  // resulting from running the program
  it('prints something right', async() => {
    var result = await run("print(1337)", config);
    expect(config.importObject.output).to.equal("1337\n");
  });

  // 3- we can also combine both type of assertions, or feel free to use any 
  // other assertions provided by chai.
  it('prints two numbers ', async () => {
    var result = await run("print(987)", config);
    result = await run("print(123)", config);
    
    expect(config.importObject.output).to.equal("987\n123\n");
  });

  // Note: it is often helpful to write tests for a functionality before you
  // implement it. You will make this test pass!
  it('adds two numbers', async() => {
    const result = await run("2 + 3", config);
    expect(result).to.equal(5);
  });

  // TODO: add additional tests here to ensure the compiler runs as expected
  it('subtracts two numbers', async() => {
    const result = await run("2 - 3", config);
    expect(result).to.equal(-1);
  });

  it('multiplies two numbers', async() => {
    const result = await run("2 * 3", config);
    expect(result).to.equal(6);
  });

  it('Expression evaluation', async() => {
    const result = await run("2+3*5-2", config);
    expect(result).to.equal(2+3*5-2);
  });

  it('abs', async() => {
    const result1 = await run("abs(987)", config);
    const result2 = await run("abs(-987)", config);
    expect(result1).to.equal(987);
    expect(result2).to.equal(987);
  });

  it('max', async() => {
    const result = await run("max(987,989)", config);
    expect(result).to.equal(989);
  });

  it('min', async() => {
    const result = await run("min(987,989)", config);
    expect(result).to.equal(987);
  });

  it('pow', async() => {
    const result = await run("pow(2,3)", config);
    expect(result).to.equal(8);
  });
  it('Assigning expression', async() => {
    const result = await run("x:int=0\nx=2+3*5-2\nx", config);
    expect(result).to.equal(2+3*5-2);
  });

  it('referencing before assignment should fail', async() => {
    let error = null;
    try {
      await run("y+2",config)
    }
    catch (err) {
      error = err
    }
    expect(error).to.be.an('Error')
    expect(error.message).to.contain('Not a variable')

  });
  it('referencing before assignment should fail 2', async() => {
    let error = null;
    try {
      await run("y=z",config)
    }
    catch (err) {
      error = err
    }
    expect(error).to.be.an('Error')
    expect(error.message).to.contain('Not a variable')

  });
  it('referencing undefined function', async() => {
    let error = null;
    try {
      await run("sqrt(2)",config)
    }
    catch (err) {
      error = err
    }
    expect(error).to.be.an('Error')
    expect(error.message).to.contain('Not a Function')

  });
});

describe('pa2 tests', () => {
  const config = { importObject };
  it('testcase 1', async() => {
    var source = `x : int = 5
    y : int = 3
    y = x + 1
    x = y + 1
    print(x)
    print(y)`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("7\n6\n");
  });

  it('testcase 2', async() => {
    var source = `a : int = 50
    def f(b : int) -> int:
        if b < 25:
            return b * 2
        else:
            return b
    print(f(a))
    print(f(10))`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("50\n20\n");
  });

  it('testcase 3: Recursion', async() => {
    var source = `def sum(n : int) -> int:
    if n < 1: return 0
    else: return sum(n - 1) + n
sum(4)`
    const result = await run(source, config);
    expect(result).to.equal(10);
  });

  it('testcase 4', async() => {
    var source = `def sum(n : int) -> int:
    total : int = 0
    while n > 0:
        total = total + n
        n = n - 1
    return total
  sum(4)`
    const result = await run(source, config);
    expect(result).to.equal(10);
  });

  it('testcase 5', async() => {
    var source = `def f():
    pass
def g():
    pass
print(g() is f())`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("True\n");
  });

  it('testcase 6: loop that has multiple iterations, and calls a function on each iteration', async() => {
    var source = `x:int = 5
    def my_print(x:int):
        print(x)
    while x>0:
        my_print(x)
        x = x-1`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("5\n4\n3\n2\n1\n");
  });

  it('testcase 7: A program that returns from the body of a loop, and not on the first iteration of the loop', async() => {
    var source = `def func(x:int)->int:
    while x > 0:
        x = x-2
        if x < 0:
            return -x
    return x
print(func(4))
print(func(5))`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("0\n1\n");
  });

  it('testcase 8: Mutual recursion', async() => {
    var source = `def is_even(n:int) -> bool:
    if (n == 0):
        return True
    else:
        return is_odd(n - 1)
def is_odd(n:int) -> bool:
    if (n == 0):
        return False
    else:
        return is_even(n - 1)
print(is_even(4))
print(is_odd(4))
print(is_even(3))
print(is_odd(3))`
    const result = await run(source, config);
    expect(config.importObject.output).to.equal("True\nFalse\nFalse\nTrue\n");
  });

  it('TypeError should be caught', async() => {
    let error = null;
    try {
      const source =`def f(q : bool) -> int:
      if q < 25:
          return 99
      else:
          return 500
  print(f(p))
  print(f(False))`
      await run(source,config);
    }
    catch (err) {
      error = err
    }
    expect(error).to.be.a('Error')
    expect(error.message).to.contain('Cannot apply operator')

  });

  it('No return should fail', async() => {
    let error = null;
    try {
      await run(`def demo(y:bool)->int:
      while y:
          return 1`,config)
    }
    catch (err) {
      error = err
    }
    expect(error).to.be.an('Error')
    expect(error.message).to.contain('All paths must have return')

  });

});