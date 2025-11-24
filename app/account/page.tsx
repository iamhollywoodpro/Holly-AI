'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  CreditCardIcon,
  BoltIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';

interface UsageStats {
  messagesUsed: number;
  messagesLimit: number;
  storageUsed: number;
  storageLimit: number;
  aiCallsUsed: number;
  aiCallsLimit: number;
  period: string;
}

export default function AccountPage() {
  const { user, isLoaded } = useUser();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/user/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch usage stats:', error);
    }
  };

  const currentPlan = 'free'; // TODO: Get from database

  const plans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: { monthly: 0, annually: 0 },
      features: [
        '100 AI messages per month',
        '500 MB storage',
        'Basic GitHub integration',
        'Community support',
        '1 active project'
      ],
      color: 'from-gray-600 to-gray-700',
      icon: SparklesIcon,
      cta: currentPlan === 'free' ? 'Current Plan' : 'Downgrade',
      disabled: currentPlan === 'free'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: { monthly: 20, annually: 192 }, // $16/mo annually
      features: [
        '5,000 AI messages per month',
        '50 GB storage',
        'Advanced GitHub integration',
        'Priority support',
        'Unlimited projects',
        'Custom AI training',
        'Team collaboration (3 members)'
      ],
      color: 'from-purple-600 to-pink-600',
      icon: BoltIcon,
      popular: true,
      cta: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      disabled: currentPlan === 'pro'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 99, annually: 948 }, // $79/mo annually
      features: [
        'Unlimited AI messages',
        'Unlimited storage',
        'Full GitHub & Drive integration',
        'Dedicated support',
        'Unlimited projects',
        'Advanced AI customization',
        'Unlimited team members',
        'SSO & SAML',
        'API access',
        'Custom deployment'
      ],
      color: 'from-blue-600 to-cyan-600',
      icon: BuildingOffice2Icon,
      cta: currentPlan === 'enterprise' ? 'Current Plan' : 'Contact Sales',
      disabled: currentPlan === 'enterprise'
    }
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Chat
            </a>
            <div className="h-6 w-px bg-gray-800" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Account & Billing
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Current Plan & Usage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Usage This Month</h2>
              <span className="text-sm text-gray-400">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                Resets in 12 days
              </span>
            </div>

            {usage && (
              <div className="space-y-6">
                {/* Messages Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">AI Messages</span>
                    <span className="text-sm text-white font-semibold">
                      {usage.messagesUsed} / {usage.messagesLimit}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${(usage.messagesUsed / usage.messagesLimit) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Storage Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Storage</span>
                    <span className="text-sm text-white font-semibold">
                      {(usage.storageUsed / 1024 / 1024).toFixed(1)} MB / {(usage.storageLimit / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${(usage.storageUsed / usage.storageLimit) * 100}%` }}
                    />
                  </div>
                </div>

                {/* API Calls Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">AI API Calls</span>
                    <span className="text-sm text-white font-semibold">
                      {usage.aiCallsUsed} / {usage.aiCallsLimit}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${(usage.aiCallsUsed / usage.aiCallsLimit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Current Plan Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Current Plan</h3>
              <SparklesIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">Free Tier</div>
            <div className="text-gray-400 text-sm mb-4">$0/month</div>
            <button
              onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors"
            >
              Upgrade Plan
            </button>
          </motion.div>
        </div>

        {/* Billing Cycle Toggle */}
        <div id="plans" className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annually')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingCycle === 'annually'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Annually
            <span className="ml-2 text-xs text-green-400">Save 20%</span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annually;
            const priceLabel = billingCycle === 'monthly' ? 'per month' : 'per year';
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-gray-900/50 border rounded-xl p-6 ${
                  plan.popular
                    ? 'border-purple-500'
                    : 'border-gray-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${plan.color} mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-white mb-1">
                  ${price}
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    {price === 0 ? 'forever' : `/${billingCycle === 'monthly' ? 'mo' : 'yr'}`}
                  </span>
                </div>
                {billingCycle === 'annually' && price > 0 && (
                  <div className="text-sm text-gray-400 mb-4">
                    ${(price / 12).toFixed(0)}/month billed annually
                  </div>
                )}

                <ul className="space-y-3 mb-6 mt-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={plan.disabled}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                    plan.disabled
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment Method (placeholder) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-gray-900/50 border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Payment Method</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-800 rounded-lg">
                <CreditCardIcon className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <div className="text-sm text-gray-400">No payment method on file</div>
                <div className="text-xs text-gray-500 mt-1">Add a payment method to upgrade</div>
              </div>
            </div>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors">
              Add Card
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
