# Design System Document: The Cinematic Physicality

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Rental Archive"**

This design system moves beyond the flat, ephemeral nature of modern streaming. It is an intentional homage to the tactile, physical era of the 2000s DVD rental experience. We are not just building an interface; we are curating a digital vault. 

The aesthetic identity is defined by **Cinematic Physicality**. This means breaking the "template" look through high-contrast tonal layering, deep shadows that mimic physical shelves, and "DVD-menu" inspired navigation. We reject the sterile, rounded-rectangle era in favor of sharp, intentional edges, glossy plastic textures, and a "living room at midnight" atmosphere. Every interactive element should feel like it was pressed on a remote control, and every content container should feel like a tangible object you can pull off a shelf.

---

## 2. Colors: The Midnight Gallery
The palette is designed to disappear into the background, allowing the vibrant artwork of movie covers to take center stage.

### The Color Logic
- **Base (Darkness):** Use `surface` (#111317) as the infinite void. 
- **Accents (The Neon Sign):** Use `secondary_container` (Blockbuster Yellow - #ffdb3c) and `primary_container` (Netflix Red - #e50914) sparingly. These are "active" states, never backgrounds for long-form text.
- **The "No-Line" Rule:** Sectioning must never use 1px solid borders. Boundaries are defined by shifting from `surface` to `surface_container_low` (#1a1c20). For a "shelf" effect, use a vertical gradient from `surface_bright` to `surface` to create a 3D ledge.

### Surface Hierarchy & Nesting
To create "stacked" depth without lines:
1.  **Level 0 (Floor):** `surface` (#111317)
2.  **Level 1 (The Shelf/Row):** `surface_container_low` (#1a1c20)
3.  **Level 2 (The Case/Card):** `surface_container_highest` (#333539)

### The "Glass & Plastic" Rule
To achieve the 2000s DVD sheen, apply a linear gradient overlay to all movie cards: `rgba(255, 255, 255, 0.15)` at 0% to `rgba(255, 255, 255, 0)` at 50%, angled at 45 degrees. This creates the "plastic wrap" effect essential to the rental aesthetic.

---

## 3. Typography: Editorial Authority
The type system mimics the bold, functional layouts of DVD menus and back-of-box credits.

- **Display & Headlines (Epilogue):** This is our "Title" font. Use `display-lg` for movie titles. Its bold, slightly condensed nature should feel authoritative and cinematic. 
    *   *Styling Tip:* Use `on_primary_container` (Red) or `secondary_fixed` (Yellow) for headlines to mimic high-energy DVD menu headers.
- **Labels (Space Grotesk):** Our "Technical" font. Use `label-md` for metadata (Runtime, Year, Aspect Ratio). It provides a monospaced, "digital readout" feel reminiscent of a DVD player's front panel.
- **Body (Work Sans):** Our "Synopsis" font. Highly legible and neutral, used for the back-of-box movie descriptions.

---

## 4. Elevation & Depth: Tonal Layering
We do not use structural lines. We use light and shadow as if there is a single light source above the screen.

- **The Layering Principle:** Place `surface_container_lowest` (#0c0e12) behind your main grid to create a "recessed" shelf look.
- **Ambient Shadows:** For "Active" DVD cases, use a massive, diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8)`. The shadow should feel heavy, suggesting the physical weight of a box set.
- **The "Ghost Border" Fallback:** If you must define a boundary (e.g., a search bar), use `outline_variant` (#5e3f3b) at 15% opacity. It should be felt, not seen.
- **Glassmorphism:** Navigation overlays (like the DVD remote menu) should use `surface_container` with a `backdrop-filter: blur(12px)`. This suggests a translucent plastic overlay common in early 2000s UI.

---

## 5. Components

### The DVD Case (Card)
*   **Structure:** Vertical aspect ratio (2:3). 
*   **Style:** No borders. Use `surface_container_highest` (#333539) as the base. 
*   **Overlay:** A 2px "spine" highlight on the left edge using a lighter tint to simulate the plastic fold. 
*   **Logo:** Always include a small, low-opacity 'DVD Video' logo in the corner using `on_surface_variant`.

### Buttons (The "Remote Control" Style)
*   **Primary:** `primary_container` (#e50914) with `on_primary_container` text. Use `DEFAULT` (0.25rem) roundedness—never pills. 
*   **States:** On hover, the button should gain a "glow" (outer shadow) of its own color, mimicking a backlit button on a high-end DVD player.
*   **Interaction:** Use a slight `scale(0.98)` on click to simulate physical travel.

### The "Back-of-Box" Detail View
*   **Layout:** Intentionally asymmetrical. The left side features a "spine" aesthetic, while the right side mimics the chaotic, information-dense layout of a retail DVD back cover.
*   **Separation:** Use `vertical white space` (32px or 48px) instead of dividers to group "Cast," "Special Features," and "Technical Specs."

### Lists & Navigation
*   **Rule:** Forbid divider lines.
*   **Selection:** Instead of a highlight bar, a selected list item should shift to `secondary_container` (Yellow) with a small "Play" icon (triangle) appearing to the left.

---

## 6. Do's and Don'ts

### Do
- **Do** use "Extreme Tonal Shifts." A card should be significantly lighter than the background it sits on to create a sense of physical objecthood.
- **Do** lean into the "Blockbuster" yellow for calls to action; it provides a nostalgic "Rent Now" urgency.
- **Do** treat the "DVD Video" and "Region 1" logos as decorative UI elements to ground the experience in the 2000s.

### Don't
- **Don't** use 1px solid borders. It flattens the experience and breaks the cinematic immersion.
- **Don't** use large border-radii. Keep it to `sm` or `md` (0.125rem - 0.375rem). The 2000s were an era of hard plastics, not soft pebbles.
- **Don't** use "pure" white text. Always use `on_surface` (#e2e2e8) to avoid harsh digital "glare" and maintain the filmic quality.