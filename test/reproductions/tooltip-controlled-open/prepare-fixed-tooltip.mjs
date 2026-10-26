import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const directory = dirname(require.resolve("@mui/material/Tooltip"));
const original = await readFile(join(directory, "Tooltip.mjs"), "utf8");
const replacements = [
  [
    "  const handleOpen = event => {",
    `  const openingRequested = React.useRef(false);
  React.useEffect(() => {
    if (open) openingRequested.current = false;
  }, [open]);
  const handleOpen = event => {
    openingRequested.current = !open;`,
  ],
  [
    "    if (onClose && open) {\n      onClose(event);\n    }",
    `    const shouldNotifyClose = open || openingRequested.current;
    openingRequested.current = false;
    if (onClose && shouldNotifyClose) {
      onClose(event);
    }`,
  ],
];
let fixed = original;
for (const [before, after] of replacements) {
  if (fixed.split(before).length !== 2) {
    throw new Error(
      "Unexpected upstream source. Review the patch before using another MUI version.",
    );
  }
  fixed = fixed.replace(before, after);
}
// Preserve the official file and all its dependencies. Only the sibling copy is patched.
await writeFile(join(directory, "Tooltip.repro-fixed.mjs"), fixed);
console.log(
  "Created a patched sibling copy; official Tooltip.mjs is unchanged.",
);
