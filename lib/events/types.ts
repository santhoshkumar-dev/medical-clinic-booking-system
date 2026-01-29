// SAGA Event Types
export type SagaEventType =
  | "BookingRequested"
  | "PricingCalculated"
  | "DiscountQuotaReserved"
  | "DiscountQuotaRejected"
  | "PaymentCompleted"
  | "PaymentFailed"
  | "BookingConfirmed"
  | "BookingFailed"
  | "CompensationTriggered"
  | "DiscountQuotaReleased"
  | "PaymentReversed";

// Admin Event Types
export type AdminEventType =
  | "AdminAuthenticated"
  | "DiscountQuotaUpdated"
  | "AdminActionLogged";

// Combined Event Types
export type EventType = SagaEventType | AdminEventType;

export interface BaseEvent {
  correlationId: string;
  eventType: EventType;
  timestamp: Date;
}

// SAGA Events
export interface BookingRequestedEvent extends BaseEvent {
  eventType: "BookingRequested";
  data: {
    customerName: string;
    gender: "male" | "female";
    dateOfBirth: string;
    services: Array<{ id: string; name: string; price: number }>;
  };
}

export interface PricingCalculatedEvent extends BaseEvent {
  eventType: "PricingCalculated";
  data: {
    basePrice: number;
    discountEligible: boolean;
    discountPercentage: number;
    discountAmount: number;
    finalPrice: number;
    reason?: string;
  };
}

export interface DiscountQuotaReservedEvent extends BaseEvent {
  eventType: "DiscountQuotaReserved";
  data: {
    quotaUsed: number;
    quotaLimit: number;
  };
}

export interface DiscountQuotaRejectedEvent extends BaseEvent {
  eventType: "DiscountQuotaRejected";
  data: {
    reason: string;
  };
}

export interface PaymentCompletedEvent extends BaseEvent {
  eventType: "PaymentCompleted";
  data: {
    amount: number;
    transactionId: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  eventType: "PaymentFailed";
  data: {
    reason: string;
    requiresCompensation: boolean;
  };
}

export interface BookingConfirmedEvent extends BaseEvent {
  eventType: "BookingConfirmed";
  data: {
    referenceId: string;
    finalPrice: number;
    discountApplied: boolean;
  };
}

export interface BookingFailedEvent extends BaseEvent {
  eventType: "BookingFailed";
  data: {
    reason: string;
    compensationExecuted: boolean;
  };
}

export interface CompensationTriggeredEvent extends BaseEvent {
  eventType: "CompensationTriggered";
  data: {
    originalEvent: SagaEventType;
    reason: string;
  };
}

export interface DiscountQuotaReleasedEvent extends BaseEvent {
  eventType: "DiscountQuotaReleased";
  data: {
    reason: string;
  };
}

export interface PaymentReversedEvent extends BaseEvent {
  eventType: "PaymentReversed";
  data: {
    transactionId?: string;
    reason: string;
  };
}

// Admin Events
export interface AdminAuthenticatedEvent extends BaseEvent {
  eventType: "AdminAuthenticated";
  data: {
    adminId: string;
    email: string;
    action: "login" | "logout";
  };
}

export interface DiscountQuotaUpdatedEvent extends BaseEvent {
  eventType: "DiscountQuotaUpdated";
  data: {
    adminId: string;
    previousLimit: number;
    newLimit: number;
    reason?: string;
  };
}

export interface AdminActionLoggedEvent extends BaseEvent {
  eventType: "AdminActionLogged";
  data: {
    adminId: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  };
}

// Union types
export type SagaEvent =
  | BookingRequestedEvent
  | PricingCalculatedEvent
  | DiscountQuotaReservedEvent
  | DiscountQuotaRejectedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | BookingConfirmedEvent
  | BookingFailedEvent
  | CompensationTriggeredEvent
  | DiscountQuotaReleasedEvent
  | PaymentReversedEvent;

export type AdminEvent =
  | AdminAuthenticatedEvent
  | DiscountQuotaUpdatedEvent
  | AdminActionLoggedEvent;

export type AnyEvent = SagaEvent | AdminEvent;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandler = (event: any) => Promise<void>;

export interface EventSubscription {
  eventType: EventType;
  handler: EventHandler;
}
