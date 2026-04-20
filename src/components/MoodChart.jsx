import { useTheme } from '../contexts/ThemeContext';

/**
 * MoodChart – Gráfico SVG puro de evolução do humor do paciente.
 * Props:
 *   sessoes: array de { data_sessao, humor, observacoes }
 */
export default function MoodChart({ sessoes }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Filter sessions that have a humor value and sort by date
  const data = sessoes
    .filter(s => s.humor !== undefined && s.humor !== null && s.humor !== '')
    .map(s => ({
      data: s.data_sessao,
      humor: Number(s.humor),
      obs: s.observacoes || '',
    }))
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>Registre pelo menos 2 sessões com nota de humor para ver o gráfico.</p>
      </div>
    );
  }

  // SVG dimensions
  const W = 600;
  const H = 180;
  const padLeft = 36;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  // Scale
  const xStep = chartW / (data.length - 1);
  const yScale = (val) => padTop + chartH - ((val - 1) / 9) * chartH;

  const points = data.map((d, i) => [padLeft + i * xStep, yScale(d.humor)]);

  // SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

  // Smooth bezier
  const smoothD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const prev = arr[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return acc + ` C${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }, '');

  // Gradient color based on value: 1(red) → 5(yellow) → 10(green)
  const humorColor = (v) => {
    if (v <= 3) return '#f87171'; // red
    if (v <= 6) return '#fbbf24'; // yellow
    return '#34d399'; // green
  };

  const formatDate = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Evolução do Humor
        </h4>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Crítico</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/>Moderado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Bom</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[400px]" style={{ height: H }}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={isDark ? "0.3" : "0.15"} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {[1, 3, 5, 7, 10].map(val => (
            <g key={val}>
              <line
                x1={padLeft} y1={yScale(val)} x2={W - padRight} y2={yScale(val)}
                stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} strokeWidth="1"
              />
              <text x={padLeft - 6} y={yScale(val) + 4} textAnchor="end" fontSize="9" fill={isDark ? "#94a3b8" : "#0f172a"} fontWeight="bold">{val}</text>
            </g>
          ))}

          {/* Area fill */}
          <path
            d={`${smoothD} L${points[points.length - 1][0]},${padTop + chartH} L${points[0][0]},${padTop + chartH} Z`}
            fill="url(#moodGradient)"
          />

          {/* Line */}
          <path d={smoothD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points + labels */}
          {points.map((p, i) => (
            <g key={i}>
              {/* X axis date label */}
              <text
                x={p[0]} y={H - 4}
                textAnchor="middle" fontSize="8" fill={isDark ? "#94a3b8" : "#0f172a"}
                fontWeight="bold"
              >
                {formatDate(data[i].data)}
              </text>
              {/* Circle */}
              <circle cx={p[0]} cy={p[1]} r={5} fill={humorColor(data[i].humor)} stroke={isDark ? "#18181b" : "#ffffff"} strokeWidth="2.5" />
              {/* Value label */}
              <text
                x={p[0]} y={p[1] - 9}
                textAnchor="middle" fontSize="9" fontWeight="bold" fill={humorColor(data[i].humor)}
              >
                {data[i].humor}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
