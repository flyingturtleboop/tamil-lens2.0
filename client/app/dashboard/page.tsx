'use client';

export default function DashboardPage() {
  const cards = [
    { title: 'Words Learned', value: '124', delta: '+12 this week', color: 'from-cyan-500 to-teal-500' },
    { title: 'Sessions', value: '34', delta: '+5 this week', color: 'from-emerald-500 to-green-500' },
    { title: 'Quiz Accuracy', value: '78%', delta: '+3%', color: 'from-yellow-500 to-orange-500' },
    { title: 'Streak', value: '7 days', delta: 'Keep it up!', color: 'from-sky-500 to-indigo-500' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.title} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">{c.title}</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-bold text-slate-900">{c.value}</div>
              <span className={`text-xs font-semibold text-white rounded-full px-2 py-1 bg-gradient-to-r ${c.color}`}>
                {c.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-800">Study Activity</div>
          <div className="mt-4 h-64 rounded-lg bg-slate-100 grid place-items-center text-slate-500">
            Chart placeholder
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-slate-800">Skill Breakdown</div>
          <div className="mt-4 h-64 rounded-lg bg-slate-100 grid place-items-center text-slate-500">
            Donut chart placeholder
          </div>
        </div>
      </div>
    </div>
  );
}
