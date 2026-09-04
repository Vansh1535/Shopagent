import { CommercePolicy, Product } from '../types';
import { db } from '../db';

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  code?: 'EXCEEDS_MAX_QUANTITY' | 'EXCEEDS_DISCOUNT' | 'OUT_OF_STOCK' | 'PRICE_MISMATCH' | 'EXCEEDS_MAX_ORDER_VALUE' | 'CONFIRMATION_REQUIRED';
  validatedPrice?: number;
  availableStock?: number;
}

export async function validateTransactionPolicy(
  sellerId: string,
  product: Product,
  requestedQuantity: number,
  proposedPrice?: number,
  userConfirmed: boolean = false
): Promise<PolicyValidationResult> {
  const policy: CommercePolicy = await db.getCommercePolicy(sellerId);

  // 1. Stock Check
  if (product.stock < requestedQuantity) {
    return {
      allowed: false,
      code: 'OUT_OF_STOCK',
      reason: `Product "${product.name}" is out of stock or requested quantity (${requestedQuantity}) exceeds available stock (${product.stock}).`,
      availableStock: product.stock,
    };
  }

  // 2. Max Quantity Per Order Check
  if (requestedQuantity > policy.max_quantity_per_order) {
    return {
      allowed: false,
      code: 'EXCEEDS_MAX_QUANTITY',
      reason: `Requested quantity (${requestedQuantity}) exceeds seller policy limit of ${policy.max_quantity_per_order} units per order.`,
    };
  }

  // 3. Price Validation
  const authoritativePrice = product.price;
  if (proposedPrice !== undefined && proposedPrice < authoritativePrice) {
    const discountPercent = ((authoritativePrice - proposedPrice) / authoritativePrice) * 100;
    if (discountPercent > policy.max_discount) {
      return {
        allowed: false,
        code: 'EXCEEDS_DISCOUNT',
        reason: `Proposed discount of ${discountPercent.toFixed(1)}% exceeds merchant policy maximum allowed discount of ${policy.max_discount}%.`,
        validatedPrice: authoritativePrice,
      };
    }
  }

  // 4. Max Order Value Check
  const totalValue = authoritativePrice * requestedQuantity;
  if (totalValue > policy.max_auto_order_value) {
    return {
      allowed: false,
      code: 'EXCEEDS_MAX_ORDER_VALUE',
      reason: `Total transaction value of ₹${totalValue} exceeds automatic order threshold of ₹${policy.max_auto_order_value}. Merchant manual review required.`,
    };
  }

  // 5. User Confirmation Gate Check
  if (policy.require_confirmation && !userConfirmed) {
    return {
      allowed: false,
      code: 'CONFIRMATION_REQUIRED',
      reason: `User explicit confirmation required for payment of ₹${totalValue}.`,
      validatedPrice: authoritativePrice,
    };
  }

  return {
    allowed: true,
    validatedPrice: authoritativePrice,
    availableStock: product.stock,
  };
}
