process.env.NODE_ENV = "production";
process.env.BRAIN_REQUIRE_TEAM = "true";

import("./server/index.mjs").catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
