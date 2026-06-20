-- Categories
INSERT INTO categories (id, name, sort_order, created_at) VALUES
  ('cat-rebon',  'Peyek Rebon',                   1, '2026-06-20T00:00:00.000Z'),
  ('cat-kacang', 'Peyek Kacang Tanah',             2, '2026-06-20T00:00:00.000Z'),
  ('cat-anti',   'Peyek Varian Anti Mainstream',   3, '2026-06-20T00:00:00.000Z');

-- Variants
INSERT INTO product_variants (id, label, sort_order) VALUES
  ('v-250g',    '250 gram',          1),
  ('v-premium', 'Premium Pack',      2),
  ('v-500g',    '500 gram',          3);

-- Products: Peyek Rebon
INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, is_active, sort_order, created_at, updated_at) VALUES
  ('p-rebon-250',     'cat-rebon', 'v-250g',    25000, 30000, NULL, 1, 1, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
  ('p-rebon-premium', 'cat-rebon', 'v-premium', 18000, 20000, NULL, 1, 2, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
  ('p-rebon-500',     'cat-rebon', 'v-500g',    35000, 45000, NULL, 1, 3, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z');

-- Products: Peyek Kacang Tanah
INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, is_active, sort_order, created_at, updated_at) VALUES
  ('p-kacang-500',     'cat-kacang', 'v-500g',    35000, 45000, NULL, 1, 1, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
  ('p-kacang-250',     'cat-kacang', 'v-250g',    25000, 30000, NULL, 1, 2, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
  ('p-kacang-premium', 'cat-kacang', 'v-premium', 18000, 20000, NULL, 1, 3, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z');

-- Products: Peyek Varian Anti Mainstream
INSERT INTO products (id, category_id, variant_id, price, original_price, image_url, is_active, sort_order, created_at, updated_at) VALUES
  ('p-anti-500', 'cat-anti', 'v-500g', 45000, 50000, NULL, 1, 1, '2026-06-20T00:00:00.000Z', '2026-06-20T00:00:00.000Z');
