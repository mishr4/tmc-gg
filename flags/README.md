# RBSC Custom Flags

Drop your Figma-exported flag SVGs here. The RBSC page (`/rbsc`) loads each
country's flag from `/flags/<slug>.svg` and automatically falls back to an
emoji flag if the file is missing.

## Naming

Use the **lowercase country name with hyphens** for spaces:

| Country        | Filename                |
|----------------|-------------------------|
| Netherlands    | `netherlands.svg`       |
| Switzerland    | `switzerland.svg`       |
| Sweden         | `sweden.svg`            |
| Estonia        | `estonia.svg`           |
| France         | `france.svg`            |
| Italy          | `italy.svg`             |
| United Kingdom | `united-kingdom.svg`    |

The name must match the **country name** you enter in the admin portal
(case/spacing don't matter — they're normalized to the slug above).

## Figma export settings

1. Select the flag frame/component
2. Export as **SVG**
3. Recommended: enable "Include id attribute" off, "Outline text" on
4. Save into this `flags/` folder with the matching filename

The hero flag uses the **featured country's** same SVG, scaled up — no separate
file needed.
