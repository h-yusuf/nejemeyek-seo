export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string;
  variant_id: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  description: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  category: Category;
  variant: ProductVariant;
  displayName: string; // "${category.name} ${variant.label}"
}
