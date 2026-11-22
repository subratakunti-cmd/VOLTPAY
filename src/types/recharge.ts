export type RegionCode = 'IN';

export type PlanCategory = 'all' | 'unlimited5g' | 'data' | 'annual' | 'roaming' | 'custom';

export type PaymentMethodType = 'wallet' | 'upi' | 'card';

export type TransactionStatus = 'Success' | 'Pending' | 'Failed';

export type ActiveTab = 'recharge' | 'plans' | 'history' | 'saved' | 'explore';

export interface RegionConfig {
  code: RegionCode;
  name: string;
  dialCode: string;
  currencySymbol: string;
  currencyCode: string;
  phoneDigits: number;
  placeholder: string;
  minCustomAmount: number;
  maxCustomAmount: number;
  quickCustomAmounts: number[];
  circles: string[];
}

export interface Carrier {
  id: string;
  name: string;
  shortName: string;
  region: RegionCode;
  brandColor: string;
  accentBg: string;
  prefixes: string[];
}

export interface RechargePlan {
  id: string;
  carrierId: string;
  region: RegionCode;
  price: number;
  category: Exclude<PlanCategory, 'all' | 'custom'>;
  title: string;
  dataAllowance: string;
  validity: string;
  validityDays: number;
  calls: string;
  sms: string;
  extras?: string;
  recommended?: boolean;
  speedAfterCap?: string;
}

export interface SavedContact {
  id: string;
  nickname: string;
  label: 'Personal' | 'Work' | 'Family' | 'Data SIM';
  phoneNumber: string;
  region: RegionCode;
  carrierId: string;
  circle: string;
  autoReminder: boolean;
  lastRechargedAt?: string;
}

export interface PromoCode {
  code: string;
  description: string;
  type: 'flat' | 'percent';
  value: number;
  minAmount: number;
  maxDiscount?: number;
}

export interface RechargeTransaction {
  id: string;
  referenceCode: string;
  carrierAuthCode: string;
  phoneNumber: string;
  region: RegionCode;
  carrierId: string;
  circle: string;
  planTitle: string;
  planMeta: string;
  amount: number;
  discount: number;
  totalPaid: number;
  promoApplied?: string;
  paymentMethod: PaymentMethodType;
  paymentLabel: string;
  status: TransactionStatus;
  createdAt: string;
}

export interface SavedCenterRecord {
  id: number;
  placeId: string;
  storeName: string;
  address: string;
  carrierTag: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export interface ChatTurnMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}
