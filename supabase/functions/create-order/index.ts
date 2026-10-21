// create-order — multi-book cart support (REV 6)
// Input:  { book_ids: [...] } + Authorization: Bearer <JWT>
// Server loads prices from the books table — client-supplied amounts are never trusted.
// Creates ONE Razorpay order for the cart total, plus one PENDING purchase row per book.
// Output: { id, amount, currency, book_ids }
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
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

    const { book_ids } = await req.json()
    if (!Array.isArray(book_ids) || book_ids.length === 0) {
      throw new Error('book_ids (array) is required')
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Load the books with authoritative DB prices
    const { data: books, error: booksErr } = await admin
      .from('books')
      .select('id, title, price, currency, is_free')
      .in('id', book_ids)
    if (booksErr) throw booksErr
    if (!books || books.length === 0) throw new Error('No valid books found')

    // 2. Skip books that are free or already owned (paid + unexpired)
    const { data: owned } = await admin
      .from('purchases')
      .select('book_id')
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .gt('expires_at', new Date().toISOString())

    const ownedIds = new Set((owned ?? []).map((p) => p.book_id))
    const payable = books.filter((b) => !b.is_free && !ownedIds.has(b.id))
    if (payable.length === 0) {
      throw new Error('Nothing to pay — all books are free or already owned')
    }

    const currency = payable[0].currency ?? 'INR'
    const totalPaise = payable.reduce(
      (sum, b) => sum + Math.round(Number(b.price) * 100), // Razorpay uses paise
      0
    )

    // 3. One Razorpay order covering the whole cart
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: totalPaise,
        currency,
        receipt: `cart_${user.id}_${Date.now()}`,
        notes: {
          user_id: user.id,
          book_ids: payable.map((b) => b.id).join(','),
        },
      }),
    })
    const order = await response.json()
    if (!order.id) throw new Error(JSON.stringify(order))

    // 4. Pending purchase rows — one per book, all sharing the same order id.
    //    verify-payment flips these to 'paid' after signature verification.
    const rows = payable.map((b) => ({
      user_id: user.id,
      book_id: b.id,
      razorpay_order_id: order.id,
      amount: Number(b.price),
      currency: b.currency ?? currency,
      status: 'pending',
    }))
    const { error: insErr } = await admin.from('purchases').insert(rows)
    if (insErr) throw insErr

    return new Response(
      JSON.stringify({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        book_ids: payable.map((b) => b.id),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
