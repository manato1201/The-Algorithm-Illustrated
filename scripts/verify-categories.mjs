// 全content/algorithms/*.mdのfrontmatter category/subcategoryが
// src/lib/algorithm-categories.tsのCATEGORY_TAXONOMYに存在する組み合わせかを検証する。
// CATEGORY_TAXONOMYはコメントで「追記だけで完結する」設計と明記されているため、
// frontmatter側の表記ゆれ(全角/半角・中点「・」など)を機械的に検出する常設スクリプト。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORY_TAXONOMY, CATEGORY_GROUPS } from "../src/lib/algorithm-categories.ts";

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

// 大分類(CATEGORY_GROUPS): 全カテゴリがちょうど 1 つの大分類に入り、存在しないカテゴリを含まない。
const taxonomyCategories = CATEGORY_TAXONOMY.map((c) => c.category);
const groupOf = new Map();
for (const group of CATEGORY_GROUPS) {
  if (group.categories.length === 0) {
    console.error(`[NG] 大分類「${group.label}」にカテゴリがない`);
    errors++;
  }
  for (const category of group.categories) {
    if (!taxonomyCategories.includes(category)) {
      console.error(`[NG] 大分類「${group.label}」の「${category}」は CATEGORY_TAXONOMY にない`);
      errors++;
    }
    if (groupOf.has(category)) {
      console.error(`[NG] 「${category}」が大分類「${groupOf.get(category)}」と「${group.label}」の両方に入っている`);
      errors++;
    }
    groupOf.set(category, group.label);
  }
}
for (const category of taxonomyCategories) {
  if (!groupOf.has(category)) {
    console.error(`[NG] 「${category}」がどの大分類にも入っていない(CATEGORY_GROUPS に追記する)`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`${errors}件の不一致(frontmatter と CATEGORY_TAXONOMY、または CATEGORY_GROUPS)`);
  process.exit(1);
}

console.log(
  `OK: 全${files.length}件のfrontmatterがCATEGORY_TAXONOMYと一致、全${taxonomyCategories.length}カテゴリが${CATEGORY_GROUPS.length}つの大分類に1つずつ属する`,
);
