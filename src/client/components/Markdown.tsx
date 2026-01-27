/* @jsxImportSource solid-js */
import { createMemo } from "solid-js"
import { marked } from "marked"

marked.setOptions({
  breaks: true,
  gfm: true,
})

export function Markdown(props: { content: string }) {
  const html = createMemo(() => {
    try {
      return marked.parse(props.content) as string
    } catch {
      return props.content
    }
  })

  return (
    <div
      class="text-[0.9rem] leading-relaxed text-fg
        [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-5 [&_h1]:mb-3 [&_h1]:tracking-tight
        [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:tracking-tight
        [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-2
        [&_h4]:text-base [&_h4]:font-medium [&_h4]:mt-2 [&_h4]:mb-1
        [&_p]:my-2.5 [&_p]:leading-7
        [&_code]:font-mono [&_code]:text-[0.8rem] [&_code]:bg-surface-emphasis [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md
        [&_pre]:bg-surface-emphasis [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-4
        [&_pre_code]:bg-transparent [&_pre_code]:p-0
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5
        [&_li]:my-1 [&_li]:leading-7
        [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:brightness-110
        [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-fg-muted
        [&_hr]:border-border [&_hr]:my-6
        [&_table]:w-full [&_table]:my-4
        [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-surface-muted [&_th]:font-medium [&_th]:text-left
        [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2"
      innerHTML={html()}
    />
  )
}
