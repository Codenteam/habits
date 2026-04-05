import typescript from "@rollup/plugin-typescript";

export default {
  input: "guest-js/index.ts",
  output: [
    {
      file: "dist-js/index.js",
      format: "esm",
    },
    {
      file: "dist-js/index.cjs",
      format: "cjs",
    },
  ],
  plugins: [
    typescript({
      declaration: true,
      declarationDir: "dist-js",
    }),
  ],
  external: ["@tauri-apps/api/core"],
};
