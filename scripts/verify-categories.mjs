// 全content/algorithms/*.mdのfrontmatter category/subcategoryが
// src/lib/algorithm-categories.tsのCATEGORY_TAXONOMYに存在する組み合わせかを検証する。
// CATEGORY_TAXONOMYはコメントで「追記だけで完結する」設計と明記されているため、
// frontmatter側の表記ゆれ(全角/半角・中点「・」など)を機械的に検出する常設スクリプト。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORY_TAXONOMY } from "../src/lib/algorithm-categories.ts";

const CONTENT_DIR = path.join(process.cwd(), "content", "algorithms");

const validPairs = new Set(
  CATEGORY_TAXONOMY.flatMap((c) =>
    c.subcategories.map((sub) => `${c.category}::${sub}`),
  ),
);

let errors = 0;
const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));

for (const file of files) {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
  const { data } = matter(raw);
  const pair = `${data.category}::${data.subcategory}`;
  if (!validPairs.has(pair)) {
    console.error(
      `[NG] ${file}: "${data.category} / ${data.subcategory}" not in CATEGORY_TAXONOMY`,
    );
    errors++;
  }
}

if (errors > 0) {
  console.error(`${errors}件の frontmatter が CATEGORY_TAXONOMY と不一致`);
  process.exit(1);
}

console.log(`OK: 全${files.length}件のfrontmatterがCATEGORY_TAXONOMYと一致`);
