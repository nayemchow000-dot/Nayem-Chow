import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

const growthData = [
  { name: 'Week 1', score: 32, engagement: 20 },
  { name: 'Week 2', score: 38, engagement: 25 },
  { name: 'Week 3', score: 45, engagement: 30 },
  { name: 'Week 4', score: 55, engagement: 45 },
  { name: 'Week 5', score: 68, engagement: 50 },
  { name: 'Week 6', score: 75, engagement: 65 },
];

const stageDistribution = [
  { stage: 'Initial', count: 12 },
  { stage: 'Mosque', count: 19 },
  { stage: 'Fajr', count: 8 },
  { stage: 'Amal', count: 3 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#16161A] border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-[10px] uppercase tracking-widest text-white/60 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm text-[#E5E5E7] font-medium">
              {entry.name}: <span className="font-mono">{entry.value}%</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif italic tracking-tight text-[#E5E5E7]">Growth Analytics</h1>
          <p className="text-white/40 mt-1 text-sm">Detailed breakdown of Dawah efforts and organizational growth.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#16161A] border-white/5 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Community Growth Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Growth Score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#16161A] border-white/5">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="stage" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="count" name="Members" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#16161A] border-white/5 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-widest text-white/60 font-semibold">Engagement vs Growth Correlation</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Avg Growth" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#16161A', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="engagement" name="Avg Engagement" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#16161A', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
