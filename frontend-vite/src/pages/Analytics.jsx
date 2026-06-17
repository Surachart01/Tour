import React, { useState } from 'react';
import { Card, Row, Col, Space, Table, Select, Tag } from 'antd';
import { AreaChart, BarChart3, TrendingUp, DollarSign, Briefcase, Percent } from 'lucide-react';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('6months');

  // Mock statistics data
  const kpis = [
    { title: 'Total Sales Revenue', value: '458,200 THB', change: '+12.4%', up: true, icon: <DollarSign className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
    { title: 'Net Margin Profit', value: '78,400 THB', change: '+8.2%', up: true, icon: <TrendingUp className="w-5 h-5 text-sky-500" />, bg: 'bg-sky-50' },
    { title: 'Active Bookings', value: '64 Quotes', change: '+14.5%', up: true, icon: <Briefcase className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50' },
    { title: 'Average Margin Rate', value: '17.1%', change: '-0.4%', up: false, icon: <Percent className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' }
  ];

  const topAgents = [
    { key: 1, name: 'Vera Thailandia Online', bookings: 42, revenue: 310000, status: 'Active' },
    { key: 2, name: 'B2B Travel Partner Europe', bookings: 18, revenue: 128200, status: 'Active' },
    { key: 3, name: 'Direct Customer Web', bookings: 4, revenue: 20000, status: 'Inactive' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 m-0">Analytics</h1>
          <p className="text-slate-500 m-0 mt-1">Review operational revenue, net margin analytics, partner agency distributions, and booking margins</p>
        </div>
        <Select value={timeframe} onChange={setTimeframe} className="w-36 rounded-lg shadow-sm">
          <Select.Option value="30days">Last 30 Days</Select.Option>
          <Select.Option value="6months">Last 6 Months</Select.Option>
          <Select.Option value="1year">Last 1 Year</Select.Option>
        </Select>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold m-0 uppercase tracking-wider">{kpi.title}</p>
                <h2 className="text-2xl font-black text-slate-800 mt-2 mb-1">{kpi.value}</h2>
                <span className={`text-xs font-bold ${kpi.up ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.change} vs last month
                </span>
              </div>
              <div className={`p-3.5 rounded-2xl ${kpi.bg}`}>
                {kpi.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Charts Row - Rendered with beautiful, lightweight inline SVG components */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Area Chart */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><AreaChart className="w-5 h-5 text-sky-600" /> Sales Revenue Timeline</span>} className="border-none shadow-sm rounded-2xl lg:col-span-2">
          <div className="h-64 flex flex-col justify-between mt-4">
            {/* SVG Area Chart */}
            <div className="relative w-full h-48 bg-slate-50/50 rounded-xl overflow-hidden p-2">
              <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area path */}
                <path d="M 0 100 L 0 80 Q 50 60 100 75 T 200 40 T 300 50 T 400 25 T 500 20 L 500 100 Z" fill="url(#areaGrad)" />
                {/* Line path */}
                <path d="M 0 80 Q 50 60 100 75 T 200 40 T 300 50 T 400 25 T 500 20" fill="none" stroke="#0284c7" strokeWidth="2.5" />
                {/* Data Points */}
                <circle cx="100" cy="75" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                <circle cx="200" cy="40" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                <circle cx="300" cy="50" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                <circle cx="400" cy="25" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                <circle cx="500" cy="20" r="4" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
              </svg>
            </div>
            {/* X Axis labels */}
            <div className="flex justify-between text-xs text-slate-400 font-semibold px-2">
              <span>JAN</span>
              <span>FEB</span>
              <span>MAR</span>
              <span>APR</span>
              <span>MAY</span>
              <span>JUN</span>
            </div>
          </div>
        </Card>

        {/* Bookings breakdown by Service */}
        <Card title={<span className="font-bold text-slate-800 text-sm flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> Service Classification</span>} className="border-none shadow-sm rounded-2xl">
          <div className="h-64 flex flex-col justify-around py-2">
            {/* Custom styled progress bars */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                <span>HOTELS</span>
                <span>48% (148.8k THB)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: '48%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                <span>TOURS</span>
                <span>28% (86.8k THB)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                <span>EXCURSIONS</span>
                <span>14% (43.4k THB)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '14%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                <span>TRANSFERS</span>
                <span>10% (31k THB)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performing Agents Table */}
      <Card title={<span className="font-bold text-slate-800 text-sm">Top Agency Affiliates</span>} className="border-none shadow-sm rounded-2xl overflow-hidden">
        <Table
          dataSource={topAgents}
          pagination={false}
          columns={[
            { title: 'Agency Partner Name', dataIndex: 'name', key: 'name', render: (text) => <span className="font-bold text-slate-700 text-sm">{text}</span> },
            { title: 'Total Bookings Issued', dataIndex: 'bookings', key: 'bookings', render: (val) => <span className="font-semibold text-slate-600">{val} quotes</span> },
            { title: 'Gross Revenue Volume', dataIndex: 'revenue', key: 'revenue', render: (val) => <strong className="text-emerald-600">{(val || 0).toLocaleString()} THB</strong> },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag> }
          ]}
          className="border border-slate-100 rounded-xl overflow-hidden shadow-inner"
        />
      </Card>
    </div>
  );
}
