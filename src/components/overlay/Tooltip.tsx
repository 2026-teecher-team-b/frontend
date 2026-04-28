import { useState } from 'react'

export default function Tooltip() {
    const [activeTab, setActiveTab] = useState<'explorer' | 'constellation'>('explorer')
    const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('day')


    return (
    <div className="absolute inset-0 pointer-events-none z-50">

      {/* Top Header */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="px-2 py-1.5 bg-zinc-900/60 rounded-full outline outline-1 outline-offset-[-1px] outline-zinc-500/20 backdrop-blur-[10px] inline-flex justify-start items-center gap-1">
          
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-6 py-2 rounded-full inline-flex flex-col justify-start items-start relative transition-all duration-300 ${
              activeTab === 'explorer'
                ? 'bg-blue-300'
                : 'opacity-60'
            }`}
          >
           {activeTab === 'explorer' && (
              <div className="w-28 h-8 left-0 top-0 absolute bg-white/0 rounded-full shadow-[0px_0px_15px_2px_rgba(141,198,254,0.60)]" />
            )}
            <div
              className={`justify-center text-xs uppercase leading-4 tracking-wider font-['Space_Grotesk'] relative z-10 ${
                activeTab === 'explorer'
                  ? 'text-sky-900 font-bold'
                  : 'text-slate-50 font-normal'
              }`}
            > 
                Explorer
            </div>
          </button>

          <button
            onClick={() => setActiveTab('constellation')}
            className={`px-6 py-2 rounded-full inline-flex flex-col justify-start items-start relative transition-all duration-300 ${
              activeTab === 'constellation'
                ? 'bg-blue-300'
                : 'opacity-60'
            }`}
          >
            {activeTab === 'constellation' && (
              <div className="w-36 h-8 left-0 top-0 absolute bg-white/0 rounded-full shadow-[0px_0px_15px_2px_rgba(141,198,254,0.60)]" />
            )}
            <div
              className={`justify-center text-xs uppercase leading-4 tracking-wider font-['Space_Grotesk'] relative z-10 ${
                activeTab === 'constellation'
                  ? 'text-sky-900 font-bold'
                  : 'text-slate-50 font-normal'
              }`}
            >
              My Constellation
            </div>
          </button>
        </div>
      </div>

    {/* Right */}
    <div className="absolute top-5 right-5 flex flex-col gap-3 pointer-events-auto">     
        <div className="px-4 py-4 bg-zinc-900/60 rounded-2xl outline outline-1 outline-offset-[-1px] outline-zinc-500/20 backdrop-blur-[10px] flex flex-col gap-3 min-w-[140px]">
        
        <div className="text-slate-50 text-[10px] font-normal font-['Space_Grotesk'] uppercase tracking-widest opacity-60">
            언어 분포
        </div>

        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-300 rounded-full" />
            <span className="text-slate-50 text-xs font-normal font-['Space_Grotesk'] uppercase tracking-wide">
            Python
            </span>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-300 rounded-full" />
            <span className="text-slate-50 text-xs font-normal font-['Space_Grotesk'] uppercase tracking-wide">
            JavaScript
            </span>
        </div>

        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-full" />
            <span className="text-slate-50 text-xs font-normal font-['Space_Grotesk'] uppercase tracking-wide">
            Rust
            </span>
        </div>

        </div>

        {/* Time Filter */}
        <div className="p-1 bg-zinc-900/60 rounded-xl outline outline-1 outline-offset-[-1px] outline-zinc-500/20 backdrop-blur-[10px] inline-flex justify-start items-center gap-1">

          <button
            onClick={() => setActivePeriod('day')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
              activePeriod === 'day'
                ? 'bg-blue-300/20'
                : 'opacity-40 hover:opacity-100'
            }`}
          >
            <div
              className={`text-[10px] uppercase tracking-wide ${
                activePeriod === 'day'
                  ? 'text-blue-300 font-bold'
                  : 'text-slate-50 font-normal'
              }`}
            >
              Day
            </div>
          </button>

          {/* Week */}
          <button
            onClick={() => setActivePeriod('week')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
              activePeriod === 'week'
                ? 'bg-blue-300/20'
                : 'opacity-40 hover:opacity-100'
            }`}
          >
            <div
              className={`text-[10px] uppercase tracking-wide ${
                activePeriod === 'week'
                  ? 'text-blue-300 font-bold'
                  : 'text-slate-50 font-normal'
              }`}
            >
              Week
            </div>
          </button>

          {/* Month */}
          <button
            onClick={() => setActivePeriod('month')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-300 ${
              activePeriod === 'month'
                ? 'bg-blue-300/20'
                : 'opacity-40 hover:opacity-100'
            }`}
          >
            <div
              className={`text-[10px] uppercase tracking-wide ${
                activePeriod === 'month'
                  ? 'text-blue-300 font-bold'
                  : 'text-slate-50 font-normal'
              }`}
            >
              Month
            </div>
          </button>

        </div>

      </div>
    </div>
  )
}