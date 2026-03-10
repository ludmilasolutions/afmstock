import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    const { action, ...params } = await req.json()

    let result

    switch (action) {
      case 'search':
        result = await searchProfessionals(params)
        break
      case 'get_nearby':
        result = await getNearbyProfessionals(params, user.id)
        break
      case 'filter':
        result = await filterProfessionals(params)
        break
      case 'sort':
        result = await sortProfessionals(params)
        break
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 })
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

async function searchProfessionals(params: {
  query?: string
  specialty?: string
  province?: string
  city?: string
  page?: number
  limit?: number
}) {
  const { query, specialty, province, city, page = 1, limit = 20 } = params

  let dbQuery = supabase
    .from('v_professionals_public')
    .select('*', { count: 'exact' })

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`)
  }

  if (specialty) {
    dbQuery = dbQuery.eq('specialty', specialty)
  }

  if (province) {
    dbQuery = dbQuery.eq('province', province)
  }

  if (city) {
    dbQuery = dbQuery.ilike('city', `%${city}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await dbQuery
    .range(from, to)
    .order('avg_rating', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return {
    professionals: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  }
}

async function getNearbyProfessionals(params: {
  latitude: number
  longitude: number
  radius?: number
  specialty?: string
  page?: number
  limit?: number
}, userId: string) {
  const { latitude, longitude, radius = 10, specialty, page = 1, limit = 20 } = params

  const { data, error } = await supabase
    .rpc('get_nearby_professionals', {
      lat: latitude,
      lon: longitude,
      radius_km: radius,
      specialty_filter: specialty
    })

  if (error) {
    return { error: error.message }
  }

  // Ordenar por rating y limitar
  const sorted = (data || [])
    .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    .slice((page - 1) * limit, page * limit)

  return {
    professionals: sorted,
    pagination: {
      page,
      limit,
      total: data?.length || 0,
      radius
    }
  }
}

async function filterProfessionals(params: {
  specialty?: string
  province?: string
  city?: string
  zone?: string
  is_certified?: boolean
  is_featured?: boolean
  is_online?: boolean
  min_rating?: number
  max_distance?: number
  user_lat?: number
  user_lng?: number
  page?: number
  limit?: number
}) {
  const {
    specialty, province, city, zone,
    is_certified, is_featured, is_online,
    min_rating, max_distance,
    user_lat, user_lng,
    page = 1, limit = 20
  } = params

  let query = supabase
    .from('v_professionals_public')
    .select('*', { count: 'exact' })

  if (specialty) query = query.eq('specialty', specialty)
  if (province) query = query.eq('province', province)
  if (city) query = query.ilike('city', `%${city}%`)
  if (zone) query = query.cs.zones([zone])
  if (is_certified !== undefined) query = query.eq('is_certified', is_certified)
  if (is_featured !== undefined) query = query.eq('is_featured', is_featured)
  if (is_online !== undefined) query = query.eq('is_online', is_online)
  if (min_rating) query = query.gte('avg_rating', min_rating)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .range(from, to)
    .order('is_featured', { ascending: false })
    .order('avg_rating', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  // Filtrar por distancia si hay coordenadas
  let filtered = data || []
  
  if (max_distance && user_lat && user_lng) {
    filtered = filtered.filter(p => {
      if (!p.latitude || !p.longitude) return false
      const distance = calculateDistance(user_lat, user_lng, p.latitude, p.longitude)
      return distance <= max_distance
    })
  }

  return {
    professionals: filtered,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  }
}

async function sortProfessionals(params: {
  professionals: any[]
  sort_by: string
  user_lat?: number
  user_lng?: number
}) {
  const { professionals, sort_by, user_lat, user_lng } = params

  let sorted = [...professionals]

  switch (sort_by) {
    case 'rating':
      sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      break
    case 'jobs':
      sorted.sort((a, b) => (b.jobs_count || 0) - (a.jobs_count || 0))
      break
    case 'reviews':
      sorted.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
      break
    case 'distance':
      if (user_lat && user_lng) {
        sorted.sort((a, b) => {
          const distA = a.latitude && a.longitude 
            ? calculateDistance(user_lat, user_lng, a.latitude, a.longitude)
            : Infinity
          const distB = b.latitude && b.longitude 
            ? calculateDistance(user_lat, user_lng, b.latitude, b.longitude)
            : Infinity
          return distA - distB
        })
      }
      break
    case 'ranking':
    default:
      sorted.sort((a, b) => {
        const scoreA = calculateRankingScore(a)
        const scoreB = calculateRankingScore(b)
        return scoreB - scoreA
      })
  }

  return { professionals: sorted }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function calculateRankingScore(pro: any): number {
  const featuredWeight = pro.is_featured ? 40 : 0
  const certifiedWeight = pro.is_certified ? 20 : 0
  const ratingWeight = (pro.avg_rating || 0) * 6
  const jobsWeight = Math.min((pro.jobs_count || 0) * 0.05, 15)
  
  return featuredWeight + certifiedWeight + ratingWeight + jobsWeight
}
