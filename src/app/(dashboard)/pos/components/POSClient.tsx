'use client'

import { useState, useMemo } from 'react'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { processCheckout } from '../actions'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type Product = {
    id: string
    name: string
    sku: string
    sell_price: number
    category_id: string
    category_name: string
    totalStock: number
}

type CartItem = Product & {
    cartQuantity: number
}

export default function POSClient({
    products,
    categorizedProducts
}: {
    products: Product[]
    categorizedProducts: Record<string, Product[]>
}) {
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('All')
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    const categories = ['All', ...Object.keys(categorizedProducts)]

    // Filter products based on search and selected category
    const displayProducts = useMemo(() => {
        let filtered = products

        if (activeCategory !== 'All') {
            filtered = categorizedProducts[activeCategory] || []
        }

        if (search.trim()) {
            const s = search.toLowerCase()
            filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
        }

        return filtered
    }, [products, categorizedProducts, activeCategory, search])

    // Cart logic
    const addToCart = (product: Product) => {
        if (product.totalStock <= 0) {
            toast.error('สินค้าในสต็อกหมดแล้ว')
            return
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                if (existing.cartQuantity >= product.totalStock) {
                    toast.error('จำนวนสินค้าในคลังไม่เพียงพอ')
                    return prev
                }
                return prev.map(item =>
                    item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
                )
            }
            return [...prev, { ...product, cartQuantity: 1 }]
        })
    }

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQuantity = item.cartQuantity + delta
                if (newQuantity > item.totalStock) {
                    toast.error('จำนวนสินค้าเกินสต็อกที่มี')
                    return item
                }
                if (newQuantity <= 0) return item // handled by remove logic
                return { ...item, cartQuantity: newQuantity }
            }
            return item
        }))
    }

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id))
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.sell_price * item.cartQuantity), 0)

    // Handle Checkout
    const handleCheckout = async () => {
        if (cart.length === 0) return
        setIsProcessing(true)

        try {
            // Prepare payload
            const payload = cart.map(item => ({
                product_id: item.id,
                quantity: item.cartQuantity,
                sell_price: item.sell_price // we send sell price so process_checkout knows exactly what was charged
            }))

            await processCheckout(payload)
            toast.success('ทำรายการขายเรียบร้อยแล้ว')
            setCart([]) // clear cart
            setIsCheckoutModalOpen(false)
            // Hard refresh to update stock counts safely
            window.location.reload()
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาดในการขาย: ' + error.message)
            setIsProcessing(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col xl:flex-row gap-6">

            {/* ---------------- LEFT SIDE: PRODUCTS ---------------- */}
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow border overflow-hidden">
                {/* Header / Search / Filter */}
                <div className="p-4 border-b space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border w-full sm:max-w-md">
                            <Search className="h-5 w-5 text-gray-400 ml-2" />
                            <Input
                                placeholder="ค้นหาสินค้า หรือ SKU..."
                                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Categories Horizontal Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={activeCategory === cat ? 'default' : 'outline'}
                                size="sm"
                                className="whitespace-nowrap rounded-full"
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 max-h-[50vh] xl:max-h-none">
                    {displayProducts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            ไม่มีสินค้าแสดงผล
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {displayProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className={`cursor-pointer hover:border-primary transition-all relative overflow-hidden group ${product.totalStock <= 0 ? 'opacity-50 grayscale' : ''}`}
                                    onClick={() => addToCart(product)}
                                >
                                    <CardContent className="p-4 flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded">{product.sku}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.totalStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {product.totalStock > 0 ? `เหลือ ${product.totalStock}` : 'หมด'}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{product.name}</h3>
                                        </div>

                                        <div className="mt-4 pt-3 border-t flex justify-between items-end">
                                            <span className="text-xs text-gray-500">{product.category_name}</span>
                                            <span className="font-bold text-primary text-lg">฿{product.sell_price.toLocaleString()}</span>
                                        </div>

                                        {/* Hover Overlay */}
                                        {product.totalStock > 0 && (
                                            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="secondary" className="shadow-md pointer-events-none">
                                                    <ShoppingCart className="mr-2 h-4 w-4" /> เลือก
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>


            {/* ---------------- RIGHT SIDE: CART ---------------- */}
            <div className="w-full xl:w-[450px] 2xl:w-[500px] bg-white rounded-lg shadow border flex flex-col h-[50vh] xl:h-auto">
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-bold flex items-center">
                        <ShoppingCart className="mr-2 h-5 w-5" /> ตะกร้าสินค้า
                        <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                            {cart.reduce((s, i) => s + i.cartQuantity, 0)} ชิ้น
                        </span>
                    </h2>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <ShoppingCart className="h-12 w-12 opacity-20" />
                            <p>ยังไม่มีสินค้าในตะกร้า</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex gap-3 bg-white border p-3 rounded-lg shadow-sm">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                                    <div className="text-primary font-semibold text-sm mt-1">
                                        ฿{(item.sell_price * item.cartQuantity).toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end justify-between">
                                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                        <Trash2 className="h-4 w-4" />
                                    </button>

                                    <div className="flex items-center space-x-2 mt-2 bg-gray-100 rounded-md p-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            disabled={item.cartQuantity <= 1}
                                            className="text-gray-600 hover:bg-white rounded p-0.5 disabled:opacity-30"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="text-sm font-semibold w-4 text-center select-none">{item.cartQuantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            disabled={item.cartQuantity >= item.totalStock}
                                            className="text-gray-600 hover:bg-white rounded p-0.5 disabled:opacity-30"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-lg space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>ยอดรวมทั้งสิ้น</span>
                        <span className="text-2xl text-primary">฿{cartTotal.toLocaleString()}</span>
                    </div>
                    <Button
                        className="w-full h-12 text-lg font-bold"
                        disabled={cart.length === 0 || isProcessing}
                        onClick={() => setIsCheckoutModalOpen(true)}
                    >
                        <CreditCard className="mr-2 h-5 w-5" />
                        ชำระเงิน
                    </Button>
                </div>
            </div>

            {/* ---------------- CHECKOUT CONFIRMATION MODAL ---------------- */}
            <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>ยืนยันการชำระเงิน</DialogTitle>
                        <DialogDescription>
                            ตรวจสอบยอดสินค้ารวมก่อนทำการบันทึกและตัดสต็อก
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center space-y-2 border">
                            <span className="text-gray-500">ยอดชำระสุทธิ</span>
                            <span className="text-4xl font-bold text-primary">฿{cartTotal.toLocaleString()}</span>
                            <span className="text-sm text-gray-500 pt-2">จำนวน {cart.reduce((s, i) => s + i.cartQuantity, 0)} ชิ้น</span>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCheckoutModalOpen(false)} disabled={isProcessing} className="w-full sm:w-auto">
                            ยกเลิก
                        </Button>
                        <Button type="button" onClick={handleCheckout} disabled={isProcessing} className="w-full sm:w-auto">
                            {isProcessing ? 'กำลังประมวลผลระบบ FIFO...' : 'บันทึกการขาย (ตัดสต็อก)'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
