'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Download, FileText, PackageX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

type ReportData = {
    sales: { id: string, total_amount: number, total_profit: number, created_at: string, created_by: string }[]
    categoryStats: { name: string, sales: number, profit: number, units: number }[]
    deadStock: { id: string, name: string, sku: string, totalStock: number }[]
}

export default function ReportsClient({ data }: { data: ReportData }) {
    const [activeTab, setActiveTab] = useState<'daily' | 'category' | 'deadstock'>('daily')

    // Export to CSV Function
    const handleExportCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel Thai support
        const dateStamp = format(new Date(), 'yyyy-MM-dd')

        if (activeTab === 'daily') {
            csvContent += "วันที่/เวลา,รหัสบิล,พนักงาน (ID),ยอดขาย (บาท),กำไร (บาท)\n"
            data.sales.forEach(row => {
                const dt = format(new Date(row.created_at), 'yyyy-MM-dd HH:mm:ss')
                csvContent += `"${dt}","${row.id}","${row.created_by}",${row.total_amount},${row.total_profit}\n`
            })
        } else if (activeTab === 'category') {
            csvContent += "หมวดหมู่,จำนวนชิ้นที่ขายได้,ยอดขายรวม (บาท),กำไรรวม (บาท)\n"
            data.categoryStats.forEach(row => {
                csvContent += `"${row.name}",${row.units},${row.sales},${row.profit}\n`
            })
        } else {
            csvContent += "รหัส SKU,ชื่อสินค้า,สต็อกคงเหลือ\n"
            data.deadStock.forEach(row => {
                csvContent += `"${row.sku}","${row.name}",${row.totalStock}\n`
            })
        }

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `report_${activeTab}_${dateStamp}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">รายงาน</h1>
                    <p className="text-gray-500 mt-1">ดูรายงานการขาย สินค้านอนสต็อก และส่งออกข้อมูล</p>
                </div>

                <Button onClick={handleExportCSV} variant="default" className="flex items-center bg-indigo-600 hover:bg-indigo-700">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({activeTab === 'daily' ? 'รายวัน' : activeTab === 'category' ? 'หมวดหมู่' : 'สินค้าค้างสต็อก'})
                </Button>
            </div>

            <div className="flex space-x-2 border-b pb-2 overflow-x-auto scrollbar-hide">
                <Button
                    variant={activeTab === 'daily' ? 'default' : 'ghost'}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    data-state={activeTab === 'daily' ? 'active' : 'inactive'}
                    onClick={() => setActiveTab('daily')}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    ประวัติการขายรายวัน
                </Button>
                <Button
                    variant={activeTab === 'category' ? 'default' : 'ghost'}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    data-state={activeTab === 'category' ? 'active' : 'inactive'}
                    onClick={() => setActiveTab('category')}
                >
                    <FileText className="mr-2 h-4 w-4" />
                    ยอดขายตามหมวดหมู่
                </Button>
                <Button
                    variant={activeTab === 'deadstock' ? 'default' : 'ghost'}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                    data-state={activeTab === 'deadstock' ? 'active' : 'inactive'}
                    onClick={() => setActiveTab('deadstock')}
                >
                    <PackageX className="mr-2 h-4 w-4" />
                    สินค้านอนสต็อก (60 วัน)
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {activeTab === 'daily' && 'ประวัติการขายทั้งหมด'}
                        {activeTab === 'category' && 'สรุปยอดขายแยกตามหมวดหมู่'}
                        {activeTab === 'deadstock' && 'รายงานสินค้านอนสต็อก (ไม่ได้ขายเลยใน 60 วันที่ผ่านมา)'}
                    </CardTitle>
                    <CardDescription>
                        {activeTab === 'daily' && 'เรียงจากรายการล่าสุดไปเก่าที่สุด'}
                        {activeTab === 'category' && 'ยอดรวมการขายและกำไรเรียงตามความนิยม'}
                        {activeTab === 'deadstock' && 'ตรวจสอบและพิจารณาจัดโปรโมชั่นเพื่อระบายสต็อก'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">

                    {/* DAILY SALES TAB */}
                    {activeTab === 'daily' && (
                        <div className="min-w-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>วัน/เวลา</TableHead>
                                        <TableHead>รหัสบิล</TableHead>
                                        <TableHead className="text-right">ยอดขาย (บาท)</TableHead>
                                        <TableHead className="text-right">กำไร (บาท)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.sales.length > 0 ? data.sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                {format(new Date(sale.created_at), 'dd MMM yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-gray-500">{sale.id.split('-')[0]}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">
                                                ฿{Number(sale.total_amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-blue-600">
                                                ฿{Number(sale.total_profit).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">ไม่มีประวัติการขาย</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* CATEGORY TAB */}
                    {activeTab === 'category' && (
                        <div className="min-w-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>หมวดหมู่สินค้า</TableHead>
                                        <TableHead className="text-right">จำนวนชิ้นที่ขายได้</TableHead>
                                        <TableHead className="text-right">ยอดขายรวม (บาท)</TableHead>
                                        <TableHead className="text-right">กำไรรวม (บาท)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.categoryStats.length > 0 ? data.categoryStats.map((stat, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{stat.name}</TableCell>
                                            <TableCell className="text-right">{stat.units.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">
                                                ฿{stat.sales.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-blue-600">
                                                ฿{stat.profit.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">ไม่มีข้อมูล</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* DEAD STOCK TAB */}
                    {activeTab === 'deadstock' && (
                        <div className="min-w-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>รหัส SKU</TableHead>
                                        <TableHead>ชื่อสินค้า</TableHead>
                                        <TableHead className="text-right">สต็อกค้าง (ชิ้น)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.deadStock.length > 0 ? data.deadStock.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right text-red-600 font-bold">{item.totalStock}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-emerald-600 font-medium">ไม่มีสินค้านอนสต็อก! (ร้านค้าหมุนเวียนของได้ดีมาก)</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}
