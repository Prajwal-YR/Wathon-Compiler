import { run } from './runner';


function webStart() {
  document.addEventListener("DOMContentLoaded", function () {
    function display(arg: string) {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.innerText = arg;
    }
    var importObject = {
      imports: {
        print: (arg: any) => {
          console.log("Logging from WASM: ", arg);
          const elt = document.createElement("pre");
          document.getElementById("output").appendChild(elt);
          elt.innerText = arg;
          return arg;
        },
        print_num: (arg: any) => {
          console.log("Logging from WASM: ", arg);
          display(String(arg));
          return 0;
        },
        print_bool: (arg: any) => {
          if (arg === 0) { display("False"); }
          else { display("True"); }
          return 0;
        },
        print_none: (arg: any) => {
          display("None");
          return arg;
        },
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
      },
    };

    function renderResult(result: any): void {
      if (result === undefined) { console.log("skip"); return; }
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.innerText = String(result);
    }

    function renderError(result: any): void {
      const elt = document.createElement("pre");
      document.getElementById("output").appendChild(elt);
      elt.setAttribute("style", "color: red");
      elt.innerText = String(result);
    }

    document.getElementById("run").addEventListener("click", function (e) {
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      const output = document.getElementById("output").innerHTML = "";
      run(source.value, { importObject }).then((r) => { renderResult(r); console.log("run finished") })
        .catch((e) => { renderError(e); console.log("run failed", e) });;
    });
    const textarea = document.querySelector("textarea");

    textarea.addEventListener("keydown", (e) => {
      if (e.keyCode === 9) {
        e.preventDefault();

        textarea.setRangeText(
          "  ",
          textarea.selectionStart,
          textarea.selectionStart,
          "end"
        );
      }
    });
  });
}

webStart();
