import { SolidPlugin } from "@dschz/bun-plugin-solid"
import { watch } from "fs"
import { join } from "path"

const indexSourcePath = "./src/client/index.html"
const distDir = "./dist/client"
const distIndexPath = `${distDir}/index.html`

async function writeIndexHtml() {
  const indexFile = Bun.file(indexSourcePath)
  if (!(await indexFile.exists())) return
  const html = await indexFile.text()
  const updated = html.replace('src="./App.tsx"', 'src="./App.js"')
  await Bun.write(distIndexPath, updated)
}

async function buildTailwind() {
  const proc = Bun.spawn({
    cmd: [
      "bunx", "@tailwindcss/cli",
      "-i", "./src/client/index.css",
      "-o", `${distDir}/index.css`,
      Bun.env.NODE_ENV === "production" ? "--minify" : "",
    ].filter(Boolean),
    stdout: "inherit",
    stderr: "inherit",
  })
  await proc.exited
  return proc.exitCode === 0
}

async function build() {
  // Build Tailwind CSS first
  const tailwindSuccess = await buildTailwind()
  if (!tailwindSuccess) {
    console.error("Tailwind CSS build failed")
    return false
  }

  const result = await Bun.build({
    entrypoints: ["./src/client/App.tsx"],
    outdir: distDir,
    plugins: [SolidPlugin({ generate: "dom" })],
    target: "browser",
    minify: Bun.env.NODE_ENV === "production",
    sourcemap: "linked",
  })

  if (!result.success) {
    console.error("Build failed:")
    for (const log of result.logs) {
      console.error(log)
    }
    return false
  }

  await writeIndexHtml()

  console.log("Client built successfully")
  return true
}

// Initial build
await build()

// Watch mode
if (process.argv.includes("--watch")) {
  console.log("Watching for changes...")

  const srcDir = join(import.meta.dir, ".")
  let debounceTimer: Timer | null = null

  watch(srcDir, { recursive: true }, (event, filename) => {
    if (!filename || filename.includes("node_modules")) return
    if (!filename.endsWith(".tsx") && !filename.endsWith(".ts") && !filename.endsWith(".css")) return

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      console.log(`\nRebuilding due to change in ${filename}...`)
      await build()
    }, 100)
  })
}
