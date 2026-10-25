import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import site from "./site.json" with { type: "json" };

const base = new URL(site.url).pathname.replace(/\/$/, "");
function localLinks() {
  return (tree) => {
    const walk = (node) => {
      if (
        typeof node.url === "string" &&
        node.url.startsWith("/") &&
        !node.url.startsWith("//")
      ) {
        node.url = `${base}${node.url}`;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

export default defineConfig({
  site: new URL(site.url).origin,
  base,
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: {
    processor: unified({ remarkPlugins: [localLinks] }),
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      langs: ["hlsl"],
    },
  },
});
