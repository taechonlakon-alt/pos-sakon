'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, MoreHorizontal, Edit, Trash2, PackagePlus } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createProduct, updateProduct, deleteProduct, createCategory, addPurchaseLot } from '../actions'

type Product = {
    id: string
    name: string
    sku: string
    sell_price: number
    low_stock_alert: number
    totalStock: number
    categories: { id: string, name: string } | null
}

type Category = {
    id: string
    name: string
}

export default function ProductClient({
    initialProducts,
    categories,
    role
}: {
    initialProducts: Product[]
    categories: Category[]
    role: string
}) {
    const [products, setProducts] = useState(initialProducts)
    const [search, setSearch] = useState('')

    // Modals state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [isLotModalOpen, setIsLotModalOpen] = useState(false)

    // Form state
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)

    // Filter products
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    )

    const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const productData = {
            name: formData.get('name') as string,
            sku: formData.get('sku') as string,
            category_id: formData.get('category_id') as string,
            sell_price: Number(formData.get('sell_price')),
            low_stock_alert: Number(formData.get('low_stock_alert')),
        }

        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, productData)
                toast.success('อัปเดตสินค้าเรียบร้อยแล้ว')
            } else {
                await createProduct(productData)
                toast.success('สร้างสินค้าใหม่เรียบร้อยแล้ว')
            }
            setIsProductModalOpen(false)
            // Note: Ideally refresh data from server here, for now relying on server action revalidatePath
            window.location.reload()
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message)
        }
    }

    const handleDeleteProduct = async (id: string) => {
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
            try {
                await deleteProduct(id)
                toast.success('ลบสินค้าเรียบร้อยแล้ว')
                setProducts(products.filter(p => p.id !== id))
            } catch (error: any) {
                toast.error('เกิดข้อผิดพลาด: ' + error.message)
            }
        }
    }

    const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string

        try {
            await createCategory(name)
            toast.success('เพิ่มหมวดหมู่เรียบร้อยแล้ว')
            setIsCategoryModalOpen(false)
            window.location.reload()
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message)
        }
    }

    const handleLotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        if (!editingProduct) return

        const cost_price = Number(formData.get('cost_price'))
        const quantity = Number(formData.get('quantity'))

        try {
            await addPurchaseLot(editingProduct.id, cost_price, quantity)
            toast.success('เพิ่มล็อตสินค้าใหม่เรียบร้อยแล้ว')
            setIsLotModalOpen(false)
            window.location.reload()
        } catch (error: any) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">การจัดการสินค้า</h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">จัดการข้อมูลสินค้า หมวดหมู่ และสต็อก</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {role === 'admin' && (
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsCategoryModalOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> เพิ่มหมวดหมู่
                        </Button>
                    )}
                    <Button className="w-full sm:w-auto" onClick={() => { setEditingProduct(null); setIsProductModalOpen(true) }}>
                        <Plus className="mr-2 h-4 w-4" /> เพิ่มสินค้าใหม่
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-white p-2 sm:p-4 rounded-lg shadow-sm border">
                <Search className="h-5 w-5 text-gray-400 ml-2" />
                <Input
                    placeholder="ค้นหาสินค้าด้วยชื่อ หรือ รหัส SKU..."
                    className="border-0 shadow-none focus-visible:ring-0 px-0"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="bg-white rounded-lg shadow border overflow-x-auto">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>รหัส SKU</TableHead>
                            <TableHead>ชื่อสินค้า</TableHead>
                            <TableHead>หมวดหมู่</TableHead>
                            <TableHead className="text-right">ราคาขาย</TableHead>
                            <TableHead className="text-right">สต็อกคงเหลือ</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    ไม่พบข้อมูลสินค้า
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.sku}</TableCell>
                                    <TableCell>{product.name}</TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {product.categories?.name || 'ไม่มีหมวดหมู่'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">฿{product.sell_price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={`font-semibold ${product.totalStock <= product.low_stock_alert ? 'text-red-600' : 'text-green-600'}`}>
                                            {product.totalStock}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">เปิดเมนู</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>การจัดการ</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsProductModalOpen(true) }}>
                                                    <Edit className="mr-2 h-4 w-4" /> แก้ไขข้อมูล
                                                </DropdownMenuItem>
                                                {role === 'admin' && (
                                                    <DropdownMenuItem onClick={() => { setEditingProduct(product); setIsLotModalOpen(true) }}>
                                                        <PackagePlus className="mr-2 h-4 w-4" /> เพิ่มล็อตสินค้า (สต็อก)
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteProduct(product.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> ลบสินค้า
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ---------------- PRODUCT MODAL ---------------- */}
            <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'ปรับปรุงรายละเอียดของสินค้านี้' : 'เพิ่มสินค้าใหม่เข้าระบบ (ไม่มีการใส่ต้นทุนตรงนี้)'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleProductSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="name" className="text-sm font-medium">ชื่อสินค้า</label>
                                <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="sku" className="text-sm font-medium">รหัส SKU</label>
                                <Input id="sku" name="sku" defaultValue={editingProduct?.sku} required />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="category_id" className="text-sm font-medium">หมวดหมู่</label>
                                <select
                                    id="category_id"
                                    name="category_id"
                                    defaultValue={editingProduct?.categories?.id}
                                    required
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="" disabled>เลือกหมวดหมู่...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="sell_price" className="text-sm font-medium">ราคาขาย (หน้าร้าน)</label>
                                <Input id="sell_price" name="sell_price" type="number" step="0.01" defaultValue={editingProduct?.sell_price} required />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="low_stock_alert" className="text-sm font-medium">แจ้งเตือนสินค้าใกล้หมด (ชิ้น)</label>
                                <Input id="low_stock_alert" name="low_stock_alert" type="number" defaultValue={editingProduct?.low_stock_alert || 5} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>ยกเลิก</Button>
                            <Button type="submit">บันทึก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ---------------- CATEGORY MODAL ---------------- */}
            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>เพิ่มหมวดหมู่สินค้าใหม่</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="cat_name" className="text-sm font-medium">ชื่อหมวดหมู่</label>
                                <Input id="cat_name" name="name" required placeholder="เช่น อะไหล่มอไซ" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>ยกเลิก</Button>
                            <Button type="submit">เพิ่มหมวดหมู่</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ---------------- PURCHASE LOT MODAL ---------------- */}
            <Dialog open={isLotModalOpen} onOpenChange={setIsLotModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>เพิ่มสต็อก (ล็อตใหม่)</DialogTitle>
                        <DialogDescription>
                            เพิ่มจำนวนสต็อกสำหรับ "{editingProduct?.name}"
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLotSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="cost_price" className="text-sm font-medium">ราคาต้นทุน (ต่อชิ้น)</label>
                                <Input id="cost_price" name="cost_price" type="number" step="0.01" required placeholder="0.00" />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="quantity" className="text-sm font-medium">จำนวนที่รับเข้า</label>
                                <Input id="quantity" name="quantity" type="number" required placeholder="0" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsLotModalOpen(false)}>ยกเลิก</Button>
                            <Button type="submit">เพิ่มสต็อก</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
