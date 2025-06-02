//app/page.tsx
'use client';

import { motion } from 'framer-motion';
import QueryLogo from '../components/QueryLogo';
import { 
  ChevronRightIcon, 
  SparklesIcon,
  CpuChipIcon,
  CodeBracketIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
  TableCellsIcon,
  UserIcon,
  AcademicCapIcon,
  HeartIcon,
  HomeIcon,
  BuildingLibraryIcon,
  CommandLineIcon,
  BanknotesIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowRightIcon,
  CheckIcon as HeroCheckIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useState } from 'react';
import PricingSection from '../components/PricingSection';

const demoData = [
  { category: 'Electronics', sales: 45000, growth: 12.5, month: 'Jan' },
  { category: 'Clothing', sales: 35000, growth: 8.2, month: 'Jan' },
  { category: 'Books', sales: 15000, growth: 5.7, month: 'Jan' },
  { category: 'Home & Garden', sales: 25000, growth: 9.3, month: 'Jan' },
  { category: 'Sports', sales: 20000, growth: 7.8, month: 'Jan' }
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'chart'>('table');

  return (
    <div className="min-h-screen grid-pattern dark:bg-gray-900">
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
          <a href="/" className="flex items-center">
          <QueryLogo />
        </a>
                    
            <div className="hidden md:flex items-center justify-center space-x-8 flex-1">
              <a href="/" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">Home</a>
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors">Contact</a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/login'} 
                className="btn-secondary flex items-center space-x-2"
              >
                <UserIcon className="w-5 h-5" />
                <span>Login</span>
              </button>
              <button 
                onClick={() => window.location.href = '/register'}
                className="btn-primary"
              >
                Try It Free
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-primary"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-8 w-8" />
                ) : (
                  <Bars3Icon className="h-8 w-8 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>
          
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden py-4"
            >
              <div className="flex flex-col space-y-4">
                <a 
                  href="/" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="#features" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a 
                  href="#pricing" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a 
                  href="#contact" 
                  className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="flex flex-col space-y-2 px-4">
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="btn-secondary flex items-center justify-center space-x-2"
                  >
                    <UserIcon className="w-5 h-5" />
                    <span>Login</span>
                  </button>
                  <button 
                    onClick={() => window.location.href = '/register'}
                    className="btn-primary"
                  >
                    Try It Free
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      <section className="pt-32 pb-20 relative hero-gradient dark:bg-gray-900 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
              <span className="text-indigo-600">Natural Language</span>
              <br />
              <span className="text-gray-700 dark:text-gray-200">to SQL Queries</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8">
              Transform your questions into powerful SQL queries using advanced AI.
              No more complex syntax, just ask naturally.
            </p>

            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => window.location.href = '/register'}
                className="btn-primary flex items-center justify-center"
              >
                Start Free Trial
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </button>
              <button className="btn-secondary">
                Watch Demo
              </button>
            </div>
          </div>

          <div className="mt-16">
            <div className="glass-card p-6 dark:bg-gray-800/80 dark:border-gray-700">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
                  <span className="text-sm">Example Query</span>
                </div>
                <div className="input-field flex items-center dark:bg-gray-800 dark:border-gray-700">
                  <span className="dark:text-gray-300">Show me sales from last month grouped by product category</span>
                </div>
                <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                  <CodeBracketIcon className="w-5 h-5" />
                  <span className="text-sm">Generated SQL</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/90 rounded-xl p-4 font-mono text-sm border border-gray-200 dark:border-gray-700">
                  <pre className="text-gray-800 dark:text-gray-200">
                    SELECT category, SUM(amount) as total_sales<br />
                    FROM sales<br />
                    WHERE date &gt;= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)<br />
                    GROUP BY category<br />
                    ORDER BY total_sales DESC;
                  </pre>
                </div>

                <div className="flex space-x-4 mt-4">
                  <button
                    className={`tab flex items-center space-x-2 ${activeTab === 'table' ? 'active' : ''} dark:text-gray-300 dark:hover:text-gray-100`}
                    onClick={() => setActiveTab('table')}
                  >
                    <TableCellsIcon className="w-5 h-5" />
                    <span>Table View</span>
                  </button>
                  <button
                    className={`tab flex items-center space-x-2 ${activeTab === 'chart' ? 'active' : ''} dark:text-gray-300 dark:hover:text-gray-100`}
                    onClick={() => setActiveTab('chart')}
                  >
                    <ChartBarIcon className="w-5 h-5" />
                    <span>Chart View</span>
                  </button>
                </div>

                <div className="mt-4">
                  {activeTab === 'table' ? (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Sales</th>
                            <th>Growth</th>
                            <th>Month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {demoData.map((row, index) => (
                            <tr key={index}>
                              <td>{row.category}</td>
                              <td>${row.sales.toLocaleString()}</td>
                              <td>{row.growth}%</td>
                              <td>{row.month}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demoData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--primary), 0.1)" className="dark:opacity-50" />
                          <XAxis 
                            dataKey="category" 
                            stroke="rgb(var(--text))" 
                            className="dark:text-gray-100" 
                            tick={{
                              fill: 'rgb(var(--text))', 
                              className: 'dark:fill-gray-100'
                            }} 
                            tickLine={{ stroke: 'rgb(var(--text))', className: 'dark:stroke-gray-100' }}
                          />
                          <YAxis 
                            stroke="rgb(var(--text))" 
                            className="dark:text-gray-100" 
                            tick={{
                              fill: 'rgb(var(--text))', 
                              className: 'dark:fill-gray-100'
                            }}
                            tickLine={{ stroke: 'rgb(var(--text))', className: 'dark:stroke-gray-100' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgb(var(--background))',
                              border: '1px solid rgb(var(--primary))',
                              borderRadius: '8px',
                              color: 'rgb(var(--text))',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              fontWeight: 500
                            }}
                            itemStyle={{
                              color: 'rgb(var(--text))',
                              fontWeight: 500
                            }}
                            labelStyle={{
                              color: 'rgb(var(--text))',
                              fontWeight: 600
                            }}
                          />
                          <Bar 
                            dataKey="sales" 
                            fill="rgb(var(--primary))" 
                            className="dark:opacity-90" 
                            name="Sales"
                            label={{
                              position: 'top',
                              fill: 'rgb(var(--text))',
                              className: 'dark:fill-white font-medium',
                              formatter: (value: number) => `${value}`
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">Powerful Features</h2>
            <p className="text-lg sm:text-xl text-gray-400 dark:text-gray-300">Advanced capabilities powered by AI</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="feature-card"
            >
              <SparklesIcon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Natural Language</h3>
              <p className="text-gray-400 dark:text-gray-300">Ask questions in plain English and get accurate SQL queries</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="feature-card"
            >
              <CpuChipIcon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-400 dark:text-gray-300">Advanced machine learning for precise query generation</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="feature-card"
            >
              <TableCellsIcon className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Multi-Database</h3>
              <p className="text-gray-400 dark:text-gray-300">Works with MySQL, PostgreSQL, SQL Server, and Oracle</p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50 dark:bg-gray-800" id="demo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">
              Unlock Instant SQL Insights Across Any Industry
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-12">
              Empower your team to ask questions in plain language and get immediate, accurate SQL queries—no coding required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <AcademicCapIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Education & Research</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automate the creation of SQL queries to track student performance, enrollment analytics, and research outputs—streamlining reporting for faculty and staff.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <HeartIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Healthcare & Medical Software</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Quickly generate HIPAA-compliant SQL queries to analyze patient demographics, appointment trends, and billing data, reducing administrative hours and improving patient care.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <HomeIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Real Estate & Property Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate SQL queries to analyze property listings, track maintenance requests, and monitor rental payments—optimizing property portfolio management.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <BuildingLibraryIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Government & Public Sector</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simplify database operations for public services, enabling efficient data analysis and reporting while maintaining compliance with government regulations.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <CommandLineIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Tech Consulting & Software Development</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Accelerate development workflows by instantly generating optimized SQL queries for various database operations and integrations.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, translateY: -5 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700"
            >
              <BanknotesIcon className="w-12 h-12 text-indigo-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Finance & Accounting</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Streamline financial reporting and analysis with instant SQL query generation for transaction tracking, revenue analysis, and compliance reporting.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">Simple, Transparent Pricing</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">Choose the plan that's right for you</p>
          </motion.div>

          <PricingSection />
        </div>
      </section>
      
      <section className="py-20 bg-gray-50 dark:bg-gray-800" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 gradient-text">Get in Touch</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300">Have questions? We're here to help!</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-8 dark:bg-gray-800/80 dark:border-gray-700">
              <h3 className="text-2xl font-semibold mb-6">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <EnvelopeIcon className="w-6 h-6 text-indigo-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Email</h4>
                    <a href="mailto:info@myquery.ai" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      info@myquery.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <PhoneIcon className="w-6 h-6 text-indigo-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Phone</h4>
                    <a href="tel:+1234567890" className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <MapPinIcon className="w-6 h-6 text-indigo-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Location</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      123 AI Street, Tech Valley<br />
                      San Francisco, CA 94105
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 dark:bg-gray-800/80 dark:border-gray-700">
              <h3 className="text-2xl font-semibold mb-6">Send us a Message</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors dark:bg-indigo-700 dark:hover:bg-indigo-800"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>



      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">MYQUERY.AI</h3>
              <p className="text-gray-400 dark:text-gray-300">
                Transform natural language into powerful SQL queries with advanced AI technology.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Careers</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 dark:text-gray-300">© 2025 MyQuery. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">
                  <TwitterIcon className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">
                  <GitHubIcon className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white dark:text-gray-300 dark:hover:text-white">
                  <LinkedInIcon className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CheckIcon(props: any) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function TwitterIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
    </svg>
  );
}

function GitHubIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LinkedInIcon(props: any) {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
        clipRule="evenodd"
      />
    </svg>
  );
}