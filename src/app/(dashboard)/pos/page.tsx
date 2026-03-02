import POSClient from './components/POSClient'
import { getPOSProducts } from './actions'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
    const { products, categorizedProducts } = await getPOSProducts()

    return (
        <div className="h-full">
            <POSClient
                products={products}
                categorizedProducts={categorizedProducts}
            />
        </div>
    )
}
