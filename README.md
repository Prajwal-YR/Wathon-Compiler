# CSE 231 PA1

## Python programs that have different behaviours
* Redfining builtin functions
    ```python
    pow = 1
    pow(pow,pow)
    ```
    This program would raise an error in CPython as ```pow``` is redefined and assigned to an integer value and hence is no longer callable. Our compiler however returns the output as **1**.

* Power with negative exponents
    ```python
    pow(2,-2)
    ```
    CPython will return the value as **0.25** as it automatically interprets the result as float. Our compiler returns **0** as only 32-bit integers are allowed.

* Behaviour of ```print```
    ```python
    a = 2
    b = 3
    print(a,b)
    ```
    CPython will output both values separated by a <space> however our compiler raises and error as print only accepts one argument.

* Swapping of two numbers
    ```python
    a = 2
    b = 3
    a,b = b,a
    print(a)
    print(b)
    ``` 
    This logic for swapping two variables will work in CPython. The new values of ```a``` and ```b``` will be **3** and **2** respectively. However, in our compiler it fails and only the value of ```a``` is changed to **3** whereas b remains unchanged.

* Multiple assignments in a single statement
    ```python
    a,b = 1,2
    ```
    Assignements to multiple variables in a single statement as shown above is allowed in CPython. In our compiler ```a``` and ```b``` get assigned garbage values or **0**.

* Interpreter behaviour
    ```python
    print(2)
    print(a)
    ```
    In CPython, the value of 2 is printed and then an error is raised for accessing an undefined variable ```a```. However, our compiler detects this error before execution and hence does not print anything.


# Resources
* TA Yousef Alhessi's Office hours was very helpful.
* VSCode guides on using the debugger for TypeScript.
* WASM instruction guides.

# Collaboration
I worked with two of my fellow classmates to verify compiler behaviours after coding everything individually.

* *Name:* Pratyush Karmakar *PID:* A59012917
* *Name:* Shreya Sahay *PID:* A53299278 
