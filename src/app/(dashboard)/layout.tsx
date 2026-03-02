import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { LayoutDashboard, ShoppingCart, PackageSearch, FileBarChart, LogOut } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = userData?.role || 'staff'

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white border-r flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">POS & Inventory</h1>
                </div>

                <div className="p-4 text-sm text-gray-500 font-medium">
                    เข้าสู่ระบบในฐานะ: <span className="text-primary capitalize">{role}</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {role === 'admin' && (
                        <Link href="/admin" className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <LayoutDashboard className="mr-3 h-5 w-5" />
                            แดชบอร์ด (Admin)
                        </Link>
                    )}

                    <Link href="/pos" className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                        <ShoppingCart className="mr-3 h-5 w-5" />
                        ขายหน้าร้าน (POS)
                    </Link>

                    <Link href="/products" className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                        <PackageSearch className="mr-3 h-5 w-5" />
                        จัดการสินค้า
                    </Link>

                    {role === 'admin' && (
                        <Link href="/reports" className="flex items-center px-2 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
                            <FileBarChart className="mr-3 h-5 w-5" />
                            รายงาน
                        </Link>
                    )}
                </nav>

                <div className="p-4 border-t">
                    <form action={logout}>
                        <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" type="submit">
                            <LogOut className="mr-3 h-5 w-5" />
                            ออกจากระบบ
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile header (placeholder for actual mobile menu) */}
                <header className="h-16 flex items-center justify-between px-6 bg-white border-b md:hidden">
                    <h1 className="text-xl font-bold text-gray-800">POS & Inventory</h1>
                    <form action={logout}>
                        <Button variant="ghost" size="icon" className="text-red-600" type="submit">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </form>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
