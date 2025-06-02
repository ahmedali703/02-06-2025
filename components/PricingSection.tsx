import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';
import { usePricingPlans, PricingPlan, PlanFeature } from '@/hooks/usePricingPlans';

const PricingSection: React.FC = () => {
  const { plans, loading, error } = usePricingPlans();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load pricing plans. Please try again later.</p>
      </div>
    );
  }

  // If no plans are available, show a fallback
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p>No pricing plans available at the moment. Please check back later.</p>
      </div>
    );
  }

  // Set the Professional plan as the popular plan
  const popularPlanIndex = plans.findIndex(plan => 
    plan.PLAN_NAME.toLowerCase() === 'professional'
  );

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md ${
              billingCycle === 'monthly' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-md ${
              billingCycle === 'yearly' ? 'bg-white dark:bg-gray-700 shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Yearly <span className="text-green-500 text-xs">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Ensure plans are displayed in the correct order: Free, Basic, Professional, Enterprise */}
        {plans.map((plan, index) => (
          <motion.div
            key={plan.ID}
            whileHover={{ scale: 1.02 }}
            className={`glass-card p-8 dark:bg-gray-800/80 dark:border-gray-700 ${
              index === popularPlanIndex ? 'border-2 border-indigo-500 relative' : ''
            }`}
          >
            {index === popularPlanIndex && (
              <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1 rounded-bl-lg">
                Popular
              </div>
            )}
            {plan.IS_FREE === 'Y' && (
              <div className="absolute top-0 left-0 bg-green-500 text-white px-4 py-1 rounded-br-lg">
                Free
              </div>
            )}
            <h3 className="text-xl font-bold mb-4 dark:text-white">{plan.PLAN_NAME}</h3>
            <div className="mb-2">
              {plan.PLAN_NAME.toLowerCase() === 'enterprise' ? (
                <span className="text-2xl font-bold dark:text-white">Custom Pricing</span>
              ) : (
                <>
                  <span className="text-4xl font-bold dark:text-white">
                    ${billingCycle === 'monthly' ? plan.PRICE_MONTHLY : plan.PRICE_YEARLY}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </>
              )}
            </div>
            {plan.PLAN_DESCRIPTION && (
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">{plan.PLAN_DESCRIPTION}</p>
            )}
            <ul className="space-y-4 mb-8">
              {/* User Limit */}
              {plan.features?.find(f => f.FEATURE_KEY === 'USER_LIMIT') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {(() => {
                      const feature = plan.features?.find(f => f.FEATURE_KEY === 'USER_LIMIT');
                      if (feature?.VALUE_TEXT === 'Unlimited') return 'Unlimited users';
                      if (feature?.VALUE_NUM) {
                        return `${feature.VALUE_NUM} ${feature.VALUE_NUM === 1 ? 'user' : 'users'}`;
                      }
                      return 'User limit not specified';
                    })()}
                  </span>
                </li>
              )}
              
              {/* Database Limit */}
              {plan.features?.find(f => f.FEATURE_KEY === 'DB_LIMIT') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {(() => {
                      const feature = plan.features?.find(f => f.FEATURE_KEY === 'DB_LIMIT');
                      if (feature?.VALUE_TEXT === 'Unlimited') return 'Unlimited databases';
                      if (feature?.VALUE_NUM) {
                        return `${feature.VALUE_NUM} ${feature.VALUE_NUM === 1 ? 'database' : 'databases'}`;
                      }
                      return 'Database limit not specified';
                    })()}
                  </span>
                </li>
              )}
              
              {/* Query Limit */}
              {plan.features?.find(f => f.FEATURE_KEY === 'QUERY_LIMIT') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {(() => {
                      const feature = plan.features?.find(f => f.FEATURE_KEY === 'QUERY_LIMIT');
                      if (feature?.VALUE_TEXT === 'Unlimited') return 'Unlimited queries/month';
                      if (feature?.VALUE_NUM) {
                        return `${feature.VALUE_NUM.toLocaleString()} queries/month`;
                      }
                      return 'Query limit not specified';
                    })()}
                  </span>
                </li>
              )}
              
              {/* Dashboard Builder */}
              {plan.features?.find(f => f.FEATURE_KEY === 'DASHBOARD_BUILDER') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {(() => {
                      const feature = plan.features?.find(f => f.FEATURE_KEY === 'DASHBOARD_BUILDER');
                      if (feature?.VALUE_TEXT === 'Unlimited') return 'Unlimited Dashboard Builder';
                      if (feature?.VALUE_NUM) {
                        return `${feature.VALUE_NUM} Dashboard Builder`;
                      }
                      return feature?.VALUE_FLAG === 'N' ? 'Dashboard Builder (Limited)' : 'Dashboard Builder';
                    })()} 
                  </span>
                </li>
              )}
              
              {/* Support Level */}
              {plan.features?.find(f => f.FEATURE_KEY === 'SUPPORT_LEVEL') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {plan.features?.find(f => f.FEATURE_KEY === 'SUPPORT_LEVEL')?.VALUE_TEXT || 'Support'}
                  </span>
                </li>
              )}
              
              {/* AI Model */}
              {plan.features?.find(f => f.FEATURE_KEY === 'AI_MODEL') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    {plan.features?.find(f => f.FEATURE_KEY === 'AI_MODEL')?.VALUE_TEXT || 'AI Model'}
                  </span>
                </li>
              )}
              
              {/* API Access */}
              {plan.features?.find(f => f.FEATURE_KEY === 'API_ACCESS') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">API Access</span>
                </li>
              )}
              
              {/* Integrations */}
              {plan.features?.find(f => f.FEATURE_KEY === 'INTEGRATIONS') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">
                    Integrations: {plan.features?.find(f => f.FEATURE_KEY === 'INTEGRATIONS')?.VALUE_TEXT || 'Available'}
                  </span>
                </li>
              )}
              
              {/* White Label */}
              {plan.features?.find(f => f.FEATURE_KEY === 'WHITE_LABEL') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">White Label Solution</span>
                </li>
              )}
              
              {/* On Premise */}
              {plan.features?.find(f => f.FEATURE_KEY === 'ON_PREMISE') && (
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span className="dark:text-gray-300">On-Premise Deployment</span>
                </li>
              )}
            </ul>
            <button className={`w-full ${index === popularPlanIndex ? 'btn-primary dark:bg-indigo-700 dark:hover:bg-indigo-600' : index === plans.length - 1 ? 'btn-secondary dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600' : 'btn-primary dark:bg-indigo-700 dark:hover:bg-indigo-600'}`}>
              {plan.PLAN_NAME.toLowerCase().includes('enterprise') 
                ? 'Contact Sales' 
                : 'Get Started'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PricingSection;
