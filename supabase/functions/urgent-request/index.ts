import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  try {
    const { action, user_id, professional_id, radius, specialty, description } = await req.json()

    let result

    switch (action) {
      case 'find_nearby_pros':
        result = await findNearbyProfessionals(user_id, radius, specialty)
        break
      case 'create_urgent_job':
        result = await createUrgentJob(user_id, specialty, description, radius)
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

async function findNearbyProfessionals(userId: string, radius: number = 10, specialty?: string) {
  // Obtener ubicación del usuario desde sus direcciones guardadas
  const { data: userAddresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .limit(1)

  if (!userAddresses || userAddresses.length === 0) {
    return { error: 'No se encontró ubicación del usuario', code: 'NO_LOCATION' }
  }

  const userAddress = userAddresses[0]
  const lat = userAddress.latitude
  const lon = userAddress.longitude

  if (!lat || !lon) {
    return { error: 'Ubicación no disponible', code: 'NO_LOCATION' }
  }

  // Buscar profesionales cercanos usando la función PostgreSQL
  let query = supabase
    .rpc('get_nearby_professionals', {
      lat,
      lon,
      radius_km: radius
    })

  if (specialty) {
    query = query.eq('specialty', specialty)
  }

  const { data: professionals, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { professionals, count: professionals?.length || 0 }
}

async function createUrgentJob(userId: string, specialty: string, description: string, radius: number = 10) {
  // Obtener ubicación del usuario
  const { data: userAddresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .limit(1)

  let lat = null
  let lon = null

  if (userAddresses && userAddresses.length > 0) {
    lat = userAddresses[0].latitude
    lon = userAddresses[0].longitude
  }

  // Crear solicitud urgente
  const { data: urgentRequest, error: urgentError } = await supabase
    .from('urgent_requests')
    .insert({
      user_id: userId,
      specialty,
      description,
      radius,
      latitude: lat,
      longitude: lon,
      status: 'solicitado'
    })
    .select()
    .single()

  if (urgentError) {
    return { error: urgentError.message }
  }

  // Buscar profesionales cercanos
  const nearbyResult = await findNearbyProfessionals(userId, radius, specialty)

  if (nearbyResult.professionals && nearbyResult.professionals.length > 0) {
    // Notificar a los profesionales cercanos (usando la función de notificaciones)
    for (const pro of nearbyResult.professionals.slice(0, 10)) {
      await supabase.functions.invoke('notifications', {
        body: {
          action: 'notify_urgent_request',
          professional_id: pro.user_id
        }
      })
    }
  }

  return { 
    success: true, 
    urgent_request: urgentRequest,
    professionals_notified: nearbyResult.count || 0
  }
}
