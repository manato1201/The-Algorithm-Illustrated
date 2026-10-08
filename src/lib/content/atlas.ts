import fs from "node:fs";
import path from "node:path";
import { getAllAlgorithmsMeta } from "@/lib/content/algorithms";
import type { AtlasEntry } from "@/lib/atlas-format";

const ATLAS_FILE = path.join(
  process.cwd(),
  "content",
  "atlas",
  "milestones.json",
);

type RawEntry = {
  id: string;
  year: number;
  approximate?: boolean;
  people: string;
  purpose: string;
  source: string;
};

/**
 * 年表Atlasのデータを読み込む(IMPROVEMENT_PLAN_2026-10 A3)。
 * 存在しない記事idや、出典(source)・目的(purpose)が空の項目はビルド時に例外にして、
 * 「年表データに出典がある」「追加項目に生まれた目的の説明が入っている」を機械的に保証する。
 */
export function getAtlasEntries(): AtlasEntry[] {
  const raw = JSON.parse(fs.readFileSync(ATLAS_FILE, "utf8")) as {
    entries: RawEntry[];
  };
  const metaById = new Map(
    getAllAlgorithmsMeta().map((meta) => [meta.id, meta]),
  );

  const entries = raw.entries.map((entry): AtlasEntry => {
    const meta = metaById.get(entry.id);
    if (!meta)
      throw new Error(
        `年表: 記事 "${entry.id}" が content/algorithms に存在しません`,
      );
    if (!entry.source?.trim())
      throw new Error(`年表: "${entry.id}" に出典(source)がありません`);
    if (!entry.purpose?.trim())
      throw new Error(`年表: "${entry.id}" に目的(purpose)がありません`);
    if (!Number.isInteger(entry.year))
      throw new Error(`年表: "${entry.id}" の year が整数ではありません`);
    return {
      id: entry.id,
      name: meta.name,
      category: meta.category,
      subcategory: meta.subcategory,
      year: entry.year,
      approximate: entry.approximate ?? false,
      people: entry.people,
      purpose: entry.purpose,
      source: entry.source,
    };
  });

  return entries.sort(
    (a, b) => a.year - b.year || a.name.localeCompare(b.name, "ja"),
  );
}
