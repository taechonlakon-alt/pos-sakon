'use client'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { AlertCircle, TrendingUp, HandCoins, Receipt } from 'lucide-react'

type DashboardData = {
    dailySales: number
    dailyProfit: number
    salesCount: number
    itemsNeedingRestock: any[]
    bestSellers: { name: string, quantity: number }[]
    chartData: { date: string, sales: number, profit: number }[]
}

export default function AdminClient({ data }: { data: DashboardData }) {

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">ภาพรวมระบบ (Dashboard)</h1>
                <p className="text-gray-500 mt-1">สรุปยอดขาย กำไร และสถานะสต็อกสินค้า</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ยอดขายวันนี้</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">฿{data.dailySales.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            จาก {data.salesCount} บิลขาย
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">กำไรวันนี้</CardTitle>
                        <HandCoins className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">฿{data.dailyProfit.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            หักต้นทุนสินค้า (FIFO) เรียบร้อยแล้ว
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">แจ้งเตือนสต็อกใกล้หมด</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{data.itemsNeedingRestock.length} รายการ</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            สินค้าที่ต้องสั่งซื้อเพิ่ม
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Tables */}
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">

                {/* Sales Chart */}
                <Card className="xl:col-span-4 min-h-[350px]">
                    <CardHeader>
                        <CardTitle>ยอดขาย 7 วันย้อนหลัง</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full">
                        {data.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `฿${val}`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        formatter={(value: number | undefined) => `฿${value?.toLocaleString() || 0}`}
                                    />
                                    <Legend />
                                    <Bar dataKey="sales" name="ยอดขายรวม" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="profit" name="กำไรสุทธิ" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                ยังไม่มีข้อมูลการขายใน 7 วันที่ผ่านมา
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Low Stock Alerts */}
                <Card className="col-span-1 xl:col-span-3">
                    <CardHeader>
                        <CardTitle>สินค้าใกล้หมดสต็อก</CardTitle>
                        <CardDescription>
                            รายการที่ถึงจุดสั่งซื้อที่กำหนดไว้
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.itemsNeedingRestock.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto pr-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>สินค้า</TableHead>
                                            <TableHead className="text-right">เหลือ</TableHead>
                                            <TableHead className="text-right">แจ้งเตือนที่</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.itemsNeedingRestock.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                    {item.name}
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{item.sku}</div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-red-600">{item.totalStock}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{item.low_stock_alert}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-green-600">
                                สถานะสต็อกปกติ ไม่มีสินค้าใกล้หมด
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Best Sellers */}
            <Card>
                <CardHeader>
                    <CardTitle>สินค้าขายดี 5 อันดับ</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.bestSellers.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                            {data.bestSellers.map((item, idx) => (
                                <div key={idx} className="flex-1 min-w-[200px] bg-gray-50 border p-4 rounded-lg flex items-center justify-between">
                                    <span className="font-medium flex items-center">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary mr-3">
                                            {idx + 1}
                                        </span>
                                        {item.name}
                                    </span>
                                    <span className="font-bold">{item.quantity} ชิ้น</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-center py-4">ยังไม่มีข้อมูลการขาย</div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
