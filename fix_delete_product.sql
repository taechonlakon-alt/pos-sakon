-- 1. Drop the existing foreign key constraint on sale_items
ALTER TABLE public.sale_items
DROP CONSTRAINT sale_items_product_id_fkey;

-- 2. Modify the product_id column to allow NULL values
ALTER TABLE public.sale_items
ALTER COLUMN product_id DROP NOT NULL;

-- 3. Add back the foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.sale_items
ADD CONSTRAINT sale_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 4. Do the same for purchase_lots if we want to keep lot history when a product is deleted
ALTER TABLE public.purchase_lots
DROP CONSTRAINT purchase_lots_product_id_fkey;

ALTER TABLE public.purchase_lots
ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.purchase_lots
ADD CONSTRAINT purchase_lots_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
