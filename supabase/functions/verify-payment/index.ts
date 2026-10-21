// verify-payment — multi-book cart support (REV 6)
// Input:  { razorpay_order_id, razorpay_payment_id, razorpay_signature } + Authorization JWT
// Verifies the HMAC signature, flips ALL pending purchases for that order to 'paid'
// (each with 1-year expiry), auto-adds each book to the user's library, and returns the book ids.
// Output: { success: true, book_ids: [...] }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the caller from their JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    // 1. Verify the HMAC-SHA256 signature: order_id|payment_id
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(RAZORPAY_KEY_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature')
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Flip every pending purchase for this order (and this user) to paid.
    //    Amounts were stored server-side by create-order from DB prices.
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    const { data: updated, error: updErr } = await admin
      .from('purchases')
      .update({
        status: 'paid',
        razorpay_payment_id,
        expires_at: expiresAt.toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('book_id')

    if (updErr) throw updErr
    if (!updated || updated.length === 0) {
      throw new Error('No pending purchases found for this order')
    }

    // 3. Auto-add every purchased book to the user's library (server-side, unfakeable)
    const { error: libErr } = await admin.from('user_library').upsert(
      updated.map((p) => ({ user_id: user.id, book_id: p.book_id })),
      { onConflict: 'user_id,book_id', ignoreDuplicates: true }
    )
    if (libErr) throw libErr

    return new Response(
      JSON.stringify({
        success: true,
        book_ids: updated.map((p) => p.book_id),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
