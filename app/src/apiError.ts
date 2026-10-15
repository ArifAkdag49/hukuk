/** API hataları ve kullanıcıya gösterilecek Türkçe mesajlar. */

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
  /** İnternet yok / sunucuya ulaşılamadı. */
  get offline() {
    return this.status === 0;
  }
}

export function userMessage(status: number, detail?: string): string {
  switch (status) {
    case 0:
      return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.";
    case 401:
      return "Oturumun sona erdi. Yeniden giriş yap.";
    case 402:
      return "Bu ayın API limiti doldu. Okuma, quiz ve kartlar çalışmaya devam ediyor.";
    case 408:
      return "Sunucu zamanında cevap vermedi. Biraz sonra tekrar dene.";
    case 413:
      return "Dosya çok büyük (en fazla 20 MB / 50 sayfa). Dosyayı bölüp tekrar yükle.";
    case 429:
      return "Çok fazla deneme yapıldı. Bir dakika bekleyip tekrar dene.";
    default:
      if (status >= 500) return "Sunucuda bir sorun oluştu. Biraz sonra tekrar dene.";
      return detail || "İstek tamamlanamadı. Tekrar dene.";
  }
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Beklenmeyen bir hata oluştu.";
}
