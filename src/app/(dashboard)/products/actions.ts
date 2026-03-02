'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Categories
export async function getCategories() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) throw new Error(error.message)
    return data
}

export async function createCategory(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('categories').insert([{ name }]).select().single()
    if (error) throw new Error(error.message)
    revalidatePath('/products')
    return data
}

// Products
export async function getProducts() {
    const supabase = await createClient()

    // Also fetch the total stock from purchase_lots for each product
    const { data, error } = await supabase
        .from('products')
        .select(`
      *,
      categories (id, name),
      purchase_lots (quantity_remaining)
    `)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Calculate total stock remaining per product
    const productsWithStock = data.map((product: any) => {
        let totalStock = 0;
        if (product.purchase_lots) {
            totalStock = product.purchase_lots.reduce((acc: number, lot: any) => acc + lot.quantity_remaining, 0)
        }
        return {
            ...product,
            totalStock
        }
    })

    return productsWithStock
}

export async function createProduct(productData: any) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').insert([productData]).select().single()
    if (error) throw new Error(error.message)
    revalidatePath('/products')
    return data
}

export async function updateProduct(id: string, productData: any) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').update(productData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    revalidatePath('/products')
    return data
}

export async function deleteProduct(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/products')
}

// Purchase Lots (For Admins)
export async function addPurchaseLot(product_id: string, cost_price: number, quantity: number) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('purchase_lots').insert([{
        product_id,
        cost_price,
        quantity_remaining: quantity
    }]).select().single()

    if (error) throw new Error(error.message)
    revalidatePath('/products')
    return data
}

export async function getPurchaseLots(product_id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('purchase_lots').select('*').eq('product_id', product_id).order('created_at', { ascending: true })
    if (error) return [] // If staff tries to access, RLS blocks it, return empty.
    return data
}
