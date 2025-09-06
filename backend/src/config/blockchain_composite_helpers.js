// backend/utils/blockchain_composite_helpers.js
import * as blockchain from './blockchain'
/* ---------------- Composite Helpers ---------------- */

/**
 * Create delivery + escrow in one step
 */
export async function createDeliveryWithEscrow(truckId, origin, destination, eta, payee, amount) {
  const deliveryTx = await blockchain.createDelivery(truckId, origin, destination, eta);

  // Extract orderId from event logs if available
  let orderId = null;
  try {
    const logs = deliveryTx.receipt?.logs || [];
    if (logs.length > 0 && logs[0].args?.orderId) {
      orderId = logs[0].args.orderId.toString();
    }
  } catch (err) {
    console.warn("Could not extract orderId from logs", err);
  }

  if (!orderId) throw new Error("OrderId not found in logs");

  await blockchain.createEscrowETH(orderId, payee, amount);

  return { deliveryTx, orderId };
}

/**
 * Initialize proof + first checkpoint
 */
export async function initProofWithCheckpoint(orderId, latE6, lonE6, ts) {
  await blockchain.initProof(orderId);
  return await blockchain.addCheckpoint(orderId, latE6, lonE6, ts);
}

/**
 * Finalize PoD + release escrow
 */
export async function finalizePoDWithPayment(orderId) {
  await blockchain.finalizePoD(orderId);
  return await blockchain.releasePayment(orderId);
}

/**
 * Cancel PoD + refund escrow
 */
export async function cancelPoDAndRefund(orderId) {
  return await blockchain.refund(orderId);
}

/**
 * Create full delivery flow:
 * - create delivery
 * - create escrow
 * - init PoD
 * - add first checkpoint
 */
export async function createFullDeliveryFlow(truckId, origin, destination, eta, payee, amount, latE6, lonE6, ts) {
  const { deliveryTx, orderId } = await createDeliveryWithEscrow(
    truckId,
    origin,
    destination,
    eta,
    payee,
    amount
  );
  await initProofWithCheckpoint(orderId, latE6, lonE6, ts);
  return { deliveryTx, orderId };
}
