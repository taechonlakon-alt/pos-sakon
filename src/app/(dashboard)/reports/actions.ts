'use server'

import { createClient } from '@/utils/supabase/server'

export async function getReportsData() {
    const supabase = await createClient()

    // 1. Fetch All Sales
    const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount, total_profit, created_at, created_by')
        .order('created_at', { ascending: false })

    if (salesError) throw new Error(salesError.message)

    // 2. Fetch Sales by Category (from sale_items joined with products & categories)
    const { data: categoryDataRaw, error: categoryError } = await supabase
        .from('sale_items')
        .select(`
      quantity,
      profit,
      sell_price,
      products (
        category_id,
        categories (name)
      )
    `)

    if (categoryError) throw new Error(categoryError.message)

    // Aggregate by Category
    const categoryAggs: Record<string, { name: string, sales: number, profit: number, units: number }> = {}

    categoryDataRaw.forEach((item: any) => {
        const catName = item.products?.categories?.name || 'ไม่มีหมวดหมู่'
        if (!categoryAggs[catName]) {
            categoryAggs[catName] = { name: catName, sales: 0, profit: 0, units: 0 }
        }
        categoryAggs[catName].sales += (item.sell_price * item.quantity)
        categoryAggs[catName].profit += Number(item.profit)
        categoryAggs[catName].units += item.quantity
    })

    // 3. Find Dead Stock (Products with no sales in the last 60 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    // Get products that have stock
    const { data: stockedProducts, error: stockError } = await supabase
        .from('products')
        .select(`
      id, name, sku,
      purchase_lots (quantity_remaining)
    `)

    if (stockError) throw new Error(stockError.message)

    const productsWithPositiveStock = stockedProducts.map(p => {
        const totalStock = p.purchase_lots?.reduce((sum: number, lot: any) => sum + Number(lot.quantity_remaining), 0) || 0
        return { ...p, totalStock }
    }).filter(p => p.totalStock > 0)

    // Get recently sold product IDs
    const { data: recentSalesGroups, error: recentSalesError } = await supabase
        .from('sale_items')
        .select('product_id')
        .gte('created_at', sixtyDaysAgo.toISOString())

    if (recentSalesError) throw new Error(recentSalesError.message)

    const recentlySoldIds = new Set(recentSalesGroups.map(s => s.product_id))

    // Dead stock = Has stock but hasn't sold in 60 days
    const deadStock = productsWithPositiveStock.filter(p => !recentlySoldIds.has(p.id))

    return {
        sales: salesData,
        categoryStats: Object.values(categoryAggs).sort((a, b) => b.sales - a.sales),
        deadStock
    }
}
