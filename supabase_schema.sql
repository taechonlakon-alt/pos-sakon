-- ==============================================================================
-- 1. Create Enums and Tables
-- ==============================================================================

-- Create User Role enum
CREATE TYPE user_role AS ENUM ('admin', 'staff');

-- Create Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Categories Table
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Products Table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sell_price NUMERIC(10, 2) NOT NULL CHECK (sell_price >= 0),
  low_stock_alert INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Purchase Lots Table (for FIFO tracking)
CREATE TABLE public.purchase_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
  quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Sales Table
CREATE TABLE public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Sale Items Table (details of each sale)
CREATE TABLE public.sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sell_price NUMERIC(10, 2) NOT NULL CHECK (sell_price >= 0),
  cost_price NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
  profit NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 2. Security Functions (RLS Helpers)
-- ==============================================================================

-- Function to check if the current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- users overrides
CREATE POLICY "Admin can completely manage users" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (id = auth.uid());

-- categories overrides
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- products overrides
CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can manage products" ON public.products FOR ALL USING (public.is_admin());

-- purchase_lots overrides (THE SECRET SAUCE)
-- Only Admin can see/edit cost prices and purchase lots directly. Staff gets blocked.
CREATE POLICY "Admin can manage purchase_lots" ON public.purchase_lots FOR ALL USING (public.is_admin());

-- sales overrides
CREATE POLICY "Admin can manage sales" ON public.sales FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can read own sales" ON public.sales FOR SELECT USING (auth.uid() = created_by);
-- (We don't need Staff insert policy because insertion happens via RPC)

-- sale_items overrides
CREATE POLICY "Admin can manage sale_items" ON public.sale_items FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can read own sale_items" ON public.sale_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sales WHERE id = sale_id AND created_by = auth.uid())
);

-- ==============================================================================
-- 4. Supabase Functions (RPC)
-- ==============================================================================

-- FIFO Checkout Function
-- SECURITY DEFINER bypasses RLS so it can read/deduct purchase_lots without staff needing read access
CREATE OR REPLACE FUNCTION process_checkout(
  checkout_items JSONB -- Format: [{"product_id": "uuid", "quantity": int, "sell_price": numeric}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_sale_id UUID;
  total_sale_amount NUMERIC := 0;
  total_sale_profit NUMERIC := 0;
  
  item JSONB;
  p_id UUID;
  qty_needed INT;
  selling_price NUMERIC;
  
  lot RECORD;
  qty_deducted INT;
  item_profit NUMERIC;
  
  total_item_cost NUMERIC;
BEGIN
  -- 1. Create Sale Record
  INSERT INTO public.sales (created_by, total_amount, total_profit)
  VALUES (auth.uid(), 0, 0)
  RETURNING id INTO new_sale_id;

  -- 2. Process Each Item
  FOR item IN SELECT * FROM jsonb_array_elements(checkout_items)
  LOOP
    p_id := (item->>'product_id')::UUID;
    qty_needed := (item->>'quantity')::INT;
    selling_price := (item->>'sell_price')::NUMERIC;
    
    total_sale_amount := total_sale_amount + (selling_price * qty_needed);
    total_item_cost := 0;
    
    -- FIFO Deduction from purchase_lots
    FOR lot IN 
      SELECT * FROM public.purchase_lots 
      WHERE product_id = p_id AND quantity_remaining > 0 
      ORDER BY created_at ASC 
      FOR UPDATE -- Lock rows to prevent race conditions
    LOOP
      IF qty_needed <= 0 THEN
        EXIT;
      END IF;
      
      IF lot.quantity_remaining <= qty_needed THEN
        qty_deducted := lot.quantity_remaining;
      ELSE
        qty_deducted := qty_needed;
      END IF;
      
      -- Deduct from lot
      UPDATE public.purchase_lots
      SET quantity_remaining = quantity_remaining - qty_deducted
      WHERE id = lot.id;
      
      -- Accumulate exact cost for exact profit calculation
      total_item_cost := total_item_cost + (qty_deducted * lot.cost_price);
      qty_needed := qty_needed - qty_deducted;
    END LOOP;
    
    -- Check if we fulfilled requested quantity
    IF qty_needed > 0 THEN
      RAISE EXCEPTION 'Not enough stock for product_id: %', p_id;
    END IF;
    
    -- Calculate item profit
    item_profit := (selling_price * ((item->>'quantity')::INT)) - total_item_cost;
    total_sale_profit := total_sale_profit + item_profit;
    
    -- Insert Sale Item
    INSERT INTO public.sale_items (
      sale_id, product_id, quantity, sell_price, cost_price, profit
    ) VALUES (
      new_sale_id, p_id, (item->>'quantity')::INT, selling_price, total_item_cost / ((item->>'quantity')::INT), item_profit
    );
      
  END LOOP;

  -- 3. Update final sale totals
  UPDATE public.sales
  SET total_amount = total_sale_amount,
      total_profit = total_sale_profit
  WHERE id = new_sale_id;

  RETURN new_sale_id;
END;
$$;

-- ==============================================================================
-- 5. User Creation Trigger (Optional but recommended)
-- Automatically add user to public.users on sign-up
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, role)
  -- By default assign new users to staff, you can manually update Admin role directly in DB
  VALUES (new.id, 'staff');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
