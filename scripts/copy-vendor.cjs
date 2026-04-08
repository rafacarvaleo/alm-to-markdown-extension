"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const vendorDir = path.join(root, "vendor");

fs.mkdirSync(vendorDir, { recursive: true });

fs.copyFileSync(
  path.join(root, "node_modules/turndown/lib/turndown.browser.es.js"),
  path.join(vendorDir, "turndown.browser.es.js"),
);
fs.copyFileSync(
  path.join(
    root,
    "node_modules/turndown-plugin-gfm/lib/turndown-plugin-gfm.browser.es.js",
  ),
  path.join(vendorDir, "turndown-plugin-gfm.browser.es.js"),
);

console.log("Vendor files updated in vendor/");
