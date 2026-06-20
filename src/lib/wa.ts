export interface WaOrderParams {
  displayName: string;
  qty: number;
  waNumber: string;
}

export function buildWaOrderUrl(params: WaOrderParams): string {
  const message = `Halo, saya mau pesan:\n- ${params.displayName} x${params.qty}\nApakah stok tersedia?`;
  return `https://wa.me/${params.waNumber}?text=${encodeURIComponent(message)}`;
}

export function formatRupiah(price: number): string {
  const formatted = price.toLocaleString('id-ID');
  return `Rp ${formatted}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
