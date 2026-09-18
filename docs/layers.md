# Fractal layers

Several fractals can lie on top of each other. Each layer is a complete fractal of its own: formula, Julia or Mandelbrot, plane, iterations, colouring, textures, palette and anti-aliasing. The bottom layer is the ground; every layer above it blends into what lies below with a blend mode, an opacity and an optional mask.

## Where things are

| Place | What it does |
|---|---|
| **Layer stack** at the top of the panel, above every section | Which layer the sections *Motif*, *Colour*, *Textures*, *Palette* and *Quality* edit. One row per layer, the top layer first; the selected row is highlighted and its colour runs as a stripe along the panel and the “Layer” group of the bar. Each row has the eye (visible), S (solo), a grip to reorder (drag or arrow keys), and × to remove (with a confirmation; also the Delete key). `+` in the header adds a copy of the selected layer above it; the header switch decides whether gestures move all layers or only the selected one. With a single layer only the header is shown. |
| **Blend** section (in the “Layer” group of the bar; on phones the “Blend” tab) | Belongs to the selected layer: name, blend mode, opacity, mask, whether the view is linked, align view, fine alignment. The ground shows a note instead. |
| *Quality* (smoothing) | Belongs to the selected layer: method, samples, tolerance and filter width. The first layer keeps the browser setting as before; a further layer carries its own values in the link only when they differ from the first layer. |
| *Quality* (resolution), *Post-processing*, *Technical* | Belong to the whole image: the resolution, the post-processing stack (it works on the blended result) and the renderer settings. |

## Blend modes

Normal, Multiply, Screen, Overlay, Darken, Lighten, Colour dodge, Colour burn, Hard light, Soft light, Difference, Exclusion, Add, Subtract, Hue, Saturation, Colour, Luminosity. The formulas are the usual ones from image editors (W3C compositing), computed on the finished sRGB colours of the layers.

## Masks

A layer's mask is evaluated from that layer's own orbit data: inside/outside, tonal range, iteration range, bands along the escape time, colour range, distance band, texture value. The mask multiplies the opacity per pixel. (Edge masks and the “state after a layer” mask belong to the post-processing layers.)

## The view

All layers share the view of the first layer unless a layer is *unlinked* (“Linked to the view” off in the mixer). An unlinked layer keeps its own centre, zoom and rotation; while it is selected, mouse and keyboard move only it, the other layers stay put. *Align view* puts it back onto the view of the first layer. The zoom text and the coordinates at the bottom always describe the selected layer.

The bar on the right has two groups: “Layer” (Motif, Colour, Textures, Palette, Quality, Blend) and “Image” (Post-processing, Technical). The stack header carries the *Move* switch: all layers together or only the selected one (“only this” detaches the layer from the shared view; “all” takes detached layers along by the same screen movement). Showing only one layer is S (solo) in its stack row; the selection takes a sole solo along.

## Fine alignment

An unlinked layer's card in the mixer carries a *Fine alignment to the ground* block: the zoom factor relative to the ground, the offset of its centre in pixels of the ground (x to the right, y up) and the rotation difference in degrees, each as a typed value with nudge buttons (×2, ÷2, =1; ±1 and ±0.1 pixel; ±1° and ±0.1°), plus *Snap to ratio* (⅛ … 8, including 3) and *Centre on the ground*. The values are relative, so zooming the whole picture with “Move: all” keeps the relation. *Align: show difference* shows the layer temporarily as difference with full opacity and a crosshair at the centre (matching areas turn black); the link and the mixer settings stay unchanged.

Fine gestures: Shift + wheel zooms by about 1 % per notch, Ctrl + Shift by about 0.1 %; Shift + drag moves a tenth of the mouse movement, Ctrl + Shift a hundredth (below one pixel, exact). Arrow keys with Shift move 1 pixel, with Alt 0.1 pixel, with both 10 pixels; plus and minus with Alt zoom 1 %, with Alt + Shift 0.1 %; square brackets rotate by 1°, with Shift by 0.1°. The link writes the zoom with four significant digits as before and with more only when a fine value needs them.

## Rendering

The selected layer renders as before, tile by tile, with its own anti-aliasing. When it is finished its colour is kept, and the other layers that are out of date render one after another (the status line names the layer). While that happens the composite shows the kept colours of the other layers, shifted and scaled to the current view where they moved. Anti-aliasing runs per layer with that layer's own settings; the composite blends the smoothed layers. The order is: first the base image (the iterations) of every layer, then the smoothing of every layer, the selected layer first, so the whole picture appears quickly and the slow smoothing comes last.

Exports (*Save image*) render every visible layer per tile and blend them like the screen does, including post-processing.

## The link

The first layer is written as before. Every further layer is a parameter set of its own in `l2`, `l3`, …, its mixing in `lm2`, … (`mode:opacity:visible:solo:linked:name`, followed by `samples:method:tolerance:max-samples:filter-width` when the layer's smoothing differs from the first layer), its mask in `lu2`, … and the selected layer in `la`. A linked layer carries no view of its own in its parameter set; an unlinked one does (`re`, `im`, `z`, `dr`). Up to six layers.
