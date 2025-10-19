export default function DashboardHome() {
  const stats = [
    { title: 'Weekly Scans', value: '24', change: '+8 this week', icon: '📸', trend: 'up' },
    { title: 'Words Learned', value: '152', change: '+12 this week', icon: '📚', trend: 'up' },
    { title: 'Quiz Streak', value: '5 days', change: 'Keep going!', icon: '🔥', trend: 'neutral' },
    { title: 'Accuracy', value: '87%', change: '+3% improvement', icon: '🎯', trend: 'up' },
  ];

  const recentActivity = [
    { word: 'வாழைப்பழம்', english: 'banana', translit: 'vāḻaippaḻam', time: '2 hours ago' },
    { word: 'புத்தகம்', english: 'book', translit: 'puttakam', time: '5 hours ago' },
    { word: 'நீர்', english: 'water', translit: 'nīr', time: '1 day ago' },
  ];

  const milestones = [
    { label: '50 Words', achieved: true },
    { label: '100 Words', achieved: true },
    { label: '200 Words', achieved: false, progress: 76 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, Learner!</h1>
            <p className="text-cyan-50 text-lg">You're doing great! Keep up the momentum.</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
            <div className="text-4xl font-bold">152</div>
            <div className="text-sm text-cyan-50 mt-1">Total Words</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="text-3xl">{stat.icon}</div>
              {stat.trend === 'up' && (
                <div className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1 rounded-full">
                  ↑ Trending
                </div>
              )}
            </div>
            <div className="text-sm text-slate-600 mb-1">{stat.title}</div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-900">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                📸
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Scan Object</div>
                <div className="text-sm text-cyan-50">Point & learn new words</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-2xl">
                🧠
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">Take Quiz</div>
                <div className="text-sm text-slate-600">Test your knowledge</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">
                🗂️
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">My Word List</div>
                <div className="text-sm text-slate-600">Review saved words</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-900">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-cyan-50 transition-all border border-transparent hover:border-cyan-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold">
                  {item.english[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{item.word}</div>
                  <div className="text-sm text-slate-600 truncate">{item.english} • {item.translit}</div>
                </div>
                <div className="text-xs text-slate-500">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-900">Learning Milestones</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {milestones.map((milestone, i) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${
              milestone.achieved 
                ? 'border-emerald-200 bg-emerald-50' 
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  milestone.achieved 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-300 text-slate-600'
                }`}>
                  {milestone.achieved ? '✓' : '○'}
                </div>
                <div className="font-semibold text-slate-900">{milestone.label}</div>
              </div>
              {!milestone.achieved && milestone.progress && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>{milestone.progress}%</span>
                    <span>{Math.round(200 * milestone.progress / 100)}/200</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Highlight */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2 text-slate-900">How Tamil Lens Works</h3>
            <p className="text-slate-700 mb-3">
              Point your camera at any object around you. Tamil Lens will identify it and teach you the Tamil word with proper pronunciation. Each word you scan is automatically added to your personal collection and quiz bank.
            </p>
            <div className="flex items-center gap-2 text-sm text-violet-700">
              <span className="font-medium">Ready to start?</span>
              <button className="font-semibold hover:underline">Scan your first object →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}