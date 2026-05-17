"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function RevenueChart({ data }: { data: any[] }) {
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.1)" vertical={false} />
          <XAxis dataKey="name" stroke="#8e7ab5" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#8e7ab5" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
          <Tooltip 
            cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }} 
            contentStyle={{ backgroundColor: 'rgba(18, 4, 36, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '12px', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }} 
            itemStyle={{ color: '#f5f3ff', fontWeight: 600 }}
          />
          <Bar dataKey="revenue" fill="#8B5CFF" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
