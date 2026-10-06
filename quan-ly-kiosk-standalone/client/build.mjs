// Standalone client bundle (no platform SDK).
const result = await Bun.build({
  entrypoints: ["./client/src/main.tsx"],
  outdir: "./client/dist/assets",
  target: "browser",
  format: "esm",
  minify: true,
  splitting: true,
  naming: "main.[ext]",
  define: { "process.env.NODE_ENV": '"production"' },
});

if (!result.success) {
  console.error("Client build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Copy the HTML shell next to the bundle.
await Bun.write("./client/dist/index.html", Bun.file("./client/index.html"));
console.log("Client bundle written to ./client/dist/assets");
