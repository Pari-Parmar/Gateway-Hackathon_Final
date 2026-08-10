import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

const CHART_COLORS = {
  ACCOUNT: '#4f46e5',
  BILLING: '#d97706',
  PAYMENT: '#dc2626',
  ORDER: '#0891b2',
  DELIVERY: '#7c3aed',
  REFUND: '#ea580c',
  TECHNICAL: '#2563eb',
  SECURITY: '#b91c1c',
  COMPLAINT: '#db2777',
  INFORMATION: '#16a34a',
  OTHER: '#64748b',
  OUT_OF_SCOPE: '#475569',
};

const PRIORITY_COLORS = {
  P0: '#dc2626',
  P1: '#ea580c',
  P2: '#2563eb',
  P3: '#16a34a',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 12.5, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export function CategoryChart({ data = [] }) {
  const chartData = data.map(([cat, count]) => ({
    name: cat.length > 8 ? cat.slice(0, 8) + '…' : cat,
    fullName: cat,
    count,
    fill: CHART_COLORS[cat] || '#64748b',
  }));

  return (
    <div className="card">
      <div className="card-title">Messages by Category</div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriorityChart({ data = [] }) {
  const chartData = data.map(([p, count]) => ({ name: p, value: count, fill: PRIORITY_COLORS[p] || '#64748b' }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card">
      <div className="card-title">Priority Distribution</div>
      {total === 0 ? (
        <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          No triage data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]}
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: '#0f172a' }}
            />
            <Legend
              formatter={(value) => <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{value}</span>}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function RoutingChart({ data = {} }) {
  const chartData = [
    { name: 'Auto Route', value: data.auto || 0, fill: '#16a34a' },
    { name: 'Human Review', value: data.human || 0, fill: '#ea580c' },
    { name: 'Blocked', value: data.blocked || 0, fill: '#dc2626' },
    { name: 'Clarify', value: data.clarify || 0, fill: '#d97706' },
  ].filter(d => d.value > 0);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card">
      <div className="card-title">Routing Decisions</div>
      {total === 0 ? (
        <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          No decision data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%" cy="50%"
              innerRadius={55} outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} (${((value / total) * 100).toFixed(0)}%)`]}
              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: '#0f172a' }}
            />
            <Legend
              formatter={(value) => <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{value}</span>}
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ConfidenceChart({ data = [] }) {
  const buckets = [
    { name: '0-40%', range: [0, 0.4] },
    { name: '40-60%', range: [0.4, 0.6] },
    { name: '60-80%', range: [0.6, 0.8] },
    { name: '80-100%', range: [0.8, 1.01] },
  ];

  const chartData = buckets.map(bucket => ({
    name: bucket.name,
    count: data.filter(v => v >= bucket.range[0] && v < bucket.range[1]).length,
    fill: bucket.range[0] >= 0.8 ? '#16a34a' : bucket.range[0] >= 0.6 ? '#2563eb' : bucket.range[0] >= 0.4 ? '#d97706' : '#dc2626',
  }));

  return (
    <div className="card">
      <div className="card-title">Confidence Score Distribution</div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="count" name="Cases" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
