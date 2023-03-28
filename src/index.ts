import type { PluginOption, ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import kleur from "kleur";
import ansiRegex from "ansi-regex";

type Options = {
  /**
   * console log in browser
   * @default true
   * */
  log?: boolean;
  /**
   * output directory
   * @default "./output"
   * */
  outDir?: string;
};

type ExportData = {
  image: string;
  filename: string;
  format: string;
};

const defaultOptions = {
  log: true,
  outDir: "./output",
};

const { gray, green, yellow } = kleur;

const prefix = () => {
  return `${gray(new Date().toLocaleTimeString())} ${green(`[ssam-export]`)}`;
};

const removeAnsiEscapeCodes = (str: string) => {
  return str.replace(ansiRegex(), "");
};

export const ssamExport = (opts: Options = {}): PluginOption => ({
  name: "vite-plugin-ssam-export",
  apply: "serve", // plugin only works for development
  configureServer(server: ViteDevServer) {
    const { log, outDir } = Object.assign(defaultOptions, opts);

    server.ws.on("ssam:export", (data: ExportData, client) => {
      // if outDir not exist, create one
      if (!fs.existsSync(outDir)) {
        fs.promises
          .mkdir(outDir)
          .then(() => {
            const msg = `${prefix()} created a new directory at ${path.resolve(
              outDir
            )}`;
            console.log(msg);
          })
          .catch((err) => {
            console.error(`${prefix()} ${yellow(`${err}`)}`);
          });
      }

      const { image, filename, format } = data;

      if (!["jpeg", "jpg", "png", "webp"].includes(format)) {
        const msg = `${prefix()} ${yellow(`${format} is not supported`)}`;
        log && client.send("ssam:warn", { msg: removeAnsiEscapeCodes(msg) });
        console.error(msg);
        return;
      }

      const buffer = Buffer.from(image.split(",")[1], "base64");

      const filePath = path.join(outDir, `${filename}.${format}`);

      fs.promises
        .writeFile(filePath, buffer)
        .then(() => {
          const msg = `${prefix()} ${filePath} exported`;
          log && client.send("ssam:log", { msg: removeAnsiEscapeCodes(msg) });
          console.log(msg);
        })
        .catch((err) => {
          const msg = `${prefix()} ${yellow(err)}`;
          log && client.send("ssam:warn", { msg: removeAnsiEscapeCodes(msg) });
          console.error(msg);
        });
    });
  },
});
