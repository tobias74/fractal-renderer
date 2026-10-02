# Title

Adreno 8xx (Android): fragment shader with long if/else chains and early returns computes wrong colours (8×8 dot grid, grey/black output); the same logic written with select() is correct

# Body

## Summary

On a Samsung Galaxy S25 Ultra (Qualcomm Adreno 8xx), a large WebGPU fragment shader computed wrong results. The shader had long `if` / `else if` chains that assign to the same variable, plus helper functions with early `return`s. Instead of the palette colours, the output was a grey or black-and-white image. Magnified, it showed a regular dot grid: **1 of every 64 fragments** took the conditional assignment and the other 63 did not, while an early return in a helper did the opposite. Rewriting the same logic without branches (`select()`, `&` / `|` instead of `&&` / `||`) made the output correct on the device. On desktop GPUs, both versions give identical pixels.

This happened three times in the same application as its shader grew: on 2026-09-20, 2026-09-21 and 2026-09-26. Each time, a change that turned `select()` into `if` or lengthened a chain broke the device, and going back to `select()` fixed it.

## Environment

- Device: Samsung Galaxy S25 Ultra (SM-S938B), Android 16
- Browser: Chrome for Android [VERSION – see attached chrome://gpu]
- GPU: `adapter.info` reports vendor `qualcomm`, architecture `adreno-8xx`
- Driver: [DRIVER VERSION – see attached chrome://gpu]
- Backend: WebGPU on Vulkan. A WebGL 2 version of the same application behaved the same way, which suggests the driver's shader compiler rather than Tint.
- Desktop reference: Chrome 152, Windows 11, NVIDIA RTX 4060 (D3D12) renders all versions correctly and identically.

## Steps to reproduce

`repro.html` is a standalone page.

1. Serve the attached `repro.html` over HTTPS or from localhost (WebGPU needs a secure context).
2. Open it on the device and wait until the table is filled.

The page renders the same colour function twice into a 256 × 256 texture: once as an `if` / `else if` chain with early returns, once branch-free with `select()`. It uses 4, 16, 64 and 120 branches, and the input comes from an `rg32uint` texture as in the application. It compares the pixels, reports whether the differences form the 8×8 grid pattern, and has a button to copy the results.

Expected: all 16 cases PASS, as on desktop.

Actual on Adreno: [RESULT ON THE DEVICE – paste the output of “Copy results as text”]

## Where it was observed

In a browser fractal renderer (https://fractalrenderer.com, source https://github.com/tobias74/fractal-renderer). The colour pass there has since been rewritten without run-time branches, so the live site no longer shows the problem.

- 2026-09-20: conditional assignments deep in the colour function were executed for 1 of 64 fragments only (8×8 dot grid); early returns in a helper for the other 63.
- 2026-09-21: a change that switched two helper functions from `select()` to `if` / early `return` turned an image area black; switching back fixed it.
- 2026-09-26: after the chain had grown further, the default path (escape time through the palette) in the final `else` was no longer taken for most fragments: a grey / black-and-white picture with a fine dot grid.

## Code shape that fails (excerpt, simplified)

```wgsl
fn sampleColor(px: vec4u, xy: vec2i) -> vec3f {
  let m = u32(C.misc.w);                       // colouring mode (uniform)
  let inside = (px.x & 0x80000000u) != 0u;     // per pixel
  var col = vec3f(0.0);
  if (m == 29u) { col = pal(bitcast<f32>(px.y) * C.misc.x * 2.5 + C.misc.y); }
  else if (m == 17u || m == 24u || m == 32u) { col = pal(log(max(bitcast<f32>(px.y), 1.0e-30)) * 0.12 + C.misc.y); }
  else if (m == 35u) { col = pal(bitcast<f32>(px.y) * 30.0 * C.misc.x + C.misc.y); }
  // … many more branches …
  else if (m == 4u) { col = distanceShade(xy, bitcast<f32>(px.y)); }
  else {                                          // the default path: escape time through the palette
    let nu = f32(px.x & 0x03FFFFFFu) * (1.0 / 256.0);
    col = pal((mapNu(nu) - anchorV()) * C.misc.x + C.misc.y);
    if (glowMode == 1u) { col *= 1.0 - g; } else { col = mix(col, vec3f(1.0), g); }
  }
  if (C.tex2.y > 0.5 && (!inside || C.opt.x > 0.5)) { col = applyTexture(col, tw, inside); }
  return col;
}
```

On the device, the default path in the final `else` was not taken for most fragments, even though the mode matched none of the branches. The fix computes the default path after the chain, without branches, and selects it:

```wgsl
  {
    let usual = /* none of the special modes, as a bool expression built with & and | */;
    let nuA = f32(px.x & 0x03FFFFFFu) * (1.0 / 256.0);
    var a1 = pal((mapNu(nuA) - anchorV()) * C.misc.x + C.misc.y);
    col = select(col, a1, usual);
  }
```

The 2026-09-21 case (early return; correct before, black area after):

```wgsl
// correct on device
let applies = (!select(wo == 1u, wo == 0u, inside)) & (target(i) == 2u) & (!still(i));
return select(col, select(mix(col, texMix(col, v), mk), vec3f(mk), showMask(i)), applies);

// broken on device (black area)
let applies = (!select(wo == 1u, wo == 0u, inside)) & ((z == 2u) | (z == 4u)) & (!still(i));
if (!applies) { return col; }
var neu = texMix(col, v);
if (z == 4u) { neu = saturationOn(col, v); }
return select(mix(col, neu, mk), vec3f(mk), showMask(i));
```

## What was ruled out

Probes on the device, first with a constant output colour and then with data-dependent ones, showed:

- Uniforms arrive correctly.
- The `rg32uint` input texture holds the expected values.
- Floats and bitcasts are correct, so precision is not the cause.
- `pal(0.3)` alone, and the raw escape time through the palette alone, render correctly.

Only the chain of conditional assignments produces wrong results.

## Observations

- Pixel-dependent conditions are affected. So is at least one uniform condition: a probe `if (m0 == 4u) { col = …; }`, with `m0` from a uniform, gave a pale, wrong image.
- Not every branch fails. Some single `if`s and returns worked on the device. The failures started as the shader and its chains grew.
- The 1-of-64 versus 63-of-64 split in an 8×8 grid suggests that divergent control flow is masked or reconverged wrongly within a wave. This is an assumption.

## Workaround in use

Branch-free code (`select()`, `&` and `|`) wherever a condition is not a compile-time constant. Settings are passed as pipeline-overridable constants (`override`), so the compiler removes those branches. With that, the device renders correctly and the desktop output is bit-identical.

## Attachments

- `repro.html`: the test page
- `chrome-gpu.txt`: chrome://gpu from the device
- [optional] photo or screenshot of the wrong output
