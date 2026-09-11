# Fractal Renderer

A fractal explorer that runs entirely in the browser, on the GPU via WebGPU with a fallback to WebGL 2.

Live: <https://fractalrenderer.com>

This is an agentically developed project: the code, the shaders and the tests were written by an AI
coding agent. It can probably only be extended the same way, agentically.

## Why one big file works

Everything that runs in the browser lives in `index.html`: markup, styles, script, the WGSL and GLSL
shaders and the texts of the subpages, about 8,000 lines. A human developer would not organise code
this way and would split it into many files and modules. An AI agent, however, works well with this
structure, for three reasons:

- **No build step, one truth.** What the tests check is byte for byte what gets deployed. Modules
  would need a build step, and a forgotten build would mean testing or shipping stale output.
- **Size is not the bottleneck.** An agent never reads the file in one piece. It searches with
  patterns and edits by exact text anchors, which works for 8,000 lines as well as for 800. Section
  headers of the form `//  Name`, listed in a table of contents at the top of the script, let an
  agent without prior context find its way quickly.
- **Data at the end.** The long legal texts sit at the very end of the script, so searches in the
  code stay clean.

## License

MIT, see [LICENSE](LICENSE). The texts of the imprint and the privacy policy inside `index.html` are
not covered by it.
