import { useState, useEffect } from 'react';

export interface PlanFeature {
  ID: number;
  FEATURE_KEY: string;
  VALUE_NUM?: number;
  VALUE_TEXT?: string;
  VALUE_FLAG?: string;
  IS_ACTIVE: string;
  PLAN_ID: number;
}

export interface PricingPlan {
  ID: number;
  PLAN_NAME: string;
  PLAN_DESCRIPTION: string;
  PRICE_MONTHLY: number;
  PRICE_YEARLY: number;
  IS_ACTIVE: string;
  IS_FREE: string;
  features?: PlanFeature[];
}

export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plans');
        
        if (!response.ok) {
          throw new Error('Failed to fetch pricing plans');
        }
        
        const data = await response.json();
        setPlans(data);
      } catch (err) {
        console.error('Error fetching pricing plans:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
}
