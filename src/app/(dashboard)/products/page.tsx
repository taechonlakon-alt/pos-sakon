import { createClient } from '@/utils/supabase/server'
import ProductClient from './components/ProductClient'
import { getCategories, getProducts } from './actions'

export default async function ProductsPage() {
    const supabase = await createClient()

    // Get current user role
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single()
    const role = userData?.role || 'staff'

    // Fetch initial data
    const categories = await getCategories() || []
    const products = await getProducts() || []

    return (
        <ProductClient
            initialProducts={products}
            categories={categories}
            role={role}
        />
    )
}
