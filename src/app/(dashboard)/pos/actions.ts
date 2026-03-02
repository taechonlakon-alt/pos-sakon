'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPOSProducts() {
    const supabase = await createClient()

    // Fetch products with their categories and remaining stock
    const { data, error } = await supabase
        .from('products')
        .select(`
      id, name, sku, sell_price, category_id,
      categories (id, name),
      purchase_lots (quantity_remaining)
    `)
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)

    // Calculate total stock remaining per product
    const productsWithStock = data.map((product: any) => {
        let totalStock = 0;
        if (product.purchase_lots) {
            totalStock = product.purchase_lots.reduce((acc: number, lot: any) => acc + lot.quantity_remaining, 0)
        }

        return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            sell_price: product.sell_price,
            category_id: product.category_id,
            category_name: product.categories?.name || 'ไม่มีหมวดหมู่',
            totalStock
        }
    })

    // Group by category for easier display
    const categorizedProducts: Record<string, any[]> = {}
    productsWithStock.forEach(p => {
        const cat = p.category_name
        if (!categorizedProducts[cat]) categorizedProducts[cat] = []
        categorizedProducts[cat].push(p)
    })

    return { products: productsWithStock, categorizedProducts }
}

export async function processCheckout(cartItems: { product_id: string, quantity: number, sell_price: number }[]) {
    const supabase = await createClient()

    // Call the Supabase RPC function we created in schema
    const { data, error } = await supabase.rpc('process_checkout', {
        checkout_items: cartItems
    })

    if (error) {
        throw new Error(error.message)
    }

    // Refresh products page and POS page to update stock
    revalidatePath('/pos')
    revalidatePath('/products')
    revalidatePath('/admin')
    revalidatePath('/reports')

    return data // returns the new sale_id
}
