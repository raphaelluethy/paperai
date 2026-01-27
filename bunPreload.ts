import { SolidPlugin } from "@dschz/bun-plugin-solid"

await Bun.plugin(
  SolidPlugin({
    generate: "dom",
  })
)
