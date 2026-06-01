// ─────────────────────────────────────────────────────────────────
// Конвертация документа TipTap (ProseMirror JSON) в Markdown / plain text.
// Используется для экспорта (требование №2) и для построения content_text,
// по которому работает поиск.
// ─────────────────────────────────────────────────────────────────

import type { JSONContent } from "./types";

type Mark = { type: string; attrs?: Record<string, unknown> };

// Применяет inline-разметку (жирный, курсив, ссылка, код…) к тексту.
function applyMarks(text: string, marks: Mark[] = []): string {
  let out = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        out = `**${out}**`;
        break;
      case "italic":
        out = `*${out}*`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "strike":
        out = `~~${out}~~`;
        break;
      case "code":
        out = `\`${out}\``;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "";
        out = `[${out}](${href})`;
        break;
      }
      default:
        break;
    }
  }
  return out;
}

function inlineToMarkdown(nodes: JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return applyMarks(node.text ?? "", (node.marks as Mark[]) ?? []);
      }
      if (node.type === "hardBreak") return "\n";
      if (node.type === "image") {
        const alt = (node.attrs?.alt as string) ?? "image";
        const src = (node.attrs?.src as string) ?? "";
        return `![${alt}](${src})`;
      }
      return "";
    })
    .join("");
}

function listToMarkdown(node: JSONContent, ordered: boolean, depth: number): string {
  const indent = "  ".repeat(depth);
  return (node.content ?? [])
    .map((item, i) => {
      const prefix = ordered ? `${i + 1}. ` : "- ";
      const inner = (item.content ?? [])
        .map((child) => blockToMarkdown(child, depth + 1))
        .join("\n");
      // Первую строку — с маркером, вложенные — с отступом.
      const lines = inner.split("\n");
      const first = `${indent}${prefix}${lines[0] ?? ""}`;
      const rest = lines.slice(1).map((l) => (l ? `${indent}  ${l}` : l));
      return [first, ...rest].join("\n");
    })
    .join("\n");
}

function tableToMarkdown(node: JSONContent): string {
  const rows = node.content ?? [];
  const lines: string[] = [];
  rows.forEach((row, rowIndex) => {
    const cells = (row.content ?? []).map((cell) =>
      (cell.content ?? []).map((c) => inlineToMarkdown(c.content)).join(" ").trim(),
    );
    lines.push(`| ${cells.join(" | ")} |`);
    if (rowIndex === 0) {
      lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
    }
  });
  return lines.join("\n");
}

function blockToMarkdown(node: JSONContent, depth = 0): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `${"#".repeat(level)} ${inlineToMarkdown(node.content)}`;
    }
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "bulletList":
      return listToMarkdown(node, false, depth);
    case "orderedList":
      return listToMarkdown(node, true, depth);
    case "taskList":
      return (node.content ?? [])
        .map((item) => {
          const checked = item.attrs?.checked ? "x" : " ";
          const inner = (item.content ?? [])
            .map((c) => inlineToMarkdown(c.content))
            .join(" ");
          return `- [${checked}] ${inner}`;
        })
        .join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((c) => `> ${blockToMarkdown(c, depth)}`)
        .join("\n");
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = (node.content ?? []).map((c) => c.text ?? "").join("");
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "table":
      return tableToMarkdown(node);
    case "image": {
      const alt = (node.attrs?.alt as string) ?? "image";
      const src = (node.attrs?.src as string) ?? "";
      return `![${alt}](${src})`;
    }
    default:
      if (node.content) return inlineToMarkdown(node.content);
      return "";
  }
}

/** Документ TipTap → Markdown. */
export function docToMarkdown(doc: JSONContent, title?: string): string {
  const body = (doc.content ?? [])
    .map((node) => blockToMarkdown(node))
    .filter((s) => s !== "")
    .join("\n\n");
  return title ? `# ${title}\n\n${body}` : body;
}

/** Документ TipTap → чистый текст (для .txt и поиска). */
export function docToPlainText(doc: JSONContent): string {
  function walk(node: JSONContent): string {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    const inner = (node.content ?? []).map(walk).join(
      node.type === "paragraph" || node.type === "heading" ? "" : " ",
    );
    const blocky = [
      "paragraph",
      "heading",
      "listItem",
      "taskItem",
      "blockquote",
      "codeBlock",
      "tableRow",
    ];
    return blocky.includes(node.type ?? "") ? inner + "\n" : inner;
  }
  return walk(doc).replace(/\n{3,}/g, "\n\n").trim();
}

/** Триггерит скачивание файла в браузере. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Делает имя файла безопасным.
export function safeFilename(name: string): string {
  return (name || "note").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 80);
}
