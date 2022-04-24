import {compile} from './compiler';
import {run} from './runner';

// command to run:
// node node-main.js 987
const input = process.argv[2];
const result = compile(input);
console.log(result);
run(input, {}).then((value) => {
  console.log(value);
});
