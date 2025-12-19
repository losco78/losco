
export enum Recipient {
  JACOPO = 'Jacopo',
  LEONARDO = 'Leonardo',
  MARY = 'Mary',
  ANNA = 'Anna',
  PAOLO = 'Paolo',
  ALTRÌ = 'Altri'
}

export enum Payer {
  PAOLO = 'Paolo',
  MARY = 'Mary'
}

export enum Occasion {
  NATALE = 'Natale',
  COMPLEANNO = 'Compleanno',
  ANNIVERSARIO = 'Anniversario',
  ALTRO = 'Altro'
}

export interface RecipientStats {
  name: string;
  count: number;
  value: number;
}

export interface Gift {
  id: string;
  title: string;
  source: string;
  cost: number;
  recipient: Recipient;
  isReceived: boolean;
  payer: Payer;
  isSplit: boolean;
  isReturned: boolean;
  isRepaid: boolean;
  isExcluded: boolean;
  isDeleted?: boolean; // Nuovo: per eliminazione logica
  occasion: Occasion;
  year: number;
  createdAt: number;
  imageUrl?: string;
  productUrl?: string;
  trackingUrl?: string;
  orderDetailUrl?: string; // Nuovo: Link al dettaglio ordine
}

export interface FinancialSummary {
  totalSpent: number;
  totalPaoloPaid: number;
  totalMaryPaid: number;
  maryOwesPaolo: number;
  paoloOwesMary: number;
  netSettlement: number;
  recipientStats: RecipientStats[];
}
