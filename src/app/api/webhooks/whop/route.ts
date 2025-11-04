import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Webhook signature validation
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computed = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

// Log webhook to database
async function logWebhook(eventType: string, payload: any, signature: string, processed: boolean, error?: string) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      event_type: eventType,
      payload: payload,
      signature: signature.substring(0, 100), // Limit length
      processed: processed,
      error_message: error,
    });
  } catch (err) {
    console.error('[Webhook] Failed to log webhook:', err);
  }
}

// Handle payment_succeeded event
async function handlePaymentSucceeded(data: any) {
  try {
    // Upsert user if needed
    if (data.user?.id) {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: data.user.email || null,
        username: data.user.username || null,
        created_at: data.user.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // Upsert order
    if (data.order?.id) {
      await supabaseAdmin.from('orders').upsert({
        id: data.order.id,
        user_id: data.user?.id || data.order.user_id,
        amount: data.order.amount || data.amount || 0,
        currency: data.order.currency || 'usd',
        status: 'succeeded',
        created_at: data.order.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.error('[Webhook] Error handling payment_succeeded:', err);
    throw err;
  }
}

// Handle payment_failed event
async function handlePaymentFailed(data: any) {
  try {
    // Upsert user if needed
    if (data.user?.id) {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: data.user.email || null,
        username: data.user.username || null,
        created_at: data.user.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // Upsert order with failed status
    if (data.order?.id) {
      await supabaseAdmin.from('orders').upsert({
        id: data.order.id,
        user_id: data.user?.id || data.order.user_id,
        amount: data.order.amount || data.amount || 0,
        currency: data.order.currency || 'usd',
        status: 'failed',
        created_at: data.order.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // Log as event
    if (data.user?.id) {
      await supabaseAdmin.from('events').insert({
        user_id: data.user.id,
        type: 'payment_failed',
        payload: data,
      });
    }
  } catch (err: any) {
    console.error('[Webhook] Error handling payment_failed:', err);
    throw err;
  }
}

// Handle subscription_created event
async function handleSubscriptionCreated(data: any) {
  try {
    // Upsert user
    if (data.user?.id) {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: data.user.email || null,
        username: data.user.username || null,
        created_at: data.user.created_at || new Date().toISOString(),
      }, { onConflict: 'id' });
    }

    // Insert subscription
    if (data.subscription?.id) {
      const sub = data.subscription;
      await supabaseAdmin.from('subscriptions').upsert({
        id: sub.id,
        user_id: data.user?.id || sub.user_id,
        plan_id: sub.plan_id || sub.planId || '',
        status: sub.status || 'active',
        started_at: sub.started_at || sub.startedAt || new Date().toISOString(),
        current_period_end: sub.current_period_end || sub.currentPeriodEnd || null,
        canceled_at: null,
        amount: sub.amount || sub.amount_cents || 0,
        interval: sub.interval || 'month',
        currency: sub.currency || 'usd',
        created_at: sub.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  } catch (err: any) {
    console.error('[Webhook] Error handling subscription_created:', err);
    throw err;
  }
}

// Handle subscription_canceled event
async function handleSubscriptionCanceled(data: any) {
  try {
    if (data.subscription?.id) {
      await supabaseAdmin.from('subscriptions').update({
        status: 'canceled',
        canceled_at: data.subscription.canceled_at || data.subscription.canceledAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', data.subscription.id);
    }
  } catch (err: any) {
    console.error('[Webhook] Error handling subscription_canceled:', err);
    throw err;
  }
}

// Handle refund_created event
async function handleRefundCreated(data: any) {
  try {
    if (data.refund?.id) {
      // Get order to find user_id
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('user_id')
        .eq('id', data.refund.order_id || data.refund.orderId || data.order?.id)
        .single();

      await supabaseAdmin.from('refunds').upsert({
        id: data.refund.id,
        order_id: data.refund.order_id || data.refund.orderId || data.order?.id,
        user_id: order?.user_id || data.user?.id || data.refund.user_id,
        amount: data.refund.amount || data.refund.amount_cents || 0,
        reason: data.refund.reason || null,
        created_at: data.refund.created_at || data.refund.createdAt || new Date().toISOString(),
      }, { onConflict: 'id' });

      // Update order status if needed
      if (data.refund.order_id || data.refund.orderId) {
        await supabaseAdmin.from('orders').update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        }).eq('id', data.refund.order_id || data.refund.orderId);
      }
    }
  } catch (err: any) {
    console.error('[Webhook] Error handling refund_created:', err);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-whop-signature') || '';
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event_type || 'unknown';

    // Verify signature if webhook secret is configured
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        await logWebhook(eventType, payload, signature, false, 'Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Process event
    let processed = false;
    let error: string | undefined;

    try {
      switch (eventType) {
        case 'payment_succeeded':
        case 'payment.succeeded':
          await handlePaymentSucceeded(payload.data || payload);
          processed = true;
          break;

        case 'payment_failed':
        case 'payment.failed':
          await handlePaymentFailed(payload.data || payload);
          processed = true;
          break;

        case 'subscription_created':
        case 'subscription.created':
          await handleSubscriptionCreated(payload.data || payload);
          processed = true;
          break;

        case 'subscription_canceled':
        case 'subscription.canceled':
          await handleSubscriptionCanceled(payload.data || payload);
          processed = true;
          break;

        case 'refund_created':
        case 'refund.created':
          await handleRefundCreated(payload.data || payload);
          processed = true;
          break;

        default:
          console.log('[Webhook] Unhandled event type:', eventType);
          processed = true; // Logged but not processed
      }

      await logWebhook(eventType, payload, signature, processed);
      return NextResponse.json({ received: true, event: eventType });
    } catch (err: any) {
      error = err?.message || String(err);
      await logWebhook(eventType, payload, signature, false, error);
      console.error('[Webhook] Processing error:', err);
      return NextResponse.json({ error: error }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[Webhook] Request error:', err);
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 });
  }
}

