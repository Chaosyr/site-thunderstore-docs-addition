import { docs } from "fumadocs-mdx:collections/server";
import { type InferPageType, loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { i18n } from "@/lib/i18n";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
  i18n,
});

// export function getPageImage(page: InferPageType<typeof source>) {
//   return {
//     segments: page.slugs,
//     url: `/og/docs/${page.locale}/${page.slugs.join("/")}`,
//   };
// }

function getEnglishPages() {
  return source
    .getPages()
    .filter((page) => page.locale === "en")
    .sort((a, b) => a.slugs.join("/").localeCompare(b.slugs.join("/")));
}

export function getLLMIndex(baseUrl: string) {
  const pages = getEnglishPages();

  type Node = {
    page?: (typeof pages)[number];
    children: Map<string, Node>;
  };

  const root: Node = { children: new Map() };

  for (const page of pages) {
    let current = root;

    for (const slug of page.slugs) {
      if (!current.children.has(slug)) {
        current.children.set(slug, { children: new Map() });
      }

      current = current.children.get(slug)!;
    }

    current.page = page;
  }

  const lines: string[] = [];

  function walk(node: Node, depth: number, slug?: string) {
    if (node.page) {
      const indent = "  ".repeat(depth);
      const desc = node.page.data.description
        ? `: ${node.page.data.description}`
        : "";

      lines.push(
        `${indent}- [${node.page.data.title}](${baseUrl}${node.page.url})${desc}`,
      );
    } else if (slug && node.children.size > 0) {
      const indent = "  ".repeat(depth);
      const label = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`${indent}- ${label}`);
    }

    const hasEntry = node.page || (slug && node.children.size > 0);

    for (const [key, child] of node.children) {
      walk(child, hasEntry ? depth + 1 : depth, key);
    }
  }

  walk(root, 0);
  return lines;
}

export async function getLLMFullText(baseUrl: string) {
  const pages = getEnglishPages().map(async (page) => {
    const processed = await page.data.getText("processed");
    return `--- ${page.data.title}\nSource: ${baseUrl}${page.url}\n${processed}`;
  });
  return Promise.all(pages);
}
