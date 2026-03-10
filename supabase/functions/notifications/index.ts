import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  try {
    const { action, job_id, user_id, professional_id, type, title, message } = await req.json()

    let result

    switch (action) {
      case 'notify_job_created':
        result = await notifyJobCreated(job_id)
        break
      case 'notify_job_accepted':
        result = await notifyJobAccepted(job_id)
        break
      case 'notify_job_completed':
        result = await notifyJobCompleted(job_id)
        break
      case 'notify_new_review':
        result = await notifyNewReview(professional_id)
        break
      case 'notify_new_budget':
        result = await notifyNewBudget(user_id)
        break
      case 'notify_urgent_request':
        result = await notifyUrgentRequest(professional_id)
        break
      case 'send_notification':
        result = await sendNotification(user_id, type, title, message)
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

async function notifyJobCreated(jobId: string) {
  // Obtener detalles del trabajo
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles!jobs_user_id(full_name), specialties(name)')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  // Crear notificación para el profesional
  const notification = await supabase.from('notifications').insert({
    user_id: job.professional_id,
    type: 'job_request',
    title: 'Nueva solicitud de trabajo',
    message: `${job.profiles?.full_name || 'Un usuario'} solicitó tus servicios de ${job.specialty}`,
    data: { job_id: jobId, specialty: job.specialty }
  })

  return { success: true, notification }
}

async function notifyJobAccepted(jobId: string) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles!jobs_user_id(full_name), professionals(*)')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  // Notificar al usuario
  const notification = await supabase.from('notifications').insert({
    user_id: job.user_id,
    type: 'job_accepted',
    title: 'Trabajo aceptado',
    message: `¡Excelente! ${job.professionals?.specialty || 'El profesional'} aceptó tu solicitud`,
    data: { job_id: jobId }
  })

  return { success: true, notification }
}

async function notifyJobCompleted(jobId: string) {
  const { data: job } = await supabase
    .from('jobs')
    .select('*, profiles!jobs_user_id(full_name)')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }

  // Notificar al usuario para calificar
  const notification = await supabase.from('notifications').insert({
    user_id: job.user_id,
    type: 'job_completed',
    title: 'Trabajo completado',
    message: 'Tu trabajo ha sido marcado como completado. ¡Califica tu experiencia!',
    data: { job_id: jobId }
  })

  return { success: true, notification }
}

async function notifyNewReview(professionalId: string) {
  const notification = await supabase.from('notifications').insert({
    user_id: professionalId,
    type: 'new_review',
    title: 'Nueva reseña',
    message: '¡Un usuario te dejó una nueva calificación!',
    data: { professional_id: professionalId }
  })

  return { success: true, notification }
}

async function notifyNewBudget(userId: string) {
  const notification = await supabase.from('notifications').insert({
    user_id: userId,
    type: 'new_budget',
    title: 'Nuevo presupuesto',
    message: 'Recibiste un nuevo presupuesto de un profesional',
    data: { user_id: userId }
  })

  return { success: true, notification }
}

async function notifyUrgentRequest(professionalId: string) {
  const notification = await supabase.from('notifications').insert({
    user_id: professionalId,
    type: 'urgent_request',
    title: '⚠️ Solicitud urgente',
    message: 'Hay una solicitud de trabajo urgente cerca de ti',
    data: { type: 'urgent' }
  })

  return { success: true, notification }
}

async function sendNotification(userId: string, type: string, title: string, message: string) {
  const notification = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message
  })

  return { success: true, notification }
}
