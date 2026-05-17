"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function RevenueChart({ data }: { data: any[] }) {
  return (
    <div className="w-full h-[220px] sm:h-[300px] lg:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" vertical={false} />
          <XAxis dataKey="name" stroke="#8e7ab5" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#8e7ab5" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`} width={48} />
          <Tooltip 
            cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }} 
            contentStyle={{ backgroundColor: 'rgba(18, 4, 36, 0.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '14px', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }} 
            itemStyle={{ color: '#f5f3ff', fontWeight: 600 }}
            formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#8B5CFF" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
