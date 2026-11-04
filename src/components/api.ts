import { hasMessage, type Translate } from "@/i18n";

/** Sunucu hatası; `code` varsa istemci dile göre çevirir, yoksa Türkçe mesaj gösterilir. */
export class ApiError extends Error {
  constructor(message: string, public readonly code: string | null) {
    super(message);
  }
}

/** JSON gövdeli POST; hata yanıtındaki `error` ve `code` alanlarını `ApiError` olarak fırlatır. */
export async function post<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Sunucuya ulaşılamadı.", "network");
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
    throw new ApiError(data?.error ?? "Sunucuya ulaşılamadı.", data?.code ?? (data?.error ? null : "network"));
  }
  return response.json() as Promise<T>;
}

/** Hatanın kullanıcıya gösterilecek metni, mümkünse çevrilmiş. */
export function errorText(t: Translate, error: unknown): string {
  if (error instanceof ApiError && error.code) {
    const key = `error.${error.code}`;
    if (hasMessage(key)) return t(key);
  }
  return error instanceof Error ? error.message : t("error.network");
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
