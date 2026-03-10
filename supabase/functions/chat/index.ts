import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  try {
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
      case 'get_conversations':
        result = await getConversations(user.id)
        break
      case 'get_messages':
        result = await getMessages(params.conversation_id, user.id)
        break
      case 'send_message':
        result = await sendMessage(params.conversation_id, user.id, params.content, params.type)
        break
      case 'create_conversation':
        result = await createConversation(user.id, params.participant_id, params.job_id)
        break
      case 'mark_read':
        result = await markAsRead(params.conversation_id, user.id)
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

async function getConversations(userId: string) {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant_one:profiles!participant_one_id(id, full_name, avatar_url),
      participant_two:profiles!participant_two_id(id, full_name, avatar_url),
      job:jobs(id, description, status)
    `)
    .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
    .order('last_message_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  // Obtener unread count para cada conversación
  const conversationsWithUnread = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read', false)
        .neq('sender_id', userId)

      // Determinar el otro participante
      const other = conv.participant_one?.id === userId 
        ? conv.participant_two 
        : conv.participant_one

      return {
        ...conv,
        other_participant: other,
        unread_count: count || 0
      }
    })
  )

  return { conversations: conversationsWithUnread }
}

async function getMessages(conversationId: string, userId: string) {
  // Verificar acceso a la conversación
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (!conversation || 
      (conversation.participant_one !== userId && conversation.participant_two !== userId)) {
    return { error: 'Acceso denegado a esta conversación' }
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  // Marcar mensajes como leídos
  await supabase
    .from('messages')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false)

  return { messages }
}

async function sendMessage(
  conversationId: string, 
  senderId: string, 
  content: string,
  type: string = 'text'
) {
  // Verificar acceso
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (!conversation || 
      (conversation.participant_one !== senderId && conversation.participant_two !== senderId)) {
    return { error: 'Acceso denegado' }
  }

  // Crear mensaje
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type
    })
    .select('*, sender:profiles(id, full_name, avatar_url)')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Actualizar conversación
  const recipientId = conversation.participant_one === senderId 
    ? conversation.participant_two 
    : conversation.participant_one

  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)

  // Crear notificación para el recipient
  await supabase
    .from('notifications')
    .insert({
      user_id: recipientId,
      type: 'new_message',
      title: 'Nuevo mensaje',
      message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      data: { conversation_id: conversationId }
    })

  return { message }
}

async function createConversation(
  userId: string, 
  participantId: string,
  jobId?: string
) {
  // Verificar si ya existe conversación
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(participant_one.eq.${userId},participant_two.eq.${participantId}),and(participant_one.eq.${participantId},participant_two.eq.${userId})`)
    .maybeSingle()

  if (existing) {
    return { conversation: existing, already_exists: true }
  }

  // Crear nueva conversación
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      participant_one: userId,
      participant_two: participantId,
      job_id: jobId,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { conversation, already_exists: false }
}

async function markAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
