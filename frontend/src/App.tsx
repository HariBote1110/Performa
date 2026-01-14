import { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { AreaChart as MainChart, Area as MainArea, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { GetStats, GetProcesses } from '../wailsjs/go/main/App';
import { app } from '../wailsjs/go/models';

interface HistoryData {
  time: string;
  value: number;
  recv?: number;
  sent?: number;
  read?: number;
  write?: number;
  user?: number;
  sys?: number;
  swap?: number;
}

interface MetricState {
  systemName?: string;
  current: number;
  total?: number;
  power: number;
  history: HistoryData[];
  cores?: number[];
  coresHistory?: HistoryData[][];
  eCoreCount?: number;
  pCoreCount?: number;
  swap?: { used: number, total: number };
  extraMetric?: number;
  netStats?: { sent: number, recv: number };
  diskStats?: { read: number, write: number };
  gpuCores?: number;
  uptime?: number;
  cpuDetail?: { user: number, sys: number };
}

const COLORS = {
  CPU: "#4da6ff",
  GPU: "#ff4d94",
  ANE: "#ffad33",
  Memory: "#b366ff",
  Network: "#00d9ff",
  NetRecv: "#33ff99",
  NetSent: "#ffcc00",
  Disk: "#00e676",
  DiskRead: "#33ff99",
  DiskWrite: "#ff4d4d",
  P_Core: "#ce66ff",
  E_Core: "#4da6ff",
  CpuUser: "#4da6ff",
  CpuSys: "#ff4d4d",
  Swap: "#e040fb",
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
  const [activeTab, setActiveTab] = useState<'CPU' | 'GPU' | 'ANE' | 'Memory' | 'Network' | 'Disk' | 'Processes'>('CPU');
  const [socTemp, setSocTemp] = useState<number>(0);

  const usePersistedState = (key: string, defaultValue: boolean) => {
    const [state, setState] = useState<boolean>(() => {
      const saved = localStorage.getItem(key);
      return saved !== null ? saved === 'true' : defaultValue;
    });
    useEffect(() => {
      localStorage.setItem(key, state.toString());
    }, [key, state]);
    return [state, setState] as const;
  };

  const [showLogical, setShowLogical] = usePersistedState('showLogical', false);
  const [showSysUser, setShowSysUser] = usePersistedState('showSysUser', false);
  const [showSwap, setShowSwap] = usePersistedState('showSwap', false);

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

  const initialState: MetricState = {
    current: 0,
    power: 0,
    history: Array(60).fill({
      time: '', value: 0,
      user: 0, sys: 0, swap: 0,
      recv: 0, sent: 0, read: 0, write: 0
    }),
    coresHistory: [],
    cpuDetail: { user: 0, sys: 0 }
  };

  const [cpu, setCpu] = useState<MetricState>(initialState);
  const [gpu, setGpu] = useState<MetricState>(initialState);
  const [ane, setAne] = useState<MetricState>(initialState);
  const [mem, setMem] = useState<MetricState>(initialState);
  const [net, setNet] = useState<MetricState>(initialState);
  const [disk, setDisk] = useState<MetricState>(initialState);

  const [processes, setProcesses] = useState<app.ProcessMetrics[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof app.ProcessMetrics, direction: 'asc' | 'desc' }>({ key: 'CPU', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const HISTORY_LENGTH = 60;

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await GetStats();
      const now = new Date().toLocaleTimeString();
      setSocTemp(stats.socTemp);

      const updateHistory = (prev: MetricState, newVal: number, power: number, extras: Partial<MetricState> = {}, historyExtras: any = {}) => {
        const newHistory = [...prev.history, { time: now, value: newVal, ...historyExtras }];
        if (newHistory.length > HISTORY_LENGTH) newHistory.shift();
        return { ...prev, current: newVal, power: power, history: newHistory, ...extras };
      };

      setCpu(prev => {
        let newCoresHistory = prev.coresHistory || [];
        if (stats.cpuCores && stats.cpuCores.length > 0) {
          if (newCoresHistory.length !== stats.cpuCores.length) {
            newCoresHistory = stats.cpuCores.map(() => Array(HISTORY_LENGTH).fill({ time: '', value: 0, user: 0, sys: 0 }));
          }
          newCoresHistory = newCoresHistory.map((hist, i) => {
            // コアごとのUser/Sys情報をヒストリーに追加
            const userVal = stats.cpuCoresUser ? stats.cpuCoresUser[i] : 0;
            const sysVal = stats.cpuCoresSystem ? stats.cpuCoresSystem[i] : 0;
            const h = [...hist, { time: now, value: stats.cpuCores[i], user: userVal, sys: sysVal }];
            if (h.length > HISTORY_LENGTH) h.shift();
            return h;
          });
        }

        return updateHistory(prev, stats.cpuUsage, stats.cpuPower, {
          systemName: stats.systemName,
          cores: stats.cpuCores,
          coresHistory: newCoresHistory,
          eCoreCount: stats.eCoreCount,
          pCoreCount: stats.pCoreCount,
          uptime: stats.uptime,
          cpuDetail: { user: stats.cpuUser, sys: stats.cpuSystem }
        }, { user: stats.cpuUser, sys: stats.cpuSystem });
      });

      setGpu(prev => updateHistory(prev, stats.gpuUsage, stats.gpuPower, {
        extraMetric: stats.gpuFreq,
        gpuCores: stats.gpuCoreCount
      }));

      setAne(prev => updateHistory(prev, stats.aneUsage, stats.anePower));
      setMem(prev => updateHistory(prev, stats.memUsedGB, stats.dramPower, {
        total: stats.memTotalGB,
        swap: { used: stats.swapUsedGB, total: stats.swapTotalGB },
        extraMetric: stats.dramPower
      }, { swap: stats.swapUsedGB }));

      const toMB = (bytes: number) => bytes / 1024 / 1024;
      const netSentMB = toMB(stats.netSent);
      const netRecvMB = toMB(stats.netRecv);
      const netTotalMB = netSentMB + netRecvMB;

      setNet(prev => updateHistory(prev, netTotalMB, 0, {
        netStats: { sent: stats.netSent, recv: stats.netRecv }
      }, { sent: netSentMB, recv: netRecvMB }));

      const diskReadMB = toMB(stats.diskRead);
      const diskWriteMB = toMB(stats.diskWrite);
      const diskTotalMB = diskReadMB + diskWriteMB;

      setDisk(prev => updateHistory(prev, diskTotalMB, 0, {
        diskStats: { read: stats.diskRead, write: stats.diskWrite }
      }, { read: diskReadMB, write: diskWriteMB }));

      if (activeTab === 'Processes') {
        const procs = await GetProcesses();
        setProcesses(procs);
      }

    }, 1000);

    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleClick);
    };
  }, [activeTab]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (activeTab === 'CPU' || activeTab === 'Memory') {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const requestSort = (key: keyof app.ProcessMetrics) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProcesses = useMemo(() => {
    return [...processes].sort((a, b) => {
      let key = sortConfig.key;
      if (key === 'Memory') {
        key = 'RSS';
      }

      // @ts-ignore
      let aVal = a[key];
      // @ts-ignore
      let bVal = b[key];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processes, sortConfig]);

  const filteredProcesses = useMemo(() => {
    if (!searchTerm) return sortedProcesses;
    const lowerSearch = searchTerm.toLowerCase();
    return sortedProcesses.filter(p =>
      p.Command.toLowerCase().includes(lowerSearch) ||
      p.User.toLowerCase().includes(lowerSearch)
    );
  }, [sortedProcesses, searchTerm]);

  const getActiveData = () => {
    switch (activeTab) {
      case 'CPU': return { data: cpu.history, color: COLORS.CPU, label: "Utilization %", max: 100 };
      case 'GPU': return { data: gpu.history, color: COLORS.GPU, label: "Utilization %", max: 100 };
      case 'ANE': return { data: ane.history, color: COLORS.ANE, label: "Est. Utilization %", max: 100 };
      case 'Memory':
        // Show Swap時は「物理メモリ+スワップ領域の合計」を最大値にする
        if (showSwap) {
          const maxVal = (mem.total || 0) + (mem.swap?.total || 0);
          return { data: mem.history, color: COLORS.Memory, label: "Usage (GB)", max: maxVal > 0 ? maxVal : 'auto' };
        }
        return { data: mem.history, color: COLORS.Memory, label: "Usage (GB)", max: mem.total || 'auto' };
      case 'Network': return { data: net.history, color: COLORS.Network, label: "Traffic (MB/s)", max: 'auto' };
      case 'Disk': return { data: disk.history, color: COLORS.Disk, label: "I/O (MB/s)", max: 'auto' };
      default: return { data: [], color: '#fff', label: '', max: 100 };
    }
  };

  const activeInfo = getActiveData();
  const formatValue = (val: number) => val.toFixed(1);
  const formatBytes = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes.toFixed(0)} B`;
  };
  const formatNet = (bytes: number) => {
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB/s`;
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB/s`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
    return `${bytes.toFixed(0)} B/s`;
  };
  const formatUptime = (seconds: number) => {
    if (!seconds) return "0:00:00:00";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const tooltipFormatter = useCallback((value: any, name: any) => {
    const unit = activeTab === 'Network' || activeTab === 'Disk' ? 'MB/s' : '';
    const valStr = typeof value === 'number' ? formatValue(value) : value;
    let dispName = name;
    if (name === 'value') dispName = activeInfo.label;
    if (name === 'user') dispName = 'User';
    if (name === 'sys') dispName = 'System';
    if (name === 'swap') dispName = 'Swap';

    return [`${valStr} ${unit}`, dispName];
  }, [activeTab, activeInfo.label]);

  const tooltipContentStyle = useMemo(() => ({
    backgroundColor: theme.bgSidebar,
    border: `1px solid ${theme.border}`,
    color: theme.textMain,
    fontSize: '12px'
  }), [theme]);

  const tooltipLabelStyle = useMemo(() => ({ color: theme.textSub }), [theme]);

  return (
    <div id="app" style={{ display: 'flex', height: '100vh', backgroundColor: theme.bgMain, color: theme.textMain, fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>

      {/* サイドバー */}
      <div style={{ width: '240px', backgroundColor: theme.bgSidebar, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border}`, flexShrink: 0 }}>
        <SidebarItem title="CPU" value={`${formatValue(cpu.current)}%`} active={activeTab === 'CPU'} onClick={() => setActiveTab('CPU')} color={COLORS.CPU} history={cpu.history} theme={theme} max={100} />
        <SidebarItem title="Memory" value={`${formatValue(mem.current)} GB`} active={activeTab === 'Memory'} onClick={() => setActiveTab('Memory')} color={COLORS.Memory} history={mem.history} theme={theme} max={mem.total} />
        <SidebarItem title="GPU" value={`${formatValue(gpu.current)}%`} active={activeTab === 'GPU'} onClick={() => setActiveTab('GPU')} color={COLORS.GPU} history={gpu.history} theme={theme} max={100} />
        <SidebarItem title="ANE" value={`${formatValue(ane.current)}%`} active={activeTab === 'ANE'} onClick={() => setActiveTab('ANE')} color={COLORS.ANE} history={ane.history} theme={theme} max={100} />

        <SidebarItem title="Network" value={`${formatValue(net.current)} MB/s`} active={activeTab === 'Network'} onClick={() => setActiveTab('Network')} color={COLORS.Network} history={net.history} theme={theme} />
        <SidebarItem title="Disk" value={`${formatValue(disk.current)} MB/s`} active={activeTab === 'Disk'} onClick={() => setActiveTab('Disk')} color={COLORS.Disk} history={disk.history} theme={theme} />

        <div onClick={() => setActiveTab('Processes')} style={{
          padding: '10px 12px', cursor: 'pointer', backgroundColor: activeTab === 'Processes' ? theme.bgActive : 'transparent',
          borderLeft: activeTab === 'Processes' ? `4px solid #fff` : '4px solid transparent', marginBottom: '2px', transition: 'all 0.1s', color: activeTab === 'Processes' ? '#ffffff' : theme.textMain
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Processes</div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {activeTab === 'Processes' ? (
          // プロセス表示エリア
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.bgCard, borderRadius: '4px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bgSidebar, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: theme.bgMain,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    padding: '4px 8px 4px 28px',
                    color: theme.textMain,
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: theme.textSub, fontSize: '14px' }}>🔍</span>
              </div>
            </div>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.bgSidebar, display: 'grid', gridTemplateColumns: '50px 2fr 100px 80px 100px 100px', gap: '8px', fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>
              <div style={{ cursor: 'pointer' }} onClick={() => requestSort('PID')}>PID {sortConfig.key === 'PID' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              <div style={{ cursor: 'pointer' }} onClick={() => requestSort('Command')}>Name {sortConfig.key === 'Command' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              <div style={{ cursor: 'pointer' }} onClick={() => requestSort('User')}>User {sortConfig.key === 'User' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              <div style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => requestSort('CPU')}>CPU % {sortConfig.key === 'CPU' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              <div style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => requestSort('Memory')}>Memory {sortConfig.key === 'Memory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
              <div style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => requestSort('Time')}>Time {sortConfig.key === 'Time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredProcesses.map((p) => (
                <div key={p.PID} style={{
                  padding: '4px 12px', borderBottom: `1px solid ${theme.grid}`,
                  display: 'grid', gridTemplateColumns: '50px 2fr 100px 80px 100px 100px', gap: '8px',
                  fontSize: '12px', color: theme.textMain,
                  backgroundColor: 'transparent'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>{p.PID}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{p.Command}</div>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.textSub }}>{p.User}</div>
                  <div style={{ textAlign: 'right', color: p.CPU > 50 ? '#ff4d4d' : p.CPU > 20 ? '#ffad33' : theme.textMain }}>{p.CPU.toFixed(1)}</div>
                  <div style={{ textAlign: 'right' }}>{formatBytes(p.RSS * 1024)}</div>
                  <div style={{ textAlign: 'right', color: theme.textSub }}>{p.Time}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
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

                  {activeTab === 'CPU' && (
                    <>
                      <div
                        onClick={() => { setShowLogical(!showLogical); setContextMenu(null); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', color: theme.textMain, display: 'flex', alignItems: 'center', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ width: '16px', marginRight: '6px' }}>{showLogical && '✓'}</div>
                        Logical processors
                      </div>
                      <div
                        onClick={() => { setShowSysUser(!showSysUser); setContextMenu(null); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', color: theme.textMain, display: 'flex', alignItems: 'center', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ width: '16px', marginRight: '6px' }}>{showSysUser && '✓'}</div>
                        Show System/User
                      </div>
                    </>
                  )}

                  {activeTab === 'Memory' && (
                    <div
                      onClick={() => { setShowSwap(!showSwap); setContextMenu(null); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', color: theme.textMain, display: 'flex', alignItems: 'center', fontSize: '13px' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '16px', marginRight: '6px' }}>{showSwap && '✓'}</div>
                      Show Swap
                    </div>
                  )}

                </div>
              )}

              {activeTab === 'CPU' && showLogical && cpu.cores && cpu.coresHistory ? (
                <CpuLogicalView
                  cores={cpu.cores}
                  histories={cpu.coresHistory}
                  eCount={cpu.eCoreCount || 0}
                  pCount={cpu.pCoreCount || 0}
                  theme={theme}
                  showSysUser={showSysUser} // 積み上げ表示フラグを渡す
                />
              ) : (
                <>
                  <div style={{ position: 'absolute', top: 8, right: 12, color: theme.textSub, fontSize: '11px' }}>
                    {activeTab === 'Memory' && mem.total ? (showSwap ? `${((mem.total + (mem.swap?.total || 0))).toFixed(2)} GB` : `${formatValue(mem.total)} GB`) :
                      activeTab === 'Network' || activeTab === 'Disk' ? 'Total Traffic' : '100%'}
                  </div>
                  <div style={{ position: 'absolute', bottom: 8, right: 12, color: theme.textSub, fontSize: '11px' }}>0</div>

                  <ResponsiveContainer width="100%" height="100%">
                    <MainChart data={activeInfo.data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} key={activeTab + showSysUser + showSwap}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                      <XAxis dataKey="time" hide />
                      <YAxis domain={[0, activeInfo.max]} hide />
                      <Tooltip
                        contentStyle={tooltipContentStyle}
                        labelStyle={tooltipLabelStyle}
                        formatter={tooltipFormatter}
                        isAnimationActive={false}
                      />

                      {/* メイングフ描画分岐 */}
                      {activeTab === 'CPU' && showSysUser ? (
                        <>
                          <MainArea type="monotone" dataKey="user" name="User" stroke={COLORS.CpuUser} fill={COLORS.CpuUser} fillOpacity={0.3} strokeWidth={1.5} stackId="1" isAnimationActive={false} />
                          <MainArea type="monotone" dataKey="sys" name="System" stroke={COLORS.CpuSys} fill={COLORS.CpuSys} fillOpacity={0.3} strokeWidth={1.5} stackId="1" isAnimationActive={false} />
                        </>
                      ) : activeTab === 'Memory' && showSwap ? (
                        <>
                          <MainArea type="monotone" dataKey="value" name="Memory" stroke={COLORS.Memory} fill={COLORS.Memory} fillOpacity={0.3} strokeWidth={1.5} stackId="1" isAnimationActive={false} />
                          <MainArea type="monotone" dataKey="swap" name="Swap" stroke={COLORS.Swap} fill={COLORS.Swap} fillOpacity={0.3} strokeWidth={1.5} stackId="1" isAnimationActive={false} />
                        </>
                      ) : activeTab === 'Network' ? (
                        <>
                          <MainArea type="monotone" dataKey="recv" name="Download" stroke={COLORS.NetRecv} fill={COLORS.NetRecv} fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                          <MainArea type="monotone" dataKey="sent" name="Upload" stroke={COLORS.NetSent} fill={COLORS.NetSent} fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                        </>
                      ) : activeTab === 'Disk' ? (
                        <>
                          <MainArea type="monotone" dataKey="read" name="Read" stroke={COLORS.DiskRead} fill={COLORS.DiskRead} fillOpacity={0.2} strokeWidth={2} stackId="1" isAnimationActive={false} />
                          <MainArea type="monotone" dataKey="write" name="Write" stroke={COLORS.DiskWrite} fill={COLORS.DiskWrite} fillOpacity={0.2} strokeWidth={2} stackId="1" isAnimationActive={false} />
                        </>
                      ) : (
                        <MainArea type="monotone" dataKey="value" stroke={activeInfo.color} fill={activeInfo.color} fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                      )}

                    </MainChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* 下部の詳細情報エリア */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '24px',
              flexShrink: 0,
              minHeight: '100px',
              height: 'auto',
              padding: '10px 0 20px 0'
            }}>

              <DetailBox
                label={activeTab === 'Network' || activeTab === 'Disk' ? "Total Throughput" : "Utilization"}
                value={
                  activeTab === 'Memory' ? `${formatValue(mem.current)} GB` :
                    activeTab === 'Network' ? `${formatValue(net.current)} MB/s` :
                      activeTab === 'Disk' ? `${formatValue(disk.current)} MB/s` :
                        `${formatValue(activeTab === 'CPU' ? cpu.current : (activeTab === 'GPU' ? gpu.current : ane.current))}%`
                }
                subValue={activeTab === 'Memory' ? `/ ${formatValue(mem.total || 0)} GB` : undefined}
                theme={theme}
              />

              {activeTab === 'Memory' && showSwap && mem.swap && (
                <DetailBox
                  label="Swap Used"
                  value={`${mem.swap.used.toFixed(2)} GB`}
                  subValue={`/ ${mem.swap.total.toFixed(2)} GB`}
                  theme={theme}
                  color={COLORS.Swap}
                />
              )}

              {activeTab === 'CPU' && showSysUser && (
                <>
                  <DetailBox label="User" value={`${(cpu.cpuDetail?.user || 0).toFixed(1)} %`} theme={theme} color={COLORS.CpuUser} />
                  <DetailBox label="System" value={`${(cpu.cpuDetail?.sys || 0).toFixed(1)} %`} theme={theme} color={COLORS.CpuSys} />
                </>
              )}

              {activeTab !== 'Network' && activeTab !== 'Disk' && !showSwap && !showSysUser && (
                <DetailBox label="Power Usage" value={`${(activeTab === 'Memory' ? mem.power : (activeTab === 'CPU' ? cpu.power : (activeTab === 'GPU' ? gpu.power : ane.power))).toFixed(2)} W`} theme={theme} />
              )}

              {activeTab !== 'Network' && activeTab !== 'Disk' && (
                <DetailBox label="Temperature" value={`${socTemp.toFixed(1)} °C`} theme={theme} />
              )}

              {activeTab === 'CPU' && cpu.uptime && (
                <DetailBox label="Uptime" value={formatUptime(cpu.uptime)} theme={theme} />
              )}

              {activeTab === 'GPU' && gpu.gpuCores !== undefined && (
                <DetailBox label="GPU Cores" value={`${gpu.gpuCores}`} theme={theme} />
              )}

              {activeTab === 'GPU' && gpu.extraMetric !== undefined && (
                <DetailBox label="Frequency" value={`${gpu.extraMetric} MHz`} theme={theme} />
              )}

              {activeTab === 'Memory' && mem.extraMetric !== undefined && !showSwap && (
                <DetailBox label="DRAM Power" value={`${mem.extraMetric.toFixed(2)} W`} theme={theme} />
              )}

              {activeTab === 'Memory' && mem.swap && !showSwap && (
                <DetailBox label="Swap Used" value={`${mem.swap.used.toFixed(2)} GB`} subValue={`/ ${mem.swap.total.toFixed(2)} GB`} theme={theme} />
              )}

              {activeTab === 'Network' && net.netStats && (
                <>
                  <DetailBox label="Download" value={formatNet(net.netStats.recv)} theme={theme} color={COLORS.NetRecv} />
                  <DetailBox label="Upload" value={formatNet(net.netStats.sent)} theme={theme} color={COLORS.NetSent} />
                </>
              )}

              {activeTab === 'Disk' && disk.diskStats && (
                <>
                  <DetailBox label="Read" value={formatNet(disk.diskStats.read)} theme={theme} color={COLORS.DiskRead} />
                  <DetailBox label="Write" value={formatNet(disk.diskStats.write)} theme={theme} color={COLORS.DiskWrite} />
                </>
              )}

              {activeTab === 'CPU' && (
                <div style={{ fontSize: '12px', color: theme.textSub, alignSelf: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ marginBottom: '4px' }}>Logical Processors: {cpu.cores?.length || 0}</div>
                  <div>
                    <span style={{ marginRight: '12px', color: COLORS.P_Core, fontSize: '13px' }}>P: {cpu.pCoreCount}</span>
                    <span style={{ color: COLORS.E_Core, fontSize: '13px' }}>E: {cpu.eCoreCount}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// MiniCoreGraph: 積み上げ対応 (stackIdを追加)
const MiniCoreGraph = ({ history, color, opacity = 0.3, showSysUser }: any) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
      <YAxis domain={[0, 100]} hide />
      {showSysUser ? (
        <>
          <Area type="monotone" dataKey="user" stroke={COLORS.CpuUser} fill={COLORS.CpuUser} fillOpacity={opacity} strokeWidth={1} stackId="1" isAnimationActive={false} />
          <Area type="monotone" dataKey="sys" stroke={COLORS.CpuSys} fill={COLORS.CpuSys} fillOpacity={opacity} strokeWidth={1} stackId="1" isAnimationActive={false} />
        </>
      ) : (
        <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={opacity} strokeWidth={1} isAnimationActive={false} />
      )}
    </AreaChart>
  </ResponsiveContainer>
);

// CpuLogicalView: showSysUserを受け取り、MiniCoreGraphに渡す
const CpuLogicalView = ({ cores, histories, eCount, pCount, theme, showSysUser }: { cores: number[], histories: HistoryData[][], eCount: number, pCount: number, theme: any, showSysUser: boolean }) => {
  const eCores = cores.slice(0, eCount);
  const eHistories = histories.slice(0, eCount);

  const pCores = cores.slice(eCount);
  const pHistories = histories.slice(eCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>

      {/* P-Cores */}
      {pCores.length > 0 && (
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ color: COLORS.P_Core, fontSize: '12px', marginBottom: '6px', paddingBottom: '2px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
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
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MiniCoreGraph history={pHistories[i]} color={COLORS.P_Core} opacity={0.3} showSysUser={showSysUser} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E-Cores */}
      {eCores.length > 0 && (
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ color: COLORS.E_Core, fontSize: '12px', marginBottom: '6px', paddingBottom: '2px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
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
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MiniCoreGraph history={eHistories[i]} color={COLORS.E_Core} opacity={0.2} showSysUser={showSysUser} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

// SidebarItemにmaxを追加し、YAxisのドメインを制御
const SidebarItem = ({ title, value, active, onClick, color, history, theme, max }: any) => (
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
            <YAxis domain={[0, max || 'auto']} hide />
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={1.5} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const DetailBox = ({ label, value, subValue, theme, color }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <div style={{ color: theme.textSub, fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '24px', fontWeight: 300, color: color || '#ffffff' }}>{value}</div>
    {subValue && <div style={{ fontSize: '12px', color: theme.textSub, marginTop: '2px' }}>{subValue}</div>}
  </div>
);

export default App;