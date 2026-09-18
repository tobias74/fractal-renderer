# Fractal layers

Several fractals can lie on top of each other. Each layer is a complete fractal of its own: formula, Julia or Mandelbrot, plane, iterations, colouring, textures and palette. The bottom layer is the ground; every layer above it blends into what lies below with a blend mode, an opacity and an optional mask.

## Where things are

| Place | What it does |
|---|---|
| **Layer row** at the top of *Motif*, *Colour* and *Palette* | Which layer these three panels edit. A pill per layer, the selected one highlighted; `+` adds a copy of the selected layer above it and selects it; `×` on the selected pill removes it. With a single layer only the `+` is shown. The panel title says which layer is being edited (“Colour · Layer 2”). |
| **Layers** panel in the bar on the right (the mixer) | One card per layer: name, visibility, solo, blend mode, opacity, mask, whether the view is linked, duplicate, remove, drag to reorder. Clicking a card selects that layer for editing as well. |
| *Quality*, *Post-processing*, *Technical* | Belong to the whole image: anti-aliasing, the post-processing stack (it works on the blended result) and the renderer settings. |

## Blend modes

Normal, Multiply, Screen, Overlay, Darken, Lighten, Colour dodge, Colour burn, Hard light, Soft light, Difference, Exclusion, Add, Subtract, Hue, Saturation, Colour, Luminosity. The formulas are the usual ones from image editors (W3C compositing), computed on the finished sRGB colours of the layers.

## Masks

A layer's mask is evaluated from that layer's own orbit data: inside/outside, tonal range, iteration range, bands along the escape time, colour range, distance band, texture value. The mask multiplies the opacity per pixel. (Edge masks and the “state after a layer” mask belong to the post-processing layers.)

## The view

All layers share the view of the first layer unless a layer is *unlinked* (“Linked to the view” off in the mixer). An unlinked layer keeps its own centre, zoom and rotation; while it is selected, mouse and keyboard move only it, the other layers stay put. *Align view* puts it back onto the view of the first layer. The zoom text and the coordinates at the bottom always describe the selected layer.

## Rendering

The selected layer renders as before, tile by tile, with its own anti-aliasing. When it is finished its colour is kept, and the other layers that are out of date render one after another (the status line names the layer). While that happens the composite shows the kept colours of the other layers, shifted and scaled to the current view where they moved. Anti-aliasing runs per layer on the finished colour; the composite blends the smoothed layers.

Exports (*Save image*) render every visible layer per tile and blend them like the screen does, including post-processing.

## The link

The first layer is written as before. Every further layer is a parameter set of its own in `l2`, `l3`, …, its mixing in `lm2`, … (`mode:opacity:visible:solo:linked:name`), its mask in `lu2`, … and the selected layer in `la`. A linked layer carries no view of its own in its parameter set; an unlinked one does (`re`, `im`, `z`, `dr`). Up to six layers.
