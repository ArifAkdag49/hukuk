/** react-native-markdown-display tablo düğümünden başlıklar ve satırlar (hücreler düz metin). */
type MdNode = { type?: string; content?: string; children?: MdNode[] };

function nodeText(n: MdNode | undefined): string {
  if (!n) return "";
  if (n.type === "softbreak" || n.type === "hardbreak") return " ";
  if (n.children?.length) return n.children.map(nodeText).join("");
  return n.content ?? "";
}

function rowsOf(section: MdNode | undefined): string[][] {
  return (section?.children ?? []).map((tr) => (tr.children ?? []).map((cell) => nodeText(cell).trim()));
}

export function tableData(node: MdNode): { headers: string[]; rows: string[][] } {
  const head = node.children?.find((c) => c.type === "thead");
  const body = node.children?.find((c) => c.type === "tbody");
  return { headers: rowsOf(head)[0] ?? [], rows: rowsOf(body) };
}
