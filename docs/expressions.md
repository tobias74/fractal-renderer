# Custom expressions

Three places in the app accept your own formulas, written in a small expression language:

| Where | What it computes | Panel |
|---|---|---|
| **Custom collector** | one real number per orbit step, aggregated into one value per pixel | Colour → *Colouring by* → *Custom collector*; also as a value of either axis of *Combine values* and as a texture kind of any texture slot. Every place has its own expression |
| **Custom plane mapping** | `c → g(c)`, applied to the plane before iterating | Motif → *More settings* → *Plane mapping* → *Custom expression g(c)* |
| **Custom formula** | the next orbit point `z ← f(z, z_1, z_2, c, n, a, b)` | Motif → *Formula* → *Custom formula* |

Everything you type is part of the link in the address bar, so a custom fractal can be shared like any other view. Colour stays where it always is: in the palettes. Expressions only produce numbers (collectors) or orbit points (formula, mapping).

## Notation

The language is plain ASCII, close to how you would write mathematics in a text message. Unicode is accepted and translated on input (`·`, `−`, `π`, `√`, `²`, `z₁`, `≤`, `≥`, `≠`); the link always stores the ASCII form. Below each field the app shows how it read your expression, or the error with its position.

| | Examples |
|---|---|
| Arithmetic | `+ - * /`, power `^` (right-associative, `z^-1` allowed) |
| Juxtaposition is multiplication | `2z`, `(z+1)(z-1)`, `3|z|`, `a b z` |
| Absolute value | `|z|` or `abs(z)` |
| Parentheses | `(z + 1)^2` |
| Function without parentheses | `sin z`, `sqrt 2`, `re z` (binds like a sign: `sin z^2` is `sin(z^2)`, `sin 2z` is `sin(2)·z`) |
| Conditional | `condition ? A : B` with `< <= > >= == !=` (comparisons need real values) |
| Constants | `pi`, `e`, `i` |
| Functions | `sin cos tan sinh cosh tanh exp ln log sqrt abs re im arg conj floor round frac sign` and `min(a, b)`, `max(a, b)`, `atan(y, x)` |

`ln` and `log` are both the natural logarithm. Complex functions use the principal branch; a complex power `z^w` is `exp(w·ln z)`, an integer power is a product. `min`, `max`, `atan` and comparisons take real values only; `abs`, `re`, `im`, `arg` turn a complex value into a real one.

## Variables

| Context | Variables | Result |
|---|---|---|
| Collector value | `z` (current orbit point), `z_1`, `z_2` (one and two steps back), `c`, `n` (step number), `s` (state) | real |
| Collector state | the same | real |
| Plane mapping | `c` | complex |
| Formula | `z`, `z_1`, `z_2`, `c`, `n`, `a`, `b` (the two sliders) | complex |

A real result where a complex one is expected is fine (it is taken as `x + 0i`). A complex result where a real one is required is an error: wrap it in `re(…)`, `im(…)`, `|…|` or `arg(…)`.

## Custom collectors

Each step of the orbit, the collector first evaluates the optional state line `s = …` (state starts at 0), then the value expression. The *aggregation* turns the values of all steps into one number per pixel:

| Aggregation | Result |
|---|---|
| Mean (weighted) | weighted mean; the *Weighting* and *Decay* sliders apply |
| Minimum / Maximum | smallest / largest value |
| Sum | sum of all values |
| Last value | the value of the last step |
| Step of the minimum | the step number at which the minimum occurred |

The *Lead* slider skips the first steps as for the other orbit statistics. The result is coloured like the stripe average (density and offset apply, a colour anchor is available), inside the set as well as outside. As a texture kind a value between 0 and 1 is expected.

The expression belongs to the place that uses it: the colouring has one, each axis of *Combine values* has its own, and each texture slot has its own. Up to six different expressions can run at once (the shader has six collector slots).

Examples:

| Expression | Aggregation | Effect |
|---|---|---|
| `|z|` | Minimum | closest approach to the origin |
| `min(|z - 1|, |z + 1|)` | Minimum | two point traps |
| `|re z im z|` | Minimum | a cross trap along the axes |
| `0.5 + 0.5 sin(4 arg z)` | Mean | stripe average with four stripes |
| `frac(2 arg z / pi)` | Mean | sawtooth over the angle |
| value `s`, state `s + (|z| < 1 ? 1 : 0)` | Last value | how many steps the orbit spent inside the unit circle |

## Custom plane mapping

`g(c)` maps the plane before the iteration starts, like the built-in mappings (`e^z`, `ln z`, `z²`, …). Any complex expression in `c` works; the derivative for the distance estimate is computed automatically. Examples: `c^3`, `c/(1 + c^2)`, `sin(c)^2`, `conj(c)^2`.

## Custom formula

The formula gives the next orbit point. It is computed directly in fp32 (zoom up to 10^5, no perturbation), so *Fold per step*, *Memory* and *Start at the pixel* apply as for the other direct formulas. The derivatives needed for distance estimation, lighting and the Lyapunov colourings are generated automatically, also for non-holomorphic expressions (`conj`, `abs`, `re`, `im`). `a` and `b` are the two sliders in the Motif panel. Formulas whose orbit does not escape can be coloured with a custom collector.

Examples: `z^2 + c` (the default), `cosh(z) + c`, `sin(z)^2 + c`, `z^2 + c/z` (with *Start at the pixel*), `exp(z)/z + c`, `z^2 + c + a z_1`.

## Link keys

| Key | Meaning |
|---|---|
| `f=37&xf=…` | custom formula |
| `ab=7&xm=…` | custom plane mapping |
| `map=35` | colouring by the custom collector |
| `xc`, `xcs`, `xcg` | its value, state and aggregation (0 mean, 1 minimum, 2 maximum, 3 sum, 4 last value, 5 step of the minimum) |
| `pa=10:…`, `pb=10:…` | a custom expression as the value of an axis of *Combine values*; the expression in `pae`, `paes`, `paeg` and `pbe`, `pbes`, `pbeg` |
| `tx=22`, `t2=22`, `t3=22`, `t4=22` | a custom expression as the texture kind of a slot; the expression in `te`, `tes`, `teg` for slot 1 and `t2e`, `t2es`, `t2eg` … for the others |

In a link a space is written as `+` and a literal plus sign as `%2B`; the app writes links this way itself.

## Example links

Custom formulas:

- <https://fractalrenderer.com/#mode=mandel&f=37&xf=cosh(z)+%2B+c&z=0.5&re=0&im=0>
- <https://fractalrenderer.com/#mode=mandel&f=37&xf=sin(z)%5E2+%2B+c&z=0.5&re=0&im=0>
- <https://fractalrenderer.com/#mode=mandel&f=37&xf=z%5E2+%2B+c%2Fz&zc=1&z=0.6&re=0&im=0>
- <https://fractalrenderer.com/#mode=mandel&f=37&xf=exp(z)%2Fz+%2B+c&zc=1&z=0.5&re=0&im=0>
- <https://fractalrenderer.com/#mode=mandel&f=37&xf=z%5E2+%2B+c+%2B+a+z_1&pp=0.5&z=0.8>
- A formula that converges instead of escaping, coloured by the mean of `|z|`: <https://fractalrenderer.com/#mode=mandel&f=37&xf=ln(%7Cre+z%7C+%2B+i+im+z)+%2B+c&zc=1&map=35&xcg=0&z=0.5&re=0&im=0>

Custom collectors:

- Two point traps: <https://fractalrenderer.com/#mode=mandel&map=35&xc=min(%7Cz+-+1%7C%2C+%7Cz+%2B+1%7C)&z=0.8>
- Cross trap: <https://fractalrenderer.com/#mode=mandel&map=35&xc=%7Cre+z+im+z%7C&z=0.8>
- Steps inside the unit circle, via the state: <https://fractalrenderer.com/#mode=mandel&map=35&xc=s&xcs=s+%2B+(%7Cz%7C+%3C+1+%3F+1+%3A+0)&xcg=4&z=0.8>
- Two expressions as the two values of *Combine values*: <https://fractalrenderer.com/#mode=mandel&map=31&pa=10:1:0:0&pb=10:20:0:0&pae=%7Cim+z%7C&pbe=frac(2+arg+z%2Fpi)&pbeg=0&z=0.8>
- Two expressions on two texture slots: <https://fractalrenderer.com/#mode=mandel&tx=22&te=frac(2+arg+z%2Fpi)&teg=0&t2=22&t2e=%7Cim+z%7C&z=0.8>

Custom plane mappings:

- <https://fractalrenderer.com/#mode=mandel&ab=7&xm=c%2F(1+%2B+c%5E2)&z=0.6&re=0&im=0>
- <https://fractalrenderer.com/#mode=mandel&ab=7&xm=sin(c)%5E2&z=0.5&re=0&im=0>

## Errors

Every error names the position in your input: unknown name, unexpected character, missing `)` or `|`, wrong number of arguments, expression ends too early, comparison of complex values, a comparison used as a value, a complex result where a real one is needed. While a field holds an invalid expression, the previous valid one stays in effect and in the link.

## Checking the language offline

`node tools/ausdruck-pruefen.js` runs the parser, printer, evaluator and code generator against a table of cases; the Cypress spec `cypress/e2e/20-ausdruck.cy.js` covers the fields, the link and the rendered images on WebGPU and WebGL 2.
