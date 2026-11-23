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
      <div className="glass-modal p-3 rounded-xl">
        <p className="eyebrow text-[#8EA39A] mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm text-[#EDF4F0] font-medium">
              {entry.name}: <span className="font-mono tabular-nums">{entry.value}%</span>
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="eyebrow text-[#34D399] mb-1">GROWTH INSIGHTS</div>
          <h1 className="text-3xl font-serif italic tracking-tight text-[#EDF4F0]">Growth Analytics</h1>
          <p className="text-[#8EA39A] mt-1 text-sm">Detailed breakdown of Dawah efforts and organizational growth.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="eyebrow text-[#8EA39A]">Community Growth Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="name" stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Growth Score" stroke="#34D399" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[#8EA39A]">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="stage" stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" name="Members" fill="#F4A85E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="eyebrow text-[#8EA39A]">Engagement vs Growth Correlation</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="name" stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8EA39A" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Avg Growth" stroke="#34D399" strokeWidth={2.5} dot={{ r: 4, fill: '#0A1210', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="engagement" name="Avg Engagement" stroke="#E8CD92" strokeWidth={2.5} dot={{ r: 4, fill: '#0A1210', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
