// ─────────────────────────────────────────────────────────────────
// Типографика: неразрывные пробелы (требование №6).
// Чтобы предлоги/союзы/частицы не «висели» в конце строки на любом
// экране, после коротких слов и перед короткими частицами ставится
// неразрывный пробел ( ).
// ─────────────────────────────────────────────────────────────────

const NBSP = " ";

// Частицы, которые «прилипают» к предыдущему слову (ставим NBSP перед ними).
const PARTICLES_AFTER = ["бы", "б", "же", "ж", "ли", "ль", "ли", "то"];

/**
 * Обрабатывает простую строку текста, расставляя неразрывные пробелы.
 * Правила (для русского и английского):
 *  1. Короткое слово (1–3 буквы: предлог/союз/частица) + NBSP + след. слово.
 *  2. Слово + NBSP + частица (бы, же, ли…).
 *  3. Число + NBSP + следующее слово (единица измерения и т.п.).
 *  4. NBSP перед длинным тире «—».
 */
export function applyNbsp(input: string): string {
  if (!input) return input;
  let text = input;

  // 1. Короткие слова (до 3 букв) в начале строки или после пробела → склеиваем со следующим словом.
  //    \p запрещён в части окружений — используем явные диапазоны.
  const shortWord = "[a-zA-Zа-яёА-ЯЁ]{1,3}";
  text = text.replace(
    new RegExp(`(^|[\\s(«"'])(${shortWord})\\s+`, "g"),
    (_m, pre, word) => `${pre}${word}${NBSP}`,
  );

  // 2. Частицы прилипают к предыдущему слову.
  for (const p of PARTICLES_AFTER) {
    text = text.replace(
      new RegExp(`\\s+(${p})(?=[\\s.,!?;:)»"']|$)`, "gi"),
      `${NBSP}$1`,
    );
  }

  // 3. Число + пробел + слово → неразрывный (например, «10 минут»).
  text = text.replace(/(\d)\s+([a-zA-Zа-яёА-ЯЁ])/g, `$1${NBSP}$2`);

  // 4. Неразрывный пробел перед тире.
  text = text.replace(/\s+(—|–)/g, `${NBSP}$1`);

  return text;
}

// Тип узла TipTap/ProseMirror для рекурсивной обработки.
type Node = {
  type?: string;
  text?: string;
  content?: Node[];
  marks?: unknown[];
  [k: string]: unknown;
};

// Узлы, внутри которых типографику применять не нужно.
const SKIP_TYPES = new Set(["codeBlock", "code"]);

/**
 * Рекурсивно проходит по документу TipTap (ProseMirror JSON) и расставляет
 * неразрывные пробелы во всех текстовых узлах, кроме кода.
 */
export function applyNbspToDoc<T extends Node>(doc: T): T {
  function walk(node: Node, insideCode: boolean): Node {
    const skip = insideCode || (node.type ? SKIP_TYPES.has(node.type) : false);
    const next: Node = { ...node };

    if (typeof next.text === "string" && !skip) {
      const isInlineCode = (next.marks ?? []).some(
        (m) => (m as { type?: string }).type === "code",
      );
      if (!isInlineCode) next.text = applyNbsp(next.text);
    }

    if (Array.isArray(next.content)) {
      next.content = next.content.map((c) => walk(c, skip));
    }
    return next;
  }

  return walk(doc, false) as T;
}
