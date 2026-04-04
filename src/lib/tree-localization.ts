import FallbackLanguage from "@/../messages/en.json";
import * as fs from "fs";
import { Node, Root } from "fumadocs-core/page-tree";
import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import * as path from "path";

export function localizePageTree(
  tree: DocsLayoutProps["tree"],
  lang: string,
): DocsLayoutProps["tree"] {
  let translations = FallbackLanguage;

  if (lang !== "en") {
    const langFilePath = path.join(process.cwd(), "messages", `${lang}.json`);
    if (fs.existsSync(langFilePath)) {
      translations = JSON.parse(fs.readFileSync(langFilePath, "utf-8"));
    } else {
      console.warn(
        `Translation file for language '${lang}' not found. Falling back to English.`,
      );
    }
  }

  function getTranslation(key: string): string {
    const parts = key.split(".");
    let value = translations;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, any>)[part];
      } else {
        value = FallbackLanguage;
        for (const fallbackPart of parts) {
          if (value && typeof value === "object" && fallbackPart in value) {
            value = (value as Record<string, any>)[fallbackPart];
          } else {
            return key;
          }
        }
        break;
      }
    }

    return typeof value === "string" ? value : key;
  }

  function translateString(text: string): string {
    if (!text || typeof text !== "string") return text;

    const match = text.match(/^\{(.+)\}$/);
    if (match) {
      return getTranslation(match[1]);
    }
    return text;
  }

  function traverseNode<TraversableNode extends Node | Node[] | Root>(
    node: TraversableNode,
  ): TraversableNode {
    if (!node) return node;

    function traverseChildren(children: Node[]) {
      for (let i = 0; i < children.length; i++) {
        traverseNode(children[i]);
      }
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        traverseNode(node[i]);
      }
      return node;
    }

    if ("name" in node && typeof node.name === "string")
      node.name = translateString(node.name);

    if ("title" in node && typeof node.title === "string")
      node.title = translateString(node.title);

    if ("index" in node && node.index && typeof node.index === "object")
      traverseNode(node.index);

    if ("children" in node && Array.isArray(node.children))
      traverseChildren(node.children);

    return node;
  }

  return traverseNode(tree);
}
