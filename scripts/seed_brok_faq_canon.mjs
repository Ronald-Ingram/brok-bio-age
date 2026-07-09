import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "../web/node_modules/@supabase/supabase-js/dist/module/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "web/.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const { BROK_FAQ_ITEMS, canonTagsForFaq, formatFaqForCanon } = await import(
  "../web/lib/brokFaqCanon.ts"
);

let inserted = 0;
let skipped = 0;

for (const item of BROK_FAQ_ITEMS) {
  const tags = canonTagsForFaq(item);
  const content = formatFaqForCanon(item);
  const { data: existing } = await supabase
    .from("core_knowledge")
    .select("tags")
    .eq("tags", tags)
    .maybeSingle();

  if (existing) {
    await supabase.from("core_knowledge").update({ content }).eq("tags", tags);
    skipped += 1;
  } else {
    const { error } = await supabase.from("core_knowledge").insert({ tags, content });
    if (error) throw error;
    inserted += 1;
  }
}

console.log(`FAQ canon: ${inserted} inserted, ${skipped} updated (${BROK_FAQ_ITEMS.length} total)`);