import type { ComparisonTable, Course, Flashcard, KbExport, Question, Topic, TopicArticle, Unit } from "../types";

/**
 * Geliştirme verisi: GET /kb/export şemasına birebir uyar.
 * EXPO_PUBLIC_USE_FIXTURE=1 iken sunucu yerine bu kullanılır (bkz. src/dev/fakeApi.ts).
 *
 * Madde metinleri 6098 sayılı TBK ve 5237 sayılı TCK'dan alınmıştır; yine de gerçek veri
 * sunucudaki doğrulama hattından gelir. Karar kayıtları ÖRNEKTİR (künye uydurulmaz):
 * "verified: false" ve "örnek kayıt" etiketiyle gelirler.
 */

const TBK_URL = "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6098&MevzuatTur=1&MevzuatTertip=5";
const TCK_URL = "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5237&MevzuatTur=1&MevzuatTertip=5";

const tbk = (article_no: string, official_text: string): TopicArticle => ({
  law_name: "Türk Borçlar Kanunu",
  law_no: "6098",
  article_no,
  official_text,
  source_url: TBK_URL,
  verified: true,
});
const tck = (article_no: string, official_text: string): TopicArticle => ({
  law_name: "Türk Ceza Kanunu",
  law_no: "5237",
  article_no,
  official_text,
  source_url: TCK_URL,
  verified: true,
});

const sampleCase = (summary_md: string) => ({
  court: "Yargıtay (örnek kayıt)",
  chamber: null,
  esas_no: null,
  karar_no: null,
  decision_date: null,
  summary_md,
  source_url: "https://karararama.yargitay.gov.tr",
  verified: false,
});

export const courses: Course[] = [
  { id: "HUK2011", code: "HUK2011", name: "Borçlar Hukuku Genel Hükümler", year: 2, sort_order: 1, is_active: true },
  { id: "HUK2013", code: "HUK2013", name: "Ceza Hukuku Genel Hükümler", year: 2, sort_order: 2, is_active: true },
];

export const units: Unit[] = [
  { id: "HUK2011-u01", course_id: "HUK2011", title: "Sözleşmenin kuruluşu", sort_order: 1 },
  { id: "HUK2011-u02", course_id: "HUK2011", title: "Sözleşmenin geçersizliği", sort_order: 2 },
  { id: "HUK2013-u01", course_id: "HUK2013", title: "Suçun unsurları", sort_order: 1 },
  { id: "HUK2013-u02", course_id: "HUK2013", title: "Suçun özel görünüş biçimleri", sort_order: 2 },
];

const GEN = "2026-10-15T21:00:00.000Z";

export const topics: Topic[] = [
  // ------------------------------------------------------------------ BORÇLAR GENEL
  {
    id: "HUK2011-sozlesmenin-kurulmasi",
    unit_id: "HUK2011-u01",
    course_id: "HUK2011",
    title: "Sözleşmenin kurulması: öneri ve kabul",
    sort_order: 1,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Sözleşme, tarafların **karşılıklı ve birbirine uygun** irade açıklamalarıyla kurulur (TBK m. 1). Önce yapılan açıklamaya **öneri (icap)**, ona verilen uygun cevaba **kabul** denir.

- Öneri, sözleşmenin **esaslı noktalarını** içermeli ve bağlanma iradesi taşımalıdır.
- Süreli öneride öneren, süre sonuna kadar bağlıdır (m. 3).
- Hazırlar arasında süresiz öneri **hemen** kabul edilmelidir (m. 4).
- Hazır olmayanlar arasında öneren, usulüne uygun bir cevabın gelmesi beklenebilecek ana kadar bağlıdır (m. 5).
- Fiyat listesi göndermek öneri değildir; fiyatıyla sergilenen mal kural olarak öneridir (m. 8).`,
    content_md: `## İrade açıklaması

Sözleşme iki taraflı bir hukuki işlemdir. Kurulması için en az iki kişinin, **karşılıklı** ve **birbirine uygun** irade açıklaması gerekir. İrade açıklaması **açık** (söz, yazı) veya **örtülü** (davranıştan çıkarılan) olabilir (TBK m. 1/2).

> Sessizlik kural olarak kabul sayılmaz. İstisna: işin özelliği veya durumun gereği açık kabul beklenmiyorsa, öneri makul sürede reddedilmedikçe sözleşme kurulmuş sayılır (TBK m. 6).

## Öneri (icap)

Öneri, kabul edildiğinde sözleşmeyi kuracak kadar **belirli** olmalıdır. Bunun için sözleşmenin **esaslı noktalarını** içermesi gerekir. Esaslı noktalar ikiye ayrılır:

1. **Objektif esaslı noktalar:** Sözleşme tipinin olmazsa olmazları. Satışta satılan ve bedel gibi.
2. **Sübjektif esaslı noktalar:** Kanunen ikinci derecede olduğu hâlde taraflardan birinin, sözleşmenin şartı olarak açıkça öne sürdüğü noktalar.

Esaslı noktalarda uyuşulduysa, ikinci derecedeki noktalar konuşulmamış olsa bile sözleşme kurulur; bunlar üzerinde anlaşılamazsa hâkim işin özelliğine göre karar verir (TBK m. 2).

## Önerenin bağlılık süresi

| Durum | Bağlılık |
|---|---|
| Süreli öneri | Sürenin sonuna kadar (m. 3) |
| Hazırlar arasında süresiz | Hemen kabul edilmezse biter (m. 4) |
| Hazır olmayanlar arasında süresiz | Usulüne uygun cevabın ulaşması beklenebilecek ana kadar (m. 5) |

Telefon ve bilgisayar gibi araçlarla **doğrudan** yapılan öneriler hazırlar arasında sayılır (m. 4/2).

## Kabul

Kabul, öneriye **uygun** olmalıdır. Öneriyi değiştiren veya genişleten bir cevap kabul değil, **yeni bir öneridir**. Geç ulaşan kabulde, öneren bağlı olmak istemiyorsa bunu derhâl bildirmelidir (m. 5/3).

## İlan ve sergileme

Ücret tarifeleri ve fiyat listelerinin gönderilmesi öneri sayılmaz; bunlar **öneriye davettir**. Buna karşılık ticari bir malın fiyatı gösterilerek sergilenmesi **kural olarak öneridir** (m. 8).

## Sözleşmenin kurulduğu an

Hazır olmayanlar arasında kurulan sözleşme, kabulün **gönderildiği** andan itibaren hüküm doğurur (m. 11). Sözleşmenin kurulma anı ile hüküm doğurma anı birbirinden ayrılır.`,
    critical_md: `- **Sınavda en çok sorulan:** fiyatıyla sergilenen mal öneridir, fiyat listesi gönderimi öneriye davettir (m. 8).
- Öneriyi **değiştiren** cevap kabul değildir, yeni öneridir.
- Hazırlar arası süresiz öneride "hemen" kabul şartı; telefon da hazırlar arası sayılır.
- Sübjektif esaslı nokta, açıkça şart koşulmuş olmalıdır; içten düşünülmüş olması yetmez.
- Sessizlik ancak m. 6'daki istisnai hâlde kabul sayılır.`,
    doctrine_md: `Baskın görüşe göre öneri, **sınırlı sayıda** mal için yapılmış olsa bile bağlayıcıdır; stok tükendiğinde sonraki kabul edenlere karşı ifa imkânsızlığı hükümleri gündeme gelir. Bir görüşe göre ise internet sitelerindeki ürün sayfaları, satıcının stok kontrolü yapma imkânı saklı tutulduğu için öneriye davet niteliğindedir.`,
    glossary: [
      { term: "Öneri (icap)", definition: "Kabul edildiğinde sözleşmeyi kuracak kadar belirli, bağlanma iradesi taşıyan ilk irade açıklaması." },
      { term: "Öneriye davet", definition: "Karşı tarafı öneride bulunmaya çağıran, bağlayıcı olmayan açıklama. Fiyat listesi gönderimi gibi." },
      { term: "Esaslı nokta", definition: "Üzerinde uyuşulmadan sözleşmenin kurulamayacağı unsur (objektif ve sübjektif)." },
      { term: "Hazırlar arası", definition: "Tarafların doğrudan iletişim içinde olduğu durum; telefonla doğrudan görüşme de buna dahildir." },
    ],
    articles: [
      tbk("1", "Sözleşme, tarafların iradelerini karşılıklı ve birbirine uygun olarak açıklamalarıyla kurulur. İrade açıklaması, açık veya örtülü olabilir."),
      tbk("2", "Taraflar sözleşmenin esaslı noktalarında uyuştukları takdirde, ikinci derecedeki noktalar üzerinde durulmamış olsa bile, sözleşme kurulmuş sayılır. İkinci derecedeki noktalarda uyuşulamazsa hâkim, bunları işin özelliğini göz önünde tutarak karara bağlar. Sözleşmenin şekline ilişkin hükümler saklıdır."),
      tbk("3", "Bir süre belirterek bir başkasına sözleşme yapmayı öneren, bu sürenin sonuna kadar önerisiyle bağlıdır. Kabul bildirimi bu süre içinde öneren tarafa ulaşmazsa, öneren önerisiyle bağlı olmaktan kurtulur."),
      tbk("8", "Ücret tarifelerinin, fiyat listelerinin ve benzerlerinin gönderilmesi, öneri sayılmaz. Buna karşılık, ticari bir malın fiyatı gösterilerek sergilenmesi, kural olarak öneri sayılır."),
    ],
    cases: [
      sampleCase("Geliştirme örneği: Vitrinde fiyat etiketiyle sergilenen malın satışından kaçınan satıcının, TBK m. 8 uyarınca öneriyle bağlı olduğuna ilişkin bir karar özeti burada görünecek."),
    ],
  },
  {
    id: "HUK2011-sekil",
    unit_id: "HUK2011-u01",
    course_id: "HUK2011",
    title: "Sözleşmelerde şekil",
    sort_order: 2,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Kural **şekil serbestisidir**: kanunda aksi öngörülmedikçe sözleşmeler hiçbir şekle bağlı değildir (TBK m. 12). Kanunun öngördüğü şekil, kural olarak **geçerlilik şeklidir**; uyulmazsa sözleşme hüküm doğurmaz.

- Kanuni şekil: adi yazılı, resmî şekil.
- İradi şekil: taraflar kendileri şekil kararlaştırabilir (m. 17).
- Yazılı şekilde **imza** zorunludur (m. 14-15).`,
    content_md: `## Şekil serbestisi

TBK m. 12/1 uyarınca sözleşmelerin geçerliliği, kanunda aksi öngörülmedikçe hiçbir şekle bağlı değildir. Bu, **irade özerkliğinin** bir görünümüdür.

## Kanuni şekil türleri

- **Adi yazılı şekil:** Metin ve borç altına girenlerin imzası (m. 14-15). Örnek: kefalet sözleşmesi (ayrıca el yazısıyla azami miktar ve tarih).
- **Resmî şekil:** Resmî memur önünde düzenleme. Örnek: taşınmaz satışı (tapu memuru önünde).

## Şekle aykırılığın sonucu

Kanunun öngördüğü şekil kural olarak **geçerlilik şeklidir**. Şekle uyulmadan kurulan sözleşme **hüküm doğurmaz** (m. 12/2). Hâkim bunu kendiliğinden dikkate alır.

> Şekil eksikliğini ileri sürmek **hakkın kötüye kullanılması** niteliğindeyse dinlenmez. Özellikle edimlerini bilerek ve isteyerek ifa etmiş tarafın sonradan şekle aykırılığı ileri sürmesi bu kapsamda değerlendirilir.

## İradi şekil

Taraflar kanunen şekle bağlı olmayan bir sözleşme için şekil kararlaştırmışlarsa, bu şekle uyulmadıkça **bağlanmak istemedikleri varsayılır** (m. 17).`,
    critical_md: `- Şekil kuralı **geçerlilik** şeklidir; ispat şekliyle karıştırma.
- Kefalette el yazısıyla **azami miktar**, **kefalet tarihi** ve müteselsil kefalette bu sıfat yazılmalıdır (TBK m. 583).
- Taşınmaz satış vaadi **noterde** düzenleme şeklinde yapılır.
- Şekle aykırılığı ileri sürmek bazen hakkın kötüye kullanılmasıdır.`,
    doctrine_md: `Şekle aykırılığın yaptırımı konusunda baskın görüş **kesin hükümsüzlük** görüşüdür. Bir görüşe göre ise yaptırım, edimler ifa edildiğinde hakkın kötüye kullanılması yasağıyla yumuşatılan **kendine özgü bir hükümsüzlüktür**.`,
    glossary: [
      { term: "Geçerlilik şekli", definition: "Uyulmadığında sözleşmenin hüküm doğurmadığı şekil." },
      { term: "İradi şekil", definition: "Kanun gerektirmediği hâlde tarafların kararlaştırdığı şekil." },
      { term: "Resmî şekil", definition: "Yetkili resmî memur önünde yapılan düzenleme." },
    ],
    articles: [
      tbk("12", "Sözleşmelerin geçerliliği, kanunda aksi öngörülmedikçe, hiçbir şekle bağlı değildir. Kanunda sözleşmeler için öngörülen şekil, kural olarak geçerlilik şeklidir. Öngörülen şekle uyulmaksızın kurulan sözleşmeler hüküm doğurmaz."),
      tbk("17", "Kanunen herhangi bir şekle bağlı olmayan sözleşmeler için taraflar şekil öngörmüşlerse, bu şekle uyulmadıkça taraflar sözleşmeyle bağlı olmazlar."),
    ],
    cases: [],
  },
  {
    id: "HUK2011-genel-islem-kosullari",
    unit_id: "HUK2011-u01",
    course_id: "HUK2011",
    title: "Genel işlem koşulları",
    sort_order: 3,
    verification_status: "partial",
    generated_at: GEN,
    summary_md: `Genel işlem koşulları, düzenleyenin **önceden ve tek başına** hazırlayıp çok sayıda benzer sözleşmede kullanmak üzere karşı tarafa sunduğu hükümlerdir (TBK m. 20).

- Karşı tarafın **bilgilendirilmesi** ve içeriğini öğrenme imkânı şarttır; aksi hâlde yazılmamış sayılır (m. 21).
- **Yorum** kuralı: açık olmayan hüküm, düzenleyenin aleyhine yorumlanır (m. 23).
- Karşı tarafın aleyhine **değiştirme yetkisi** veren hükümler yazılmamış sayılır (m. 24).`,
    content_md: `## Tanım ve kapsam

Genel işlem koşulları (GİK), çok sayıda benzer sözleşmede kullanılmak amacıyla düzenleyen tarafından önceden ve tek başına hazırlanan hükümlerdir. Kapsamı, yazı tipi ve şekli önemli değildir (TBK m. 20).

## Denetim aşamaları

1. **Yürürlük denetimi** (m. 21): Düzenleyen, karşı tarafa GİK'in varlığı hakkında açıkça bilgi vermeli ve içeriğini öğrenme imkânı tanımalıdır. Aksi hâlde hükümler **yazılmamış sayılır**.
2. **Yorum denetimi** (m. 23): Açık ve anlaşılır olmayan ya da birden fazla anlama gelen hükümler **düzenleyenin aleyhine**, karşı tarafın lehine yorumlanır.
3. **İçerik denetimi** (m. 25): Dürüstlük kuralına aykırı olarak karşı tarafın aleyhine hükümler konulamaz.

## Bireysel müzakere

Hükmün her birinin tartışılarak kabul edildiği hâlde o hüküm GİK sayılmaz. Bunu **düzenleyen ispat eder**.`,
    critical_md: `- Üç aşama: **yürürlük → yorum → içerik**. Sırayı karıştırma.
- Yaptırım çoğunlukla **yazılmamış sayılma**dır, kesin hükümsüzlük değil.
- Belirsizlikte düzenleyenin aleyhine yorum (contra proferentem).
- Doğrulama notu: m. 25'in metni bu örnek veride doğrulanamadı.`,
    doctrine_md: `Baskın görüşe göre GİK denetimi, tüketici olsun olmasın **bütün sözleşmelere** uygulanır. Bir görüş ise tacirler arası sözleşmelerde içerik denetiminin daha dar yapılması gerektiğini savunur.`,
    glossary: [
      { term: "Düzenleyen", definition: "Genel işlem koşullarını önceden hazırlayıp sunan taraf." },
      { term: "Yazılmamış sayılma", definition: "Hükmün sözleşmenin parçası olmadığı kabul edilir; sözleşmenin kalanı ayakta kalır." },
    ],
    articles: [
      tbk("20", "Genel işlem koşulları, bir sözleşme yapılırken düzenleyenin, ileride çok sayıdaki benzer sözleşmede kullanmak amacıyla, önceden, tek başına hazırlayarak karşı tarafa sunduğu sözleşme hükümleridir."),
      { ...tbk("25", "Genel işlem koşullarına, dürüstlük kuralına aykırı olarak karşı tarafın aleyhine veya onun durumunu ağırlaştırıcı nitelikte hükümler konulamaz."), verified: false },
    ],
    cases: [],
  },
  {
    id: "HUK2011-irade-bozukluklari",
    unit_id: "HUK2011-u02",
    course_id: "HUK2011",
    title: "İrade bozuklukları: yanılma, aldatma, korkutma",
    sort_order: 1,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `İrade bozukluğu hâlinde sözleşme **iptal edilebilir** (baskın görüş: iptal edilebilirlik / askıda geçersizlik). Üç hâl vardır:

- **Yanılma** (m. 30-35): Yalnızca **esaslı** yanılma sözleşmeden bağı kaldırır.
- **Aldatma** (m. 36): Yanılma esaslı olmasa bile yeterlidir.
- **Korkutma** (m. 37-38): Ağır ve yakın bir tehlike karşısında yapılan sözleşme bağlamaz.

Hak düşürücü süre **1 yıl**: yanılma/aldatmanın öğrenilmesinden, korkutmanın etkisinin kalkmasından itibaren (m. 39).`,
    content_md: `## Genel çerçeve

İrade ile beyan arasında bir uyumsuzluk varsa veya irade sakatlanmış bir süreçte oluşmuşsa **irade bozukluğu** vardır. TBK bu hâllerde sözleşmeyi kendiliğinden geçersiz saymaz; irade bozukluğuna uğrayan tarafa **bağlı olmadığını bildirme** imkânı verir.

## Yanılma (hata)

Sözleşme kurulurken **esaslı yanılmaya** düşen taraf sözleşmeyle bağlı değildir (m. 30). Esaslı yanılma hâlleri (m. 31):

- Sözleşmenin **niteliğinde** yanılma (bağışlamak isterken satmak)
- **Konusunda** yanılma
- **Kişide** yanılma (kişinin önemli olduğu sözleşmelerde)
- **Edim miktarında** önemli yanılma
- **Temel yanılması**: dürüstlük kuralına göre sözleşmenin zorunlu temeli sayılan nitelikte yanılma

> **Saik yanılması** kural olarak esaslı değildir. Temel yanılması bunun istisnasıdır.

Hesap yanlışlıkları sözleşmenin geçerliliğini etkilemez, düzeltilir (m. 33).

## Aldatma (hile)

Taraflardan biri diğerinin aldatması sonucu sözleşme yapmışsa, **yanılma esaslı olmasa bile** sözleşmeyle bağlı değildir (m. 36/1). Aldatma **üçüncü kişiden** geliyorsa, karşı taraf sözleşme yapılırken bunu biliyor veya bilmesi gerekiyorsa sözleşme iptal edilebilir (m. 36/2).

## Korkutma (ikrah)

Taraflardan biri, diğer taraf veya **üçüncü kişinin** korkutması sonucu sözleşme yapmışsa bağlı değildir (m. 37). Korkutmanın **ağır ve yakın** bir tehlikeye ilişkin olması gerekir. Bir **hakkı kullanma** tehdidi, ancak aşırı yarar elde etmek amacıyla yapılmışsa korkutma sayılır (m. 38).

## Süre

| Bozukluk | Süre başlangıcı | Süre |
|---|---|---|
| Yanılma | Öğrenme | 1 yıl |
| Aldatma | Öğrenme | 1 yıl |
| Korkutma | Etkinin kalkması | 1 yıl |

Süre içinde bildirim yapılmaz veya verilen geri istenmezse sözleşme **onaylanmış** sayılır (m. 39).`,
    critical_md: `- Aldatmada yanılmanın **esaslı olması gerekmez**. Bu en sık sorulan ayrımdır.
- Üçüncü kişinin **aldatmasında** karşı tarafın bilmesi/bilmesi gerekmesi aranır; üçüncü kişinin **korkutmasında** aranmaz.
- Hak düşürücü süre **1 yıldır**; zamanaşımı değildir.
- Temel yanılması, saik yanılmasının esaslı sayılan istisnasıdır.
- Hesap hatası iptal sebebi değildir, düzeltilir.`,
    doctrine_md: `İrade bozukluğunun yaptırımı konusunda baskın görüş **iptal edilebilirlik** görüşüdür: sözleşme baştan geçerlidir, iptal beyanıyla geçmişe etkili olarak ortadan kalkar. Bir görüşe göre ise **askıda geçersizlik** söz konusudur: sözleşme baştan geçersizdir, süre geçerse geçerlilik kazanır.`,
    glossary: [
      { term: "Esaslı yanılma", definition: "TBK m. 31'de sayılan, sözleşmeyle bağlılığı ortadan kaldıran yanılma." },
      { term: "Temel yanılması", definition: "Dürüstlük kuralına göre sözleşmenin zorunlu temeli sayılan bir durumda yanılma." },
      { term: "Saik yanılması", definition: "Sözleşmeyi yapmaya iten sebepte yanılma; kural olarak esaslı değildir." },
      { term: "Hak düşürücü süre", definition: "Geçmesiyle hakkın kendisinin sona erdiği süre; hâkim kendiliğinden dikkate alır." },
    ],
    articles: [
      tbk("30", "Sözleşme kurulurken esaslı yanılmaya düşen taraf, sözleşmeyle bağlı değildir."),
      tbk("36", "Taraflardan biri, diğerinin aldatması sonucu sözleşme yapmışsa yanılma esaslı olmasa bile, sözleşmeyle bağlı değildir. Üçüncü bir kişinin aldatması sonucu sözleşme yapan taraf, sözleşmenin kurulması sırasında diğer tarafın aldatmayı bilmesi veya bilmesinin gerekmesi durumunda, sözleşmeyle bağlı değildir."),
      tbk("37", "Taraflardan biri, diğer taraf veya üçüncü kişinin korkutması sonucu sözleşme yapmışsa, sözleşmeyle bağlı değildir. Durumun gereğine göre, korkutulan taraf, kendisinin veya yakınlarından birinin kişilik değerlerinin veya malvarlığının ağır ve yakın bir tehlikeyle karşı karşıya bulunduğu kanısını taşıyorsa, korkutma gerçekleşmiş sayılır."),
      tbk("39", "Yanılma veya aldatma sonucu ya da korkutma altında sözleşme yapan taraf, yanılma veya aldatmayı öğrendiği ya da korkutmanın etkisinin ortadan kalktığı andan başlayarak bir yıl içinde sözleşmeyle bağlı olmadığını karşı tarafa bildirmez veya verdiğini geri istemezse, sözleşmeyi onaylamış sayılır."),
    ],
    cases: [
      sampleCase("Geliştirme örneği: Aracın kilometre bilgisinin değiştirildiğini satıştan sonra öğrenen alıcının, aldatma nedeniyle bir yıllık süre içinde sözleşmeyle bağlı olmadığını bildirmesine ilişkin karar özeti burada görünecek."),
    ],
  },
  {
    id: "HUK2011-asiri-yararlanma",
    unit_id: "HUK2011-u02",
    course_id: "HUK2011",
    title: "Aşırı yararlanma (gabin)",
    sort_order: 2,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Karşılıklı edimler arasında **açık oransızlık** varsa ve bu oransızlık zarar görenin **zor durumda kalmasından, düşüncesizliğinden veya deneyimsizliğinden** yararlanılarak gerçekleşmişse, zarar gören sözleşmeyle bağlı olmadığını bildirebilir ya da sözleşmeye bağlı kalarak **oransızlığın giderilmesini** isteyebilir (TBK m. 28).

Süre: öğrenmeden itibaren **1 yıl**, her hâlde kuruluştan itibaren **5 yıl**.`,
    content_md: `## Unsurlar

1. **Objektif unsur:** Edimler arasında açık bir oransızlık. Karşılaştırma sözleşmenin **kurulduğu an** esas alınarak yapılır.
2. **Sübjektif unsur (zarar görende):** Zor durum, düşüncesizlik veya deneyimsizlik.
3. **Sübjektif unsur (yararlananda):** Bu durumdan **yararlanma** bilinci.

## Seçimlik haklar

Zarar gören iki yoldan birini seçebilir:

- Sözleşmeyle **bağlı olmadığını bildirmek** ve verdiğini geri istemek
- Sözleşmeye **bağlı kalarak** edimler arasındaki oransızlığın giderilmesini istemek (TBK ile getirilen yenilik)

## Süreler

Zarar gören, durumu öğrendiği tarihten başlayarak **bir yıl** ve her hâlde sözleşmenin kurulmasından başlayarak **beş yıl** içinde bu haklarını kullanabilir.`,
    critical_md: `- Üç unsur birlikte aranır; yalnızca oransızlık yetmez.
- Oransızlık **kuruluş anına** göre değerlendirilir; sonradan ortaya çıkan dengesizlik aşırı ifa güçlüğü (m. 138) konusudur.
- **Sözleşmeyi ayakta tutma** seçeneği sınavda sık sorulur.
- Süreler: **1 yıl / 5 yıl**.`,
    doctrine_md: `Baskın görüşe göre aşırı yararlanmanın yaptırımı da irade bozukluklarında olduğu gibi **iptal edilebilirliktir**. Bir görüşe göre ise uygulanacak yaptırım, kesin hükümsüzlüğe yaklaşan özel bir yaptırımdır.`,
    glossary: [
      { term: "Gabin", definition: "Aşırı yararlanmanın eski hukuktaki adı." },
      { term: "Açık oransızlık", definition: "Edimlerin değerleri arasında, kuruluş anında göze çarpan dengesizlik." },
    ],
    articles: [
      tbk("28", "Bir sözleşmede karşılıklı edimler arasında açık bir oransızlık varsa, bu oransızlık zarar görenin zor durumda kalmasından veya düşüncesizliğinden ya da deneyimsizliğinden yararlanılmak suretiyle gerçekleşmişse zarar gören, durumu öğrendiği tarihten başlayarak bir yıl ve her hâlde sözleşmenin kurulmasından başlayarak beş yıl içinde, sözleşmeyle bağlı olmadığını bildirerek verdiğini geri isteyebilir veya sözleşmeye bağlı kalarak edimler arasındaki oransızlığın giderilmesini isteyebilir."),
    ],
    cases: [],
  },
  {
    id: "HUK2011-kesin-hukumsuzluk",
    unit_id: "HUK2011-u02",
    course_id: "HUK2011",
    title: "Kesin hükümsüzlük",
    sort_order: 3,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Kanunun **emredici** hükümlerine, **ahlaka**, **kamu düzenine**, **kişilik haklarına** aykırı veya **konusu imkânsız** olan sözleşmeler kesin olarak hükümsüzdür (TBK m. 27/1).

- Hâkim kendiliğinden dikkate alır, herkes ileri sürebilir, süreye bağlı değildir.
- **Kısmi hükümsüzlük** diğer hükümleri etkilemez; ancak o hükümler olmadan sözleşme yapılmayacak idiyse tamamı hükümsüz olur (m. 27/2).`,
    content_md: `## Hükümsüzlük sebepleri

- **Emredici hükümlere aykırılık:** Tarafların aksini kararlaştıramayacağı kurallar.
- **Ahlaka aykırılık:** Toplumun genel ahlak anlayışına aykırı içerik.
- **Kamu düzenine aykırılık:** Toplumun temel yapısını koruyan kurallar.
- **Kişilik haklarına aykırılık:** Kişinin özgürlüğünü aşırı sınırlayan taahhütler.
- **Başlangıçtaki objektif imkânsızlık:** Edim, sözleşme kurulurken herkes için imkânsızsa.

## Sonuçları

Kesin hükümsüz sözleşme **baştan itibaren** hüküm doğurmaz. Bu durum:

- Hâkim tarafından **kendiliğinden** dikkate alınır,
- **Herkes** tarafından ileri sürülebilir,
- Herhangi bir **süreye bağlı değildir**,
- Kural olarak **onayla** geçerli hâle gelmez.

## Kısmi hükümsüzlük

Hükümsüzlük sözleşmenin yalnızca bir kısmına ilişkinse, diğer hükümler ayakta kalır. Ancak bu hükümler olmaksızın sözleşmenin yapılmayacağı **açıkça anlaşılırsa** sözleşmenin tamamı hükümsüz olur (m. 27/2).`,
    critical_md: `- **Sonradan** ortaya çıkan imkânsızlık kesin hükümsüzlük değil, ifa imkânsızlığıdır (m. 136).
- Kısmi hükümsüzlük **kural**, tam hükümsüzlük **istisnadır**.
- Kesin hükümsüzlük **süreye bağlı değildir**; iptal edilebilirlikle karıştırma.`,
    doctrine_md: `Baskın görüşe göre kesin hükümsüzlüğü ileri sürmek de istisnai hâllerde **hakkın kötüye kullanılması** sayılabilir. Bir görüş, kesin hükümsüzlüğün kamu düzeniyle ilgili niteliği nedeniyle bu istisnanın çok dar yorumlanması gerektiğini savunur.`,
    glossary: [
      { term: "Emredici hüküm", definition: "Taraf iradeleriyle aksi kararlaştırılamayan kural." },
      { term: "Kısmi hükümsüzlük", definition: "Sözleşmenin yalnızca bir bölümünün geçersiz olması." },
    ],
    articles: [
      tbk("27", "Kanunun emredici hükümlerine, ahlaka, kamu düzenine, kişilik haklarına aykırı veya konusu imkânsız olan sözleşmeler kesin olarak hükümsüzdür. Sözleşmenin içeriğindeki kısmi hükümsüzlük, diğer hükümlerin geçerliliğini etkilemez. Ancak, bu hükümler olmaksızın sözleşmenin yapılmayacağı açıkça anlaşılırsa, sözleşmenin tamamı kesin olarak hükümsüz olur."),
    ],
    cases: [],
  },

  // ------------------------------------------------------------------ CEZA GENEL
  {
    id: "HUK2013-kast-ve-taksir",
    unit_id: "HUK2013-u01",
    course_id: "HUK2013",
    title: "Kast ve taksir",
    sort_order: 1,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Suçun oluşması **kastın** varlığına bağlıdır. Kast, suçun kanuni tanımındaki unsurların **bilerek ve istenerek** gerçekleştirilmesidir (TCK m. 21/1).

- **Olası kast** (m. 21/2): Fail neticeyi öngörür, buna rağmen fiili işler. Ceza indirilir.
- **Taksir** (m. 22/2): Dikkat ve özen yükümlülüğüne aykırılık; netice **öngörülmez**.
- **Bilinçli taksir** (m. 22/3): Netice öngörülür ama **istenmez**. Ceza artırılır.
- Taksirli fiiller ancak kanunun **açıkça** belirttiği hâllerde cezalandırılır.`,
    content_md: `## Doğrudan kast

Kast iki unsurdan oluşur: **bilme** (unsurları bilmek) ve **isteme** (gerçekleşmesini istemek). Fail, kanuni tanımdaki unsurları bilerek ve isteyerek gerçekleştirir.

## Olası kast

Fail, suçun kanuni tanımındaki unsurların gerçekleşebileceğini **öngörür**, buna rağmen fiili işler. Neticeyi doğrudan istemez ama **kabullenir** ("olursa olsun").

Ceza: ağırlaştırılmış müebbet yerine **müebbet**, müebbet yerine **20-25 yıl**, diğer suçlarda temel ceza **üçte birden yarısına kadar indirilir** (m. 21/2).

## Taksir

Dikkat ve özen yükümlülüğüne aykırılık dolayısıyla, bir davranışın suçun kanuni tanımında belirtilen neticesi **öngörülmeyerek** gerçekleştirilmesidir (m. 22/2).

## Bilinçli taksir

Kişinin öngördüğü neticeyi **istememesine** karşın neticenin meydana gelmesidir. Taksirli suça ilişkin ceza **üçte birden yarısına kadar artırılır** (m. 22/3).

## En kritik ayrım: olası kast mı, bilinçli taksir mi?

| | Öngörme | İsteme/kabullenme |
|---|---|---|
| Doğrudan kast | Var | İster |
| Olası kast | Var | Kabullenir |
| Bilinçli taksir | Var | İstemez, gerçekleşmeyeceğine güvenir |
| Basit taksir | Yok | — |

Ayrımda belirleyici olan, failin neticenin **gerçekleşmeyeceğine güvenip güvenmediğidir**.`,
    critical_md: `- Olası kast ile bilinçli taksirin ikisinde de netice **öngörülür**; fark **kabullenme**dedir.
- Olası kastta ceza **indirilir**, bilinçli taksirde **artırılır**. Yönleri karıştırma.
- Taksirli suç ancak kanunda **açıkça** öngörülmüşse cezalandırılır (m. 22/1).
- Taksirli suçta, netice yalnızca faili etkilemişse ceza verilmeyebilir (m. 22/6).`,
    doctrine_md: `Baskın görüşe göre olası kast ile bilinçli taksir ayrımında **kabullenme teorisi** esas alınır. Bir görüşe göre ise failin, neticeyi önlemek için herhangi bir çaba gösterip göstermediği (kayıtsızlık) belirleyicidir.`,
    glossary: [
      { term: "Kast", definition: "Suçun kanuni tanımındaki unsurların bilerek ve istenerek gerçekleştirilmesi." },
      { term: "Olası kast", definition: "Neticeyi öngörüp kabullenerek fiili işleme." },
      { term: "Bilinçli taksir", definition: "Neticeyi öngörüp gerçekleşmeyeceğine güvenerek fiili işleme." },
    ],
    articles: [
      tck("21", "Suçun oluşması kastın varlığına bağlıdır. Kast, suçun kanuni tanımındaki unsurların bilerek ve istenerek gerçekleştirilmesidir. Kişinin, suçun kanuni tanımındaki unsurların gerçekleşebileceğini öngörmesine rağmen, fiili işlemesi halinde olası kast vardır."),
      tck("22", "Taksirle işlenen fiiller, kanunun açıkça belirttiği hallerde cezalandırılır. Taksir, dikkat ve özen yükümlülüğüne aykırılık dolayısıyla, bir davranışın suçun kanuni tanımında belirtilen neticesi öngörülmeyerek gerçekleştirilmesidir. Kişinin öngördüğü neticeyi istememesine karşın, neticenin meydana gelmesi halinde bilinçli taksir vardır; bu halde taksirli suça ilişkin ceza üçte birden yarısına kadar artırılır."),
    ],
    cases: [
      sampleCase("Geliştirme örneği: Kalabalık bir caddede aşırı hızla araç kullanan sürücünün, yayalara çarpma ihtimalini öngörüp kabullendiği gerekçesiyle olası kastla sorumlu tutulmasına ilişkin karar özeti burada görünecek."),
    ],
  },
  {
    id: "HUK2013-mesru-savunma",
    unit_id: "HUK2013-u01",
    course_id: "HUK2013",
    title: "Meşru savunma",
    sort_order: 2,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Kendisine veya başkasına ait bir hakka yönelik, **gerçekleşen, gerçekleşmesi veya tekrarı muhakkak** olan **haksız** bir saldırıyı, o anki hâl ve koşullara göre **orantılı** biçimde defetmek zorunluluğuyla işlenen fiillerden dolayı faile ceza verilmez (TCK m. 25/1).

- Saldırıya ilişkin şartlar ve savunmaya ilişkin şartlar ayrı ayrı incelenir.
- Sınırın mazur görülebilecek **heyecan, korku veya telaşla** aşılması hâlinde ceza verilmez (m. 27/2).`,
    content_md: `## Saldırıya ilişkin şartlar

1. **Haksız** bir saldırı olmalı.
2. Saldırı bir **hakka** yönelmeli (failin veya başkasının).
3. Saldırı **gerçekleşen, gerçekleşmesi veya tekrarı muhakkak** olmalı (güncellik).

## Savunmaya ilişkin şartlar

1. Savunmada **zorunluluk** bulunmalı.
2. Savunma **saldırgana** yönelmeli.
3. Savunma saldırıyla **orantılı** olmalı (o anki hâl ve koşullara göre).

## Sınırın aşılması

Meşru savunmada sınırın kast olmaksızın aşılması hâlinde, fiil taksirle işlendiğinde de cezalandırılıyorsa, taksirli suç cezasının altıda birinden üçte birine kadar indirilmiş cezaya hükmolunur (m. 27/1). Sınırın **mazur görülebilecek heyecan, korku veya telaştan** ileri gelmesi hâlinde faile ceza verilmez (m. 27/2).`,
    critical_md: `- **Güncellik:** Saldırı bitmişse meşru savunma olmaz; intikam ayrı değerlendirilir.
- Orantılılık **o anki koşullara** göre değerlendirilir, sonradan soğukkanlı bakışla değil.
- Sınırın mazur görülebilir heyecanla aşılması: **ceza yok** (m. 27/2).
- Meşru savunma, **hukuka uygunluk** nedenidir; kusurluluğu kaldıran nedenlerle karıştırma.`,
    doctrine_md: `Baskın görüşe göre meşru savunma hukuka uygunluk nedeni olduğundan, meşru savunmaya karşı meşru savunma yapılamaz. Bir görüşe göre ise saldırganın, savunmanın sınırını aşan kısmına karşı meşru savunma hakkı doğar.`,
    glossary: [
      { term: "Hukuka uygunluk nedeni", definition: "Fiili baştan hukuka uygun hâle getiren durum; fiil suç olmaktan çıkar." },
      { term: "Orantılılık", definition: "Savunmanın, saldırının ağırlığı ve araçlarıyla dengeli olması." },
    ],
    articles: [
      tck("25", "Gerek kendisine ve gerekse başkasına ait bir hakka yönelik, gerçekleşen, gerçekleşmesi veya tekrarı muhakkak olan haksız bir saldırıyı o anki hal ve koşullara göre saldırı ile orantılı biçimde defetmek zorunluluğu ile işlenen fiillerden dolayı faile ceza verilmez."),
    ],
    cases: [],
  },
  {
    id: "HUK2013-hata",
    unit_id: "HUK2013-u01",
    course_id: "HUK2013",
    title: "Hata",
    sort_order: 3,
    verification_status: "partial",
    generated_at: GEN,
    summary_md: `Fiilin icrası sırasında suçun kanuni tanımındaki **maddi unsurları bilmeyen** kişi kasten hareket etmiş olmaz (TCK m. 30/1).

- **Unsurda hata:** Kastı kaldırır; taksir sorumluluğu saklıdır.
- **Hukuka uygunluk nedeninin maddi koşullarında** kaçınılmaz hata: ceza verilmez (m. 30/3).
- **Haksızlık yanılgısı:** İşlediği fiilin haksızlık oluşturduğu hususunda **kaçınılmaz** bir hataya düşen kişi cezalandırılmaz (m. 30/4).`,
    content_md: `## Unsurda hata

Fail, suçun kanuni tanımındaki maddi unsurları bilmiyorsa **kast yoktur**. Bu hata **taksirli sorumluluğu** etkilemez; fiil taksirle de işlenebiliyorsa fail taksirden sorumlu olabilir.

## Nitelikli hâllerde hata

Suçun daha ağır veya daha az cezayı gerektiren nitelikli hâllerinin gerçekleştiği hususunda hataya düşen kişi, bu hatasından **yararlanır** (m. 30/2).

## Haksızlık yanılgısı

İşlediği fiilin haksızlık oluşturduğu hususunda **kaçınılmaz** bir hataya düşen kişi cezalandırılmaz (m. 30/4). Hatanın kaçınılmaz olup olmadığı failin durumuna göre değerlendirilir.`,
    critical_md: `- Unsurda hata **kastı** kaldırır, taksiri değil.
- Haksızlık yanılgısında hata **kaçınılmaz** olmalıdır.
- Doğrulama notu: m. 30/2 metni bu örnek veride doğrulanamadı.`,
    doctrine_md: `Baskın görüşe göre kişide ve konuda hata, korunan hukuki değerler eşdeğerse failin sorumluluğunu etkilemez.`,
    glossary: [
      { term: "Haksızlık yanılgısı", definition: "Failin, fiilinin hukuka aykırı olduğunu bilmemesi." },
    ],
    articles: [
      tck("30", "Fiilin icrası sırasında suçun kanuni tanımındaki maddi unsurları bilmeyen kişi, kasten hareket etmiş olmaz. Bu hata dolayısıyla taksirli sorumluluk hali saklıdır."),
    ],
    cases: [],
  },
  {
    id: "HUK2013-tesebbus",
    unit_id: "HUK2013-u02",
    course_id: "HUK2013",
    title: "Teşebbüs ve gönüllü vazgeçme",
    sort_order: 1,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Kişi, işlemeyi kastettiği bir suçu **elverişli hareketlerle doğrudan doğruya icraya başlayıp** da **elinde olmayan nedenlerle** tamamlayamazsa teşebbüsten sorumludur (TCK m. 35/1).

- Hazırlık hareketleri kural olarak cezalandırılmaz.
- Taksirli suçlara teşebbüs olmaz.
- **Gönüllü vazgeçme** (m. 36): Fail kendi isteğiyle vazgeçer veya neticeyi önlerse teşebbüsten cezalandırılmaz.`,
    content_md: `## Unsurlar

1. **Kast:** Teşebbüs yalnızca kasten işlenebilen suçlarda mümkündür.
2. **Elverişli hareket:** Hareket, suçu gerçekleştirmeye objektif olarak uygun olmalı.
3. **İcraya başlama:** Hazırlık hareketi aşılmış, doğrudan doğruya icraya başlanmış olmalı.
4. **Elde olmayan nedenler:** Suç, failin iradesi dışındaki nedenlerle tamamlanamamış olmalı.

## Ceza

Meydana gelen zarar veya tehlikenin ağırlığına göre ağırlaştırılmış müebbet yerine 13-20 yıl, müebbet yerine 9-15 yıl; diğer hâllerde verilecek ceza **dörtte birden dörtte üçüne kadar** indirilir (m. 35/2).

## Gönüllü vazgeçme

Fail, suçun icra hareketlerinden **gönüllü olarak vazgeçer** veya kendi çabalarıyla suçun tamamlanmasını ya da neticenin gerçekleşmesini **önlerse**, teşebbüsten dolayı cezalandırılmaz. Ancak tamam olan kısım ayrı bir suç oluşturuyorsa, sadece o suçtan cezalandırılır (m. 36).`,
    critical_md: `- **Elverişsiz** hareketle teşebbüs olmaz (işlenemez suç).
- Hazırlık hareketi ile icra hareketi ayrımı olay sorularının merkezidir.
- Gönüllü vazgeçmede **tamam olan kısım** ayrıca cezalandırılır.
- İndirim oranı: **1/4 ile 3/4** arası.`,
    doctrine_md: `İcra hareketlerinin başlangıcının belirlenmesinde baskın görüş **objektif-sübjektif karma** ölçütü benimser: failin planı da dikkate alınarak hareketin suçun kanuni tanımındaki fiile doğrudan yönelip yönelmediğine bakılır.`,
    glossary: [
      { term: "Hazırlık hareketi", definition: "Suçun işlenmesini kolaylaştıran ama icraya başlamayan hareket." },
      { term: "Gönüllü vazgeçme", definition: "Failin kendi iradesiyle suçu tamamlamaktan vazgeçmesi." },
    ],
    articles: [
      tck("35", "Kişi, işlemeyi kastettiği bir suçu elverişli hareketlerle doğrudan doğruya icraya başlayıp da elinde olmayan nedenlerle tamamlayamaz ise teşebbüsten sorumlu tutulur."),
      tck("36", "Kişi, suçun icra hareketlerinden gönüllü olarak vazgeçer veya kendi çabalarıyla suçun tamamlanmasını veya neticenin gerçekleşmesini önlerse, teşebbüsten dolayı cezalandırılmaz; fakat tamam olan kısım esasen bir suç oluşturduğu takdirde, sadece o suçtan dolayı cezalandırılır."),
    ],
    cases: [],
  },
  {
    id: "HUK2013-istirak",
    unit_id: "HUK2013-u02",
    course_id: "HUK2013",
    title: "Suça iştirak",
    sort_order: 2,
    verification_status: "verified",
    generated_at: GEN,
    summary_md: `Suça birden fazla kişi katıldığında iştirak söz konusudur.

- **Müşterek faillik** (m. 37/1): Fiili birlikte gerçekleştirenlerin her biri faildir.
- **Dolaylı faillik** (m. 37/2): Başkasını araç olarak kullanan da faildir.
- **Azmettirme** (m. 38): Başkasını suç işlemeye azmettiren, işlenen suçun cezasıyla cezalandırılır.
- **Yardım etme** (m. 39): Cezada indirim yapılır.`,
    content_md: `## Faillik

Suçun kanuni tanımında yer alan fiili **birlikte gerçekleştiren** kişilerden her biri fail olarak sorumludur (m. 37/1). Müşterek faillikte **ortak suç işleme kararı** ve **fiil üzerinde ortak hâkimiyet** aranır.

## Dolaylı faillik

Suçun işlenmesinde bir başkasını **araç olarak kullanan** kişi de fail olarak sorumludur. Kusur yeteneği olmayanları suçun işlenmesinde araç olarak kullanan kişinin cezası **üçte birden yarısına kadar artırılır** (m. 37/2).

## Azmettirme

Başkasını suç işlemeye azmettiren kişi, **işlenen suçun cezası** ile cezalandırılır (m. 38/1). Azmettirmede suç işleme kararı, azmettirilende **azmettiren tarafından** uyandırılır.

## Yardım etme

Suç işlemeye özendirmek, suç işleme kararını kuvvetlendirmek, suçun işlenmesinden sonra yardımda bulunacağını vaat etmek, suçun nasıl işleneceği hususunda yol göstermek veya araç sağlamak gibi hâller yardım etmedir. Yardım edene, işlenen suçun cezasında **indirim** yapılır (m. 39).`,
    critical_md: `- **Azmettiren**, faille aynı cezayı alır; **yardım eden** indirimli ceza alır.
- Azmettirmede suç işleme kararını **uyandırmak**, yardımda ise var olan kararı **kuvvetlendirmek** söz konusudur.
- Müşterek faillikte **fiil üzerinde ortak hâkimiyet** anahtar kavramdır.`,
    doctrine_md: `Faillik ile şerikliğin ayrımında baskın görüş **fiil üzerinde hâkimiyet** teorisini benimser.`,
    glossary: [
      { term: "Şeriklik", definition: "Azmettirme ve yardım etme gibi, faillik dışındaki iştirak biçimleri." },
      { term: "Dolaylı fail", definition: "Suçu başkasını araç olarak kullanarak işleyen kişi." },
    ],
    articles: [
      tck("37", "Suçun kanuni tanımında yer alan fiili birlikte gerçekleştiren kişilerden her biri, fail olarak sorumlu olur. Suçun işlenmesinde bir başkasını araç olarak kullanan kişi de fail olarak sorumlu tutulur."),
      tck("38", "Başkasını suç işlemeye azmettiren kişi, işlenen suçun cezası ile cezalandırılır."),
    ],
    cases: [],
  },
];

// ------------------------------------------------------------------ SORULAR

const mcq = (
  topic_id: string,
  n: number,
  stem_md: string,
  options: string[],
  correct_option: number,
  explanation_md: string,
): Question => ({
  id: `${topic_id}-q${String(n).padStart(2, "0")}`,
  topic_id,
  course_id: topic_id.slice(0, 7),
  kind: "mcq",
  stem_md,
  options,
  correct_option,
  explanation_md,
  rubric: null,
  model_answer_md: null,
  origin: "bank",
  note_id: null,
});

const K = "HUK2011-sozlesmenin-kurulmasi";
const S = "HUK2011-sekil";
const G = "HUK2011-genel-islem-kosullari";
const I = "HUK2011-irade-bozukluklari";
const A = "HUK2011-asiri-yararlanma";
const H = "HUK2011-kesin-hukumsuzluk";
const KT = "HUK2013-kast-ve-taksir";
const MS = "HUK2013-mesru-savunma";
const HT = "HUK2013-hata";
const T = "HUK2013-tesebbus";
const IS = "HUK2013-istirak";

export const questions: Question[] = [
  mcq(K, 1, "Bir mağazanın vitrininde fiyat etiketiyle sergilenen bir mont için aşağıdakilerden hangisi doğrudur?",
    ["Öneriye davettir, satıcıyı bağlamaz.", "Kural olarak öneridir.", "Kabul niteliğindedir.", "Hiçbir hukuki anlam taşımaz.", "Yalnızca tacirler arasında öneridir."],
    1, "Ticari bir malın fiyatı gösterilerek sergilenmesi **kural olarak öneri** sayılır (TBK m. 8/2). Fiyat listesi göndermek ise öneri değildir."),
  mcq(K, 2, "A, B'ye telefonla bir otomobil satmayı önermiş, süre belirtmemiştir. B 'Düşüneyim' deyip telefonu kapatmıştır. Ertesi gün B kabul ettiğini bildirir. Sonuç nedir?",
    ["Sözleşme kurulmuştur.", "A önerisiyle bağlı değildir; sözleşme kurulmamıştır.", "Sözleşme askıda geçersizdir.", "A'nın susması kabul sayılır.", "Sözleşme kesin hükümsüzdür."],
    1, "Telefonla doğrudan yapılan öneri **hazırlar arasında** sayılır ve süre belirtilmemişse **hemen** kabul edilmelidir (TBK m. 4). Hemen kabul edilmediği için A bağlı olmaktan kurtulmuştur."),
  mcq(K, 3, "Öneriye verilen ve öneriyi değiştiren bir cevap nasıl nitelendirilir?",
    ["Kabul", "Yeni bir öneri", "Öneriye davet", "Geç kabul", "Örtülü kabul"],
    1, "Öneriye uygun olmayan, onu değiştiren veya genişleten cevap kabul değil **yeni bir öneridir**."),
  mcq(K, 4, "Ücret tarifesinin müşterilere gönderilmesi nasıl nitelendirilir?",
    ["Öneri", "Kabul", "Öneriye davet", "Ön sözleşme", "Bağlayıcı vaat"],
    2, "Ücret tarifelerinin, fiyat listelerinin ve benzerlerinin gönderilmesi **öneri sayılmaz** (TBK m. 8/1); öneriye davettir."),
  mcq(S, 1, "TBK'ya göre kanunda sözleşmeler için öngörülen şekil kural olarak hangi niteliktedir?",
    ["İspat şekli", "Geçerlilik şekli", "Tavsiye niteliğinde", "Yalnızca tacirler için bağlayıcı", "İradi şekil"],
    1, "Kanunda öngörülen şekil kural olarak **geçerlilik şeklidir** (TBK m. 12/2)."),
  mcq(S, 2, "Kanunen şekle bağlı olmayan bir sözleşme için taraflar yazılı şekil kararlaştırmışsa ne olur?",
    ["Şekil kararlaştırması geçersizdir.", "Şekle uyulmadıkça taraflar bağlı olmazlar.", "Sözleşme kesin hükümsüzdür.", "Şekil yalnızca ispat için önemlidir.", "Hâkim şekli göz ardı eder."],
    1, "Taraflar kanunen gerekmeyen bir şekil öngörmüşlerse, bu şekle uyulmadıkça **bağlanmak istemedikleri** kabul edilir (TBK m. 17)."),
  mcq(G, 1, "Genel işlem koşullarında açık ve anlaşılır olmayan bir hüküm nasıl yorumlanır?",
    ["Düzenleyenin lehine", "Düzenleyenin aleyhine", "Hâkimin takdirine göre serbestçe", "Kesin hükümsüz sayılır", "Tacirin lehine"],
    1, "Açık olmayan veya birden fazla anlama gelen hükümler **düzenleyenin aleyhine**, karşı tarafın lehine yorumlanır (TBK m. 23)."),
  mcq(G, 2, "Karşı tarafa varlığı hakkında bilgi verilmeyen genel işlem koşullarının yaptırımı nedir?",
    ["Kesin hükümsüzlük", "İptal edilebilirlik", "Yazılmamış sayılma", "Askıda geçersizlik", "Tazminat"],
    2, "Bilgilendirme ve öğrenme imkânı sağlanmamışsa hükümler **yazılmamış sayılır** (TBK m. 21)."),
  mcq(I, 1, "Aldatma nedeniyle sözleşmeyle bağlı olmadığını bildirmek için yanılmanın esaslı olması gerekir mi?",
    ["Evet, her zaman", "Hayır, esaslı olması gerekmez", "Yalnızca kişide yanılmada", "Yalnızca üçüncü kişi aldatmışsa", "Yalnızca tacirlerde"],
    1, "Aldatma hâlinde **yanılma esaslı olmasa bile** taraf sözleşmeyle bağlı değildir (TBK m. 36/1)."),
  mcq(I, 2, "Korkutma altında sözleşme yapan taraf için bir yıllık süre ne zaman başlar?",
    ["Sözleşmenin kurulmasından", "Korkutmanın etkisinin ortadan kalkmasından", "İfadan", "Dava açılmasından", "Korkutmanın öğrenilmesinden"],
    1, "Korkutmada süre, korkutmanın **etkisinin ortadan kalktığı** andan başlar (TBK m. 39)."),
  mcq(I, 3, "Aşağıdakilerden hangisi kural olarak esaslı yanılma sayılmaz?",
    ["Sözleşmenin niteliğinde yanılma", "Konuda yanılma", "Saik yanılması", "Edim miktarında önemli yanılma", "Temel yanılması"],
    2, "**Saik yanılması** kural olarak esaslı değildir. Temel yanılması bunun istisnasıdır (TBK m. 32, m. 31/1-e)."),
  mcq(I, 4, "Üçüncü kişinin korkutmasıyla sözleşme yapan tarafın iptal hakkı için karşı tarafın korkutmayı bilmesi gerekir mi?",
    ["Evet", "Hayır", "Yalnızca ağır korkutmada", "Yalnızca bağışlamada", "Yalnızca tüketici sözleşmelerinde"],
    1, "Üçüncü kişinin aldatmasında karşı tarafın bilmesi aranır; üçüncü kişinin **korkutmasında aranmaz** (TBK m. 37/1)."),
  mcq(A, 1, "Aşırı yararlanmada zarar gören, sözleşmenin kurulmasından itibaren en geç ne kadar süre içinde hakkını kullanabilir?",
    ["1 yıl", "2 yıl", "5 yıl", "10 yıl", "Süre yoktur"],
    2, "Öğrenmeden itibaren 1 yıl, **her hâlde kuruluştan itibaren 5 yıl** (TBK m. 28)."),
  mcq(A, 2, "Aşırı yararlanmada zarar görene TBK ile tanınan yenilik hangisidir?",
    ["Tazminat isteme", "Sözleşmeye bağlı kalarak oransızlığın giderilmesini isteme", "Sözleşmeyi feshetme", "Cezai şart isteme", "Ayıp nedeniyle dönme"],
    1, "Zarar gören, sözleşmeye **bağlı kalarak** edimler arasındaki oransızlığın giderilmesini isteyebilir (TBK m. 28/1)."),
  mcq(H, 1, "Sözleşme kurulduktan sonra edimin imkânsız hâle gelmesi hangi kurumla çözülür?",
    ["Kesin hükümsüzlük", "Sonraki ifa imkânsızlığı", "Aşırı yararlanma", "Yanılma", "Genel işlem koşulları"],
    1, "Kesin hükümsüzlük **başlangıçtaki** imkânsızlıkta söz konusudur. Sonradan ortaya çıkan imkânsızlık ifa imkânsızlığı hükümlerine tabidir (TBK m. 136)."),
  mcq(H, 2, "Kesin hükümsüzlük için aşağıdakilerden hangisi yanlıştır?",
    ["Hâkim kendiliğinden dikkate alır.", "Herkes ileri sürebilir.", "Bir yıllık hak düşürücü süreye tabidir.", "Baştan itibaren hüküm doğurmaz.", "Kısmi hükümsüzlük mümkündür."],
    2, "Kesin hükümsüzlük **süreye bağlı değildir**. Bir yıllık süre irade bozukluklarına ilişkindir (TBK m. 39)."),

  mcq(KT, 1, "Neticeyi öngören ancak gerçekleşmeyeceğine güvenerek hareket eden failin manevi unsuru nedir?",
    ["Doğrudan kast", "Olası kast", "Bilinçli taksir", "Basit taksir", "Netice sebebiyle ağırlaşmış suç"],
    2, "Neticeyi öngörüp **istemeyen** ve gerçekleşmeyeceğine güvenen failde **bilinçli taksir** vardır (TCK m. 22/3)."),
  mcq(KT, 2, "Olası kast hâlinde, ağırlaştırılmış müebbet hapis cezasını gerektiren suçlarda hangi ceza verilir?",
    ["Ağırlaştırılmış müebbet", "Müebbet hapis", "20-25 yıl hapis", "Ceza üçte bir indirilir", "Ceza verilmez"],
    1, "Olası kastta ağırlaştırılmış müebbet yerine **müebbet hapis** cezasına hükmolunur (TCK m. 21/2)."),
  mcq(KT, 3, "Taksirli fiiller hangi durumda cezalandırılır?",
    ["Her zaman", "Kanunun açıkça belirttiği hâllerde", "Yalnızca netice ağırsa", "Hâkimin takdirine göre", "Yalnızca bilinçli taksirde"],
    1, "Taksirle işlenen fiiller, **kanunun açıkça belirttiği** hâllerde cezalandırılır (TCK m. 22/1)."),
  mcq(KT, 4, "Bilinçli taksirde ceza nasıl belirlenir?",
    ["Üçte birden yarısına kadar indirilir", "Üçte birden yarısına kadar artırılır", "Değişmez", "İki katına çıkar", "Ceza verilmez"],
    1, "Bilinçli taksirde taksirli suça ilişkin ceza **üçte birden yarısına kadar artırılır** (TCK m. 22/3)."),
  mcq(MS, 1, "Saldırı sona erdikten sonra saldırgana vurulması hâlinde meşru savunmanın hangi şartı eksiktir?",
    ["Haksızlık", "Güncellik", "Hakka yönelme", "Saldırganın kimliği", "Kast"],
    1, "Saldırının **gerçekleşen, gerçekleşmesi veya tekrarı muhakkak** olması (güncellik) gerekir. Biten saldırıya karşı meşru savunma olmaz."),
  mcq(MS, 2, "Meşru savunmada sınırın mazur görülebilecek korku nedeniyle aşılması hâlinde sonuç nedir?",
    ["Ceza indirilir", "Ceza verilmez", "Ceza artırılır", "Taksirden ceza verilir", "Haksız tahrik uygulanır"],
    1, "Sınırın mazur görülebilecek **heyecan, korku veya telaştan** ileri gelmesi hâlinde faile ceza verilmez (TCK m. 27/2)."),
  mcq(HT, 1, "Suçun kanuni tanımındaki maddi unsurlarda hataya düşen failin durumu nedir?",
    ["Kasten hareket etmiş olur", "Kasten hareket etmiş olmaz; taksirli sorumluluk saklıdır", "Her durumda cezasızdır", "Cezası artırılır", "Olası kastla sorumludur"],
    1, "Maddi unsurları bilmeyen kişi **kasten hareket etmiş olmaz**; taksirli sorumluluk hâli saklıdır (TCK m. 30/1)."),
  mcq(T, 1, "Teşebbüste ceza indirimi (müebbet gerektirmeyen suçlarda) hangi aralıktadır?",
    ["1/6 - 1/3", "1/4 - 3/4", "1/3 - 1/2", "1/2 - 2/3", "İndirim yoktur"],
    1, "Diğer hâllerde verilecek ceza **dörtte birden dörtte üçüne kadar** indirilir (TCK m. 35/2)."),
  mcq(T, 2, "Fail kendi çabasıyla neticenin gerçekleşmesini önlerse ne olur?",
    ["Teşebbüsten cezalandırılır", "Teşebbüsten cezalandırılmaz; tamam olan kısım suçsa ondan cezalandırılır", "Tamamlanmış suçtan cezalandırılır", "Ceza yarı oranında indirilir", "Hiçbir şekilde cezalandırılamaz"],
    1, "**Gönüllü vazgeçme** hâlinde teşebbüsten cezalandırılmaz; tamam olan kısım ayrı bir suçsa yalnız ondan sorumludur (TCK m. 36)."),
  mcq(IS, 1, "Başkasını suç işlemeye azmettiren kişi hangi cezayla cezalandırılır?",
    ["İndirimli ceza", "İşlenen suçun cezası", "Yarı oranında ceza", "Ceza verilmez", "Üçte bir artırılmış ceza"],
    1, "Azmettiren, **işlenen suçun cezası** ile cezalandırılır (TCK m. 38/1)."),
  mcq(IS, 2, "Kusur yeteneği olmayan birini araç olarak kullanan dolaylı failin cezası ne olur?",
    ["İndirilir", "Üçte birden yarısına kadar artırılır", "Değişmez", "Ceza verilmez", "İki katına çıkar"],
    1, "Kusur yeteneği olmayanları araç olarak kullanan kişinin cezası **üçte birden yarısına kadar artırılır** (TCK m. 37/2)."),

  // Olay soruları
  {
    id: `${I}-o01`,
    topic_id: I,
    course_id: "HUK2011",
    kind: "case",
    stem_md: `**Olay:** (A), ikinci el araç satan (B)'den 2018 model bir otomobil satın almıştır. (B), aracın kilometresinin 60.000 olduğunu söylemiş, gösterge de bunu göstermektedir. Satıştan 8 ay sonra servise giden (A), aracın gerçek kilometresinin 190.000 olduğunu ve göstergenin (B) tarafından değiştirildiğini öğrenmiştir. (A), öğrenmesinin üzerinden 14 ay geçtikten sonra sözleşmeyle bağlı olmadığını bildirmek istemektedir.

**Soru:** (A)'nın hukuki durumunu değerlendiriniz.`,
    options: null,
    correct_option: null,
    explanation_md: null,
    rubric: [
      { point: "Olayda aldatmanın (hile) unsurlarının gerçekleştiğini tespit etme", weight: 25, madde_ref: "TBK m. 36" },
      { point: "Aldatmada yanılmanın esaslı olmasının gerekmediğini belirtme", weight: 15, madde_ref: "TBK m. 36/1" },
      { point: "Bir yıllık hak düşürücü sürenin öğrenmeden başladığını belirtme", weight: 25, madde_ref: "TBK m. 39" },
      { point: "Süre geçtiği için sözleşmenin onaylanmış sayıldığı sonucuna varma", weight: 20, madde_ref: "TBK m. 39" },
      { point: "Onaylama hâlinde de tazminat isteme hakkının saklı olduğunu tartışma", weight: 15, madde_ref: "TBK m. 39/2" },
    ],
    model_answer_md: `**1. Aldatma:** (B), kilometre göstergesini değiştirerek (A)'yı bilerek yanıltmıştır. Bu, TBK m. 36/1 anlamında **aldatmadır**. Aldatmada yanılmanın esaslı olması gerekmez; (A)'nın aldatma sonucu sözleşme yaptığı açıktır.

**2. Süre:** Aldatma nedeniyle sözleşmeyle bağlı olmadığını bildirme hakkı, aldatmanın **öğrenildiği andan itibaren bir yıl** içinde kullanılmalıdır (TBK m. 39/1). Bu süre **hak düşürücü** süredir.

**3. Sonuç:** (A) öğrenmesinden 14 ay sonra bildirimde bulunmak istediği için süre geçmiştir; sözleşme **onaylanmış sayılır**. Ancak TBK m. 39/2 uyarınca, aldatma veya korkutma nedeniyle onaylanmış sayılan sözleşmede de **tazminat isteme hakkı ortadan kalkmaz**. (A), uğradığı zararın giderilmesini isteyebilir.`,
    origin: "bank",
    note_id: null,
  },
  {
    id: `${KT}-o01`,
    topic_id: KT,
    course_id: "HUK2013",
    kind: "case",
    stem_md: `**Olay:** (F), gece saatlerinde yerleşim yeri içinde, yaya geçidi bulunan ve kalabalık bir caddede saatte 140 km hızla araç kullanmaktadır. Arkadaşı "Yavaşla, birine çarpacaksın" dediğinde (F), "Çarparsam çarparım, yetişmem lazım" diye cevap vermiş ve hızını düşürmemiştir. Kısa süre sonra yaya geçidinden geçen (Y)'ye çarpmış, (Y) hayatını kaybetmiştir.

**Soru:** (F)'nin ceza sorumluluğunu manevi unsur bakımından değerlendiriniz.`,
    options: null,
    correct_option: null,
    explanation_md: null,
    rubric: [
      { point: "Neticenin öngörüldüğünü tespit etme", weight: 20, madde_ref: "TCK m. 21/2" },
      { point: "Olası kast ile bilinçli taksir ayrımını yapma", weight: 30, madde_ref: "TCK m. 22/3" },
      { point: "'Çarparsam çarparım' sözünü kabullenme olarak değerlendirme", weight: 25, madde_ref: "TCK m. 21/2" },
      { point: "Olası kastla öldürme ve ceza indirimi sonucuna varma", weight: 25, madde_ref: "TCK m. 81, 21/2" },
    ],
    model_answer_md: `**1. Öngörme:** (F), arkadaşının uyarısıyla birine çarpabileceğini açıkça **öngörmüştür**. Bu nedenle basit taksir söz konusu olamaz.

**2. Olası kast mı, bilinçli taksir mi?** Her ikisinde de netice öngörülür. Ayrım, failin neticeyi **kabullenip kabullenmediğinde**dir. Bilinçli taksirde fail neticenin gerçekleşmeyeceğine güvenir (TCK m. 22/3); olası kastta ise "olursa olsun" diyerek kabullenir (TCK m. 21/2).

**3. Değerlendirme:** (F)'nin "Çarparsam çarparım" sözü neticeyi **kabullendiğini** gösterir. Bu nedenle (F), **olası kastla insan öldürme** suçundan sorumludur (TCK m. 81, 21/2). Kasten öldürmenin cezası müebbet hapis olduğundan, olası kast nedeniyle **20-25 yıl** hapis cezasına hükmolunur.`,
    origin: "bank",
    note_id: null,
  },
];

// ------------------------------------------------------------------ KARTLAR

let kc = 0;
const card = (topic_id: string, front_md: string, back_md: string): Flashcard => ({
  id: `${topic_id}-k${String(++kc).padStart(2, "0")}`,
  topic_id,
  course_id: topic_id.slice(0, 7),
  front_md,
  back_md,
  origin: "bank",
  note_id: null,
});

export const flashcards: Flashcard[] = [
  card(K, "Sözleşme nasıl kurulur?", "Tarafların iradelerini **karşılıklı ve birbirine uygun** olarak açıklamalarıyla (TBK m. 1)."),
  card(K, "Fiyatıyla sergilenen mal öneri midir?", "**Evet**, kural olarak öneridir (TBK m. 8/2). Fiyat listesi gönderimi ise öneri değildir."),
  card(K, "Telefonla yapılan süresiz öneri ne zaman kabul edilmelidir?", "**Hemen.** Telefonla doğrudan yapılan öneri hazırlar arasında sayılır (TBK m. 4)."),
  card(K, "Sübjektif esaslı nokta nedir?", "Kanunen ikinci derecede olduğu hâlde, bir tarafın sözleşmenin **şartı olarak açıkça** öne sürdüğü nokta."),
  card(S, "Kanuni şekil kural olarak hangi şekildir?", "**Geçerlilik şekli** (TBK m. 12/2)."),
  card(S, "İradi şeklin sonucu nedir?", "Şekle uyulmadıkça tarafların **bağlanmak istemedikleri** varsayılır (TBK m. 17)."),
  card(G, "GİK denetiminin üç aşaması?", "1. Yürürlük denetimi\n2. Yorum denetimi\n3. İçerik denetimi"),
  card(G, "Belirsiz GİK hükmü kimin aleyhine yorumlanır?", "**Düzenleyenin** aleyhine (TBK m. 23)."),
  card(I, "Aldatmada yanılma esaslı olmalı mı?", "**Hayır.** Yanılma esaslı olmasa bile sözleşmeyle bağlı değildir (TBK m. 36/1)."),
  card(I, "İrade bozukluklarında hak düşürücü süre?", "**1 yıl.** Yanılma/aldatmada öğrenmeden, korkutmada etkinin kalkmasından itibaren (TBK m. 39)."),
  card(I, "Temel yanılması nedir?", "Dürüstlük kuralına göre sözleşmenin **zorunlu temeli** sayılan bir durumda yanılma. Saik yanılmasının esaslı sayılan istisnası."),
  card(I, "Hesap yanlışlığı sözleşmeyi geçersiz kılar mı?", "**Hayır**, düzeltilir (TBK m. 33)."),
  card(A, "Aşırı yararlanmanın unsurları?", "1. Açık oransızlık\n2. Zarar görende zor durum, düşüncesizlik veya deneyimsizlik\n3. Bundan yararlanma"),
  card(A, "Aşırı yararlanmada süreler?", "Öğrenmeden itibaren **1 yıl**, her hâlde kuruluştan itibaren **5 yıl** (TBK m. 28)."),
  card(H, "Kesin hükümsüzlük sebepleri?", "Emredici hükümlere, ahlaka, kamu düzenine, kişilik haklarına aykırılık ve **konunun imkânsızlığı** (TBK m. 27/1)."),
  card(KT, "Kastın tanımı?", "Suçun kanuni tanımındaki unsurların **bilerek ve istenerek** gerçekleştirilmesi (TCK m. 21/1)."),
  card(KT, "Olası kast ile bilinçli taksirin farkı?", "İkisinde de netice öngörülür. Olası kastta **kabullenilir**, bilinçli taksirde **gerçekleşmeyeceğine güvenilir**."),
  card(KT, "Bilinçli taksirde ceza?", "Taksirli suç cezası **1/3'ten 1/2'ye kadar artırılır** (TCK m. 22/3)."),
  card(MS, "Meşru savunmada saldırıya ilişkin şartlar?", "Haksız, bir hakka yönelik, **gerçekleşen, gerçekleşmesi veya tekrarı muhakkak** saldırı."),
  card(HT, "Unsurda hata neyi kaldırır?", "**Kastı** kaldırır; taksirli sorumluluk saklıdır (TCK m. 30/1)."),
  card(T, "Teşebbüsün unsurları?", "Kast, elverişli hareket, doğrudan doğruya icraya başlama, elde olmayan nedenlerle tamamlanamama."),
  card(IS, "Azmettirme ile yardım etme farkı?", "Azmettirmede suç kararı **uyandırılır**, faille aynı ceza. Yardımda karar **kuvvetlendirilir**, ceza indirilir."),
];

// ------------------------------------------------------------------ TABLOLAR

export const tables: ComparisonTable[] = [
  {
    id: "HUK2011-t01",
    course_id: "HUK2011",
    title: "Yanılma, aldatma ve korkutma",
    columns: ["", "Yanılma", "Aldatma", "Korkutma"],
    rows: [
      ["Madde", "TBK m. 30-35", "TBK m. 36", "TBK m. 37-38"],
      ["Esaslılık şartı", "Esaslı olmalı", "Aranmaz", "Ağır ve yakın tehlike"],
      ["Üçüncü kişiden gelirse", "—", "Karşı taraf biliyor veya bilmesi gerekiyorsa", "Karşı tarafın bilmesi aranmaz"],
      ["Süre başlangıcı", "Öğrenme", "Öğrenme", "Etkinin kalkması"],
      ["Süre", "1 yıl", "1 yıl", "1 yıl"],
      ["Tazminat", "Kusurlu yanılanın sorumluluğu (m. 35)", "Onayda bile saklı (m. 39/2)", "Onayda bile saklı (m. 39/2)"],
    ],
    related_topic_ids: [I],
  },
  {
    id: "HUK2011-t02",
    course_id: "HUK2011",
    title: "Kesin hükümsüzlük ve iptal edilebilirlik",
    columns: ["", "Kesin hükümsüzlük", "İptal edilebilirlik"],
    rows: [
      ["Sebep", "TBK m. 27 (emredici hüküm, ahlak, kamu düzeni, imkânsızlık)", "İrade bozuklukları, aşırı yararlanma"],
      ["Kim ileri sürer", "Herkes", "Yalnızca irade bozukluğuna uğrayan"],
      ["Hâkim kendiliğinden", "Evet", "Hayır"],
      ["Süre", "Yok", "1 yıl (aşırı yararlanmada ayrıca 5 yıl)"],
      ["Onayla geçerlilik", "Kural olarak hayır", "Evet"],
    ],
    related_topic_ids: [H, I, A],
  },
  {
    id: "HUK2013-t01",
    course_id: "HUK2013",
    title: "Kast türleri ve taksir",
    columns: ["", "Doğrudan kast", "Olası kast", "Bilinçli taksir", "Basit taksir"],
    rows: [
      ["Madde", "TCK m. 21/1", "TCK m. 21/2", "TCK m. 22/3", "TCK m. 22/2"],
      ["Neticeyi öngörme", "Var", "Var", "Var", "Yok"],
      ["İrade", "İster", "Kabullenir", "İstemez, güvenir", "—"],
      ["Ceza etkisi", "Temel ceza", "İndirilir", "1/3 - 1/2 artırılır", "Temel taksir cezası"],
    ],
    related_topic_ids: [KT],
  },
];

export const fixtureKb: KbExport = {
  version: "fixture-2026-10-16",
  courses,
  units,
  topics,
  questions,
  flashcards,
  tables,
};
