import minimist from "minimist";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import esbuild from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const args = minimist(process.argv.slice(2));
const target = args._[0];
const format = args.f || "umd";

const entry = resolve(__dirname, `../packages/${target}/src/index.js`);
const pkg = require(`../packages/${target}/package.json`);

esbuild
  .context({
    entryPoints: [entry],
    outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`),
    bundle: true,
    platform: "browser",
    sourcemap: true,
    format,
    globalName: pkg.buildOptions?.name,
  })
  .then((ctx) => {
    console.log(`Build ${target} success!`);
    return ctx.watch();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
