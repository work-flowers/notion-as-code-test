/**
 * Dry-run validator: compiles a Notion as Code script to intents WITHOUT
 * submitting anything to Notion, then sanity-checks the resource graph.
 *
 * Usage (from the notion-sdk-js checkout):
 *   npx tsx ../scripts/compile-check.ts ../scripts/knoxx-rnd-sandbox.ts
 */
import { compileNotionAsCodeScriptToIntents } from "../notion-sdk-js/src/EXPERIMENTAL__notion-as-code/utils/compile"

async function main() {
  const scriptPath = process.argv[2]
  if (!scriptPath) {
    console.error("Usage: npx tsx compile-check.ts <script.ts>")
    process.exit(1)
  }

  const intents = await compileNotionAsCodeScriptToIntents({
    filePathToScript: scriptPath,
  })

  const counts: Record<string, number> = {}
  const resourceIds = new Set<string>()
  const duplicates: string[] = []

  for (const intent of intents) {
    counts[intent.type] = (counts[intent.type] ?? 0) + 1
    const id =
      intent.type === "view"
        ? intent.view.resourceId
        : "resourceId" in intent
          ? intent.resourceId
          : undefined
    if (id) {
      if (resourceIds.has(id)) duplicates.push(id)
      resourceIds.add(id)
    }
    // Property resourceIds must also be unique across the script
    if (intent.type === "database") {
      for (const ds of intent.dataSources) {
        for (const prop of ds.properties) {
          if (resourceIds.has(prop.resourceId)) duplicates.push(prop.resourceId)
          resourceIds.add(prop.resourceId)
        }
        if (resourceIds.has(ds.resourceId)) duplicates.push(ds.resourceId)
        resourceIds.add(ds.resourceId)
      }
    }
  }

  console.log("Intent counts:", JSON.stringify(counts, null, 2))
  console.log("Total unique resourceIds:", resourceIds.size)
  if (duplicates.length > 0) {
    console.error("DUPLICATE resourceIds:", duplicates)
    process.exit(1)
  }
  console.log("OK: script compiled and all resourceIds are unique.")
}

main().catch(error => {
  console.error("Compile check failed:", error.message ?? error)
  process.exit(1)
})
