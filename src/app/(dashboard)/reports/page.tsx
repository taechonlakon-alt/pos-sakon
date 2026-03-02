import ReportsClient from './components/ReportsClient'
import { getReportsData } from './actions'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    const data = await getReportsData()

    return (
        <ReportsClient data={data} />
    )
}
