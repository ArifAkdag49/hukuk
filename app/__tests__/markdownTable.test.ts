import { tableData } from "../src/markdownTable";

const cell = (type: string, ...children: object[]) => ({ type, children });
const text = (content: string) => ({ type: "text", content });

test("tablo düğümünden başlık ve satırları düz metin olarak çıkarır", () => {
  const node = {
    type: "table",
    children: [
      cell("thead", cell("tr", cell("th", text("Ölçüt")), cell("th", text("Genel")), cell("th", text("Kesin")))),
      cell(
        "tbody",
        cell("tr", cell("td", text("Bağlama noktası")), cell("td", cell("strong", text("Yerleşim")), text(" yeri")), cell("td", text("Kanun"), { type: "softbreak" }, text("sayar"))),
        cell("tr", cell("td", text("Sözleşme")), cell("td", text("Yapılabilir")), cell("td", { type: "code_inline", content: "Yapılamaz" })),
      ),
    ],
  };
  expect(tableData(node)).toEqual({
    headers: ["Ölçüt", "Genel", "Kesin"],
    rows: [
      ["Bağlama noktası", "Yerleşim yeri", "Kanun sayar"],
      ["Sözleşme", "Yapılabilir", "Yapılamaz"],
    ],
  });
});
