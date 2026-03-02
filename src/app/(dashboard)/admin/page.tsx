import AdminClient from './components/AdminClient'
import { getDashboardStats } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    const data = await getDashboardStats()

    return (
        <AdminClient data={data} />
    )
}
