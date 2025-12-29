import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { AreaChart as MainChart, Area as MainArea, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { GetStats } from '../wailsjs/go/main/App';

interface HistoryData {
  time: string;
  value: number;
}

interface MetricState {
  systemName?: string;
  current: number;
  power: number;
  history: HistoryData[];
  cores?: number[];
  coresHistory?: HistoryData[][];
  eCoreCount?: number;
  pCoreCount?: number;
  swap?: { used: number, total: number };
  extraMetric?: number; // GPU周波数やDRAM電力用
}

const COLORS = {
  CPU: "#4da6ff",
  GPU: "#ff4d94",
  ANE: "#ffad33",
  Memory: "#b366ff",
};

const theme = {
  bgMain: '#1e1e1e',
  bgSidebar: '#252526',
  bgCard: '#2d2d30',
  bgActive: '#37373d',
  bgMenu: '#252526',
  textMain: '#d4d4d4',
  textSub: '#a0a0a0',
  border: '#3e3e42',
  grid: '#3e3e42',
  barBg: '#3e3e42',
  hover: '#2a2d2e',
};

function App() {
  const [activeTab, setActiveTab] = useState<'CPU' | 'GPU' | 'ANE' | 'Memory'>('CPU');
  const [socTemp, setSocTemp] = useState<number>(0);
  
  const [showLogical, setShowLogical] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const initialState: MetricState = { current: 0, power: 0, history: Array(60).fill({ time: '', value: 0 }), coresHistory: [] };
  
  const [cpu, setCpu] = useState<MetricState>(initialState);
  const [gpu, setGpu] = useState<MetricState>(initialState);
  const [ane, setAne] = useState<MetricState>(initialState);
  const [mem, setMem] = useState<MetricState>(initialState);

  const HISTORY_LENGTH = 60;

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await GetStats();
      const now = new Date().toLocaleTimeString();
      setSocTemp(stats.socTemp);

      const updateHistory = (prev: MetricState, newVal: number, power: number, extras: Partial<MetricState> = {}) => {
        const newHistory = [...prev.history, { time: now, value: newVal }];
        if (newHistory.length > HISTORY_LENGTH) newHistory.shift();
        return { ...prev, current: newVal, power: power, history: newHistory, ...extras };
      };

      setCpu(prev => {
        let newCoresHistory = prev.coresHistory || [];
        if (stats.cpuCores && stats.cpuCores.length > 0) {
            if (newCoresHistory.length !== stats.cpuCores.length) {
                newCoresHistory = stats.cpuCores.map(() => Array(HISTORY_LENGTH).fill({ time: '', value: 0 }));
            }
            newCoresHistory = newCoresHistory.map((hist, i) => {
                const h = [...hist, { time: now, value: stats.cpuCores[i] }];
                if (h.length > HISTORY_LENGTH) h.shift();
                return h;
            });
        }

        return updateHistory(prev, stats.cpuUsage, stats.cpuPower, { 
          systemName: stats.systemName,
          cores: stats.cpuCores,
          coresHistory: newCoresHistory,
          eCoreCount: stats.eCoreCount,
          pCoreCount: stats.pCoreCount
        });
      });
      
      // GPU: 周波数 (MHz) を extraMetric に保存
      setGpu(prev => updateHistory(prev, stats.gpuUsage, stats.gpuPower, { extraMetric: stats.gpuFreq }));
      
      setAne(prev => updateHistory(prev, stats.aneUsage, stats.anePower));
      
      // Memory: DRAM電力 (W) を extraMetric に保存
      setMem(prev => updateHistory(prev, stats.memUsedGB, stats.dramPower, { // Memoryタブの電力はDRAM電力とする
        swap: { used: stats.swapUsedGB, total: stats.swapTotalGB },
        extraMetric: stats.dramPower 
      })); 

    }, 1000);

    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (activeTab === 'CPU') {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const getActiveData = () => {
    switch(activeTab) {
      case 'CPU': return { data: cpu.history, color: COLORS.CPU, label: "Utilization %", max: 100 };
      case 'GPU': return { data: gpu.history, color: COLORS.GPU, label: "Utilization %", max: 100 };
      case 'ANE': return { data: ane.history, color: COLORS.ANE, label: "Est. Utilization %", max: 100 };
      case 'Memory': return { data: mem.history, color: COLORS.Memory, label: "Usage (GB)", max: 'auto' };
    }
  };

  const activeInfo = getActiveData();
  const formatValue = (val: number) => val.toFixed(1);

  return (
    <div id="app" style={{ display: 'flex', height: '100vh', backgroundColor: theme.bgMain, color: theme.textMain, fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      
      {/* サイドバー */}
      <div style={{ width: '240px', backgroundColor: theme.bgSidebar, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <SidebarItem title="CPU" value={`${formatValue(cpu.current)}%`} active={activeTab === 'CPU'} onClick={() => setActiveTab('CPU')} color={COLORS.CPU} history={cpu.history} theme={theme} />
        <SidebarItem title="Memory" value={`${formatValue(mem.current)} GB`} active={activeTab === 'Memory'} onClick={() => setActiveTab('Memory')} color={COLORS.Memory} history={mem.history} theme={theme} />
        <SidebarItem title="GPU" value={`${formatValue(gpu.current)}%`} active={activeTab === 'GPU'} onClick={() => setActiveTab('GPU')} color={COLORS.GPU} history={gpu.history} theme={theme} />
        <SidebarItem title="ANE" value={`${formatValue(ane.current)}%`} active={activeTab === 'ANE'} onClick={() => setActiveTab('ANE')} color={COLORS.ANE} history={ane.history} theme={theme} />
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* ヘッダーエリア */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 400, color: '#ffffff' }}>
            {activeTab}
          </h2>
          {activeTab === 'CPU' && cpu.systemName && (
            <div style={{ fontSize: '12px', color: theme.textSub, border: `1px solid ${theme.border}`, padding: '2px 6px', borderRadius: '4px' }}>
              {cpu.systemName}
            </div>
          )}
        </div>

        {/* グラフエリア */}
        <div 
          onContextMenu={handleContextMenu}
          style={{ 
            flex: 1, 
            backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, 
            padding: '10px', borderRadius: '4px', position: 'relative', marginBottom: '16px',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }}
        >
          {contextMenu && (
            <div style={{
              position: 'fixed', top: contextMenu.y, left: contextMenu.x,
              backgroundColor: theme.bgMenu, border: `1px solid ${theme.border}`,
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 1000, minWidth: '180px',
              borderRadius: '4px', padding: '4px 0'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '6px 12px', color: theme.textSub, fontSize: '11px', borderBottom: `1px solid ${theme.border}` }}>Graph settings</div>
              <div 
                onClick={() => { setShowLogical(!showLogical); setContextMenu(null); }}
                style={{ 
                  padding: '8px 12px', cursor: 'pointer', color: theme.textMain, display: 'flex', alignItems: 'center',
                  backgroundColor: 'transparent', fontSize: '13px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '16px', marginRight: '6px' }}>{showLogical && '✓'}</div>
                Logical processors
              </div>
            </div>
          )}

          {activeTab === 'CPU' && showLogical && cpu.cores && cpu.coresHistory ? (
             <CpuLogicalView 
               cores={cpu.cores} 
               histories={cpu.coresHistory}
               eCount={cpu.eCoreCount || 0}
               pCount={cpu.pCoreCount || 0}
               theme={theme} 
             />
          ) : (
            <>
              <div style={{position: 'absolute', top: 8, right: 12, color: theme.textSub, fontSize: '11px'}}>100%</div>
              <div style={{position: 'absolute', bottom: 8, right: 12, color: theme.textSub, fontSize: '11px'}}>0%</div>
              <ResponsiveContainer width="100%" height="100%">
                <MainChart data={activeInfo.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, activeInfo.max]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: theme.bgSidebar, border: `1px solid ${theme.border}`, color: theme.textMain, fontSize: '12px' }}
                    itemStyle={{ color: activeInfo.color }}
                    labelStyle={{ color: theme.textSub }}
                    formatter={(value: number) => [formatValue(value), activeInfo.label]}
                  />
                  <MainArea type="monotone" dataKey="value" stroke={activeInfo.color} fill={activeInfo.color} fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                </MainChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* 下部の詳細情報エリア (高さを拡大: 100px) */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', // 横幅も少しゆったり
            gap: '24px',  // 隙間を広げる
            flexShrink: 0, 
            height: '100px', // 高さを確保
            padding: '10px 0' // 上下に余白
        }}>
          
          <DetailBox label="Utilization" value={activeTab === 'Memory' ? `${formatValue(mem.current)} GB` : `${formatValue(activeTab === 'CPU' ? cpu.current : (activeTab === 'GPU' ? gpu.current : ane.current))}%`} theme={theme} />
          <DetailBox label="Power Usage" value={`${(activeTab === 'Memory' ? mem.power : (activeTab === 'CPU' ? cpu.power : (activeTab === 'GPU' ? gpu.power : ane.power))).toFixed(2)} W`} theme={theme} />
          <DetailBox label="Temperature" value={`${socTemp.toFixed(1)} °C`} theme={theme} />

          {/* 各タブ固有の追加メトリクス */}
          
          {activeTab === 'GPU' && gpu.extraMetric !== undefined && (
             <DetailBox label="Frequency" value={`${gpu.extraMetric} MHz`} theme={theme} />
          )}

          {activeTab === 'Memory' && mem.extraMetric !== undefined && (
             <DetailBox label="DRAM Power" value={`${mem.extraMetric.toFixed(2)} W`} theme={theme} />
          )}

          {activeTab === 'Memory' && mem.swap && (
             <DetailBox label="Swap Used" value={`${mem.swap.used.toFixed(2)} GB`} subValue={`/ ${mem.swap.total.toFixed(2)} GB`} theme={theme} />
          )}
          
          {activeTab === 'CPU' && (
             <div style={{ fontSize: '12px', color: theme.textSub, alignSelf: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ marginBottom: '4px' }}>Logical Processors: {cpu.cores?.length || 0}</div>
                <div>
                  <span style={{ marginRight: '12px', color: COLORS.CPU, fontSize: '13px' }}>P: {cpu.pCoreCount}</span>
                  <span style={{ color: '#888', fontSize: '13px' }}>E: {cpu.eCoreCount}</span>
                </div>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}

// --- 論理プロセッサ表示 (枠いっぱい埋め込み版) ---
const CpuLogicalView = ({ cores, histories, eCount, pCount, theme }: { cores: number[], histories: HistoryData[][], eCount: number, pCount: number, theme: any }) => {
  const eCores = cores.slice(0, eCount);
  const eHistories = histories.slice(0, eCount);
  
  const pCores = cores.slice(eCount);
  const pHistories = histories.slice(eCount);

  const MiniCoreGraph = ({ history, color, opacity = 0.3 }: any) => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={opacity} strokeWidth={1} isAnimationActive={false} />
        <YAxis domain={[0, 100]} hide />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      
      {/* P-Cores: 画面の60%程度を占有 */}
      {pCores.length > 0 && (
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ color: COLORS.CPU, fontSize: '12px', marginBottom: '6px', paddingBottom: '2px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            PERFORMANCE CORES
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '8px', 
            flex: 1, 
            minHeight: 0 
          }}>
            {pCores.map((usage, i) => (
              <div key={i} style={{ 
                  backgroundColor: '#222', padding: '8px', borderRadius: '4px', border: `1px solid ${theme.border}`, 
                  display: 'flex', flexDirection: 'column',
                  height: '100%', 
                  minHeight: 0
              }}>
                <div style={{ fontSize: '11px', color: theme.textSub, marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                   <span>P{i + 1}</span>
                   <span style={{ color: theme.textMain, fontWeight: 'bold' }}>{usage.toFixed(0)}%</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MiniCoreGraph history={pHistories[i]} color={COLORS.CPU} opacity={0.3} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E-Cores: 画面の40%程度を占有 */}
      {eCores.length > 0 && (
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ color: theme.textSub, fontSize: '12px', marginBottom: '6px', paddingBottom: '2px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
            EFFICIENCY CORES
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '6px',
            flex: 1,
            minHeight: 0
          }}>
            {eCores.map((usage, i) => (
              <div key={i} style={{ 
                  backgroundColor: '#2a2a2a', padding: '4px', borderRadius: '3px', border: `1px solid ${theme.border}`, 
                  display: 'flex', flexDirection: 'column',
                  height: '100%', 
                  minHeight: 0
              }}>
                <div style={{ fontSize: '9px', color: theme.textSub, marginBottom: '0px', display: 'flex', justifyContent: 'space-between' }}>
                   <span>E{i + 1}</span>
                   <span>{usage.toFixed(0)}%</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MiniCoreGraph history={eHistories[i]} color="#888" opacity={0.2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

const SidebarItem = ({ title, value, active, onClick, color, history, theme }: any) => (
  <div onClick={onClick} style={{
    padding: '10px 12px', cursor: 'pointer', backgroundColor: active ? theme.bgActive : 'transparent',
    borderLeft: active ? `4px solid ${color}` : '4px solid transparent', marginBottom: '2px', transition: 'all 0.1s', color: active ? '#ffffff' : theme.textMain
  }}>
    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>{title}</div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 300 }}>{value}</div>
        <div style={{ width: '70px', height: '35px' }}>
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
               <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={1.5} isAnimationActive={false} />
             </AreaChart>
           </ResponsiveContainer>
        </div>
    </div>
  </div>
);

// DetailBox: 文字サイズを少し大きくしてゆったりさせる
const DetailBox = ({ label, value, subValue, theme }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ color: theme.textSub, fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 300, color: '#ffffff' }}>{value}</div>
    {subValue && <div style={{ fontSize: '12px', color: theme.textSub, marginTop: '2px' }}>{subValue}</div>}
  </div>
);

export default App;