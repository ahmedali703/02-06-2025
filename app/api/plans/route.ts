import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    /* ---------- plans ---------- */
    const plans = await query(
      `
      SELECT
        id               AS "ID",
        plan_name        AS "PLAN_NAME",
        plan_description AS "PLAN_DESCRIPTION",
        price_monthly    AS "PRICE_MONTHLY",
        price_yearly     AS "PRICE_YEARLY",
        is_active        AS "IS_ACTIVE",
        is_free          AS "IS_FREE"
      FROM nl2sql_plans
      WHERE is_active = 'Y'
      ORDER BY CASE
        WHEN UPPER(plan_name) = 'FREE'         THEN 1
        WHEN UPPER(plan_name) = 'BASIC'        THEN 2
        WHEN UPPER(plan_name) = 'PROFESSIONAL' THEN 3
        WHEN UPPER(plan_name) = 'ENTERPRISE'   THEN 4
        ELSE 5
      END
      `,
      [],
    );

    /* ---------- features ---------- */
    const features = await query(
      `
      SELECT
        id          AS "ID",
        feature_key AS "FEATURE_KEY",
        value_num   AS "VALUE_NUM",
        value_text  AS "VALUE_TEXT",
        value_flag  AS "VALUE_FLAG",
        is_active   AS "IS_ACTIVE",
        plan_id     AS "PLAN_ID"
      FROM nl2sql_plans_features
      WHERE is_active = 'Y'
      `,
      [],
    );

    /* ---------- group & attach ---------- */
    const byPlan: Record<number, any[]> = {};
    features.forEach(f => {
      if (!byPlan[f.PLAN_ID]) byPlan[f.PLAN_ID] = [];
      byPlan[f.PLAN_ID].push(f);
    });

    const result = plans.map(p => ({
      ...p,
      features: byPlan[p.ID] ?? [],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching pricing plans:', err);
    return NextResponse.json(
      { error: 'Failed to fetch pricing plans' },
      { status: 500 },
    );
  }
}