export default function StatCard({ icon: Icon, value, label, color = 'blue', subtitle }) {
  const colorSchemes = {
    blue: { bg: '#eff6ff', color: '#2563eb', border: '#dbeafe' },
    purple: { bg: '#f3e8ff', color: '#7c3aed', border: '#e9d5ff' },
    orange: { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
    red: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    green: { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' },
    cyan: { bg: '#ecfeff', color: '#0891b2', border: '#cffaff' },
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;

  return (
    <div className="stat-card-pro">
      <div>
        <div className="stat-header">
          <div
            className="stat-icon-wrapper"
            style={{ background: scheme.bg, color: scheme.color, border: `1px solid ${scheme.border}` }}
          >
            {Icon && <Icon size={20} />}
          </div>
        </div>

        <div className="stat-val-large">{value ?? 0}</div>
        <div className="stat-title-text">{label}</div>
      </div>

      {subtitle && <div className="stat-sub-text">{subtitle}</div>}
    </div>
  );
}
