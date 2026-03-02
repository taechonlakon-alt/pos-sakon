'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDashboardStats() {
    const supabase = await createClient()

    // 1. Today's Sales & Profit
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isoToday = today.toISOString()

    const { data: todaySales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, total_profit')
        .gte('created_at', isoToday)

    if (salesError) throw new Error( salesError.message)

    const dailySales = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
    const dailyProfit = todaySales.reduce((sum, sale) => sum + Number(sale.total_profit), 0)
    const salesCount = todaySales.length

    // 2. Low Stock Alerts
    const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select(`
      id, name, sku, low_stock_alert,
      purchase_lots (quantity_remaining)
    `)

    if (lowStockError) throw new Error(lowStockError.message)

    const itemsNeedingRestock = lowStockProducts.map(p => {
        const totalStock = p.purchase_lots?.reduce((sum: number, lot: any) => sum + Number(lot.quantity_remaining), 0) || 0
        return {
            ...p,
            totalStock
        }
    }).filter(p => p.totalStock <= p.low_stock_alert)

    // 3. Best Selling Products (All time for now, or could restrict to last 30 days)
    const { data: popularItems, error: popularError } = await supabase
        .from('sale_items')
        .select(`
      quantity,
      products (name)
    `)

    if (popularError) throw new Error(popularError.message)

    const salesByProduct: Record<string, number> = {}
    popularItems.forEach((item: any) => {
        const name = item.products?.name || 'Unknown'
        salesByProduct[name] = (salesByProduct[name] || 0) + item.quantity
    })

    const bestSellers = Object.entries(salesByProduct)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

    // 4. Sales over last 7 days (for chart)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: chartDataRaw, error: chartError } = await supabase
        .from('sales')
        .select('created_at, total_amount, total_profit')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

    if (chartError) throw new Error(chartError.message)

    const dailyAggs: Record<string, { date: string, sales: number, profit: number }> = {}
    chartDataRaw.forEach((sale: any) => {
        // format as YYYY-MM-DD
        const dateStr = new Date(sale.created_at).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })
        if (!dailyAggs[dateStr]) {
            dailyAggs[dateStr] = { date: dateStr, sales: 0, profit: 0 }
        }
        dailyAggs[dateStr].sales += Number(sale.total_amount)
        dailyAggs[dateStr].profit += Number(sale.total_profit)
    })

    const chartData = Object.values(dailyAggs)

    return {
        dailySales,
        dailyProfit,
        salesCount,
        itemsNeedingRestock,
        bestSellers,
        chartData
    }
}
