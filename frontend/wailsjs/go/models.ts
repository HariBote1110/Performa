export namespace app {
	
	export class ProcessMetrics {
	    PID: number;
	    CPU: number;
	    LastTime: number;
	    Memory: number;
	    VSZ: number;
	    RSS: number;
	    User: string;
	    TTY: string;
	    State: string;
	    Started: string;
	    Time: string;
	    Command: string;
	
	    static createFrom(source: any = {}) {
	        return new ProcessMetrics(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.PID = source["PID"];
	        this.CPU = source["CPU"];
	        this.LastTime = source["LastTime"];
	        this.Memory = source["Memory"];
	        this.VSZ = source["VSZ"];
	        this.RSS = source["RSS"];
	        this.User = source["User"];
	        this.TTY = source["TTY"];
	        this.State = source["State"];
	        this.Started = source["Started"];
	        this.Time = source["Time"];
	        this.Command = source["Command"];
	    }
	}

}

export namespace main {
	
	export class SystemStats {
	    systemName: string;
	    cpuUsage: number;
	    cpuUser: number;
	    cpuSystem: number;
	    cpuPower: number;
	    cpuCores: number[];
	    cpuCoresUser: number[];
	    cpuCoresSystem: number[];
	    eCoreCount: number;
	    pCoreCount: number;
	    gpuUsage: number;
	    gpuPower: number;
	    gpuFreq: number;
	    gpuCoreCount: number;
	    aneUsage: number;
	    anePower: number;
	    memUsedGB: number;
	    memTotalGB: number;
	    swapUsedGB: number;
	    swapTotalGB: number;
	    dramPower: number;
	    socTemp: number;
	    netSent: number;
	    netRecv: number;
	    diskRead: number;
	    diskWrite: number;
	    uptime: number;
	
	    static createFrom(source: any = {}) {
	        return new SystemStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.systemName = source["systemName"];
	        this.cpuUsage = source["cpuUsage"];
	        this.cpuUser = source["cpuUser"];
	        this.cpuSystem = source["cpuSystem"];
	        this.cpuPower = source["cpuPower"];
	        this.cpuCores = source["cpuCores"];
	        this.cpuCoresUser = source["cpuCoresUser"];
	        this.cpuCoresSystem = source["cpuCoresSystem"];
	        this.eCoreCount = source["eCoreCount"];
	        this.pCoreCount = source["pCoreCount"];
	        this.gpuUsage = source["gpuUsage"];
	        this.gpuPower = source["gpuPower"];
	        this.gpuFreq = source["gpuFreq"];
	        this.gpuCoreCount = source["gpuCoreCount"];
	        this.aneUsage = source["aneUsage"];
	        this.anePower = source["anePower"];
	        this.memUsedGB = source["memUsedGB"];
	        this.memTotalGB = source["memTotalGB"];
	        this.swapUsedGB = source["swapUsedGB"];
	        this.swapTotalGB = source["swapTotalGB"];
	        this.dramPower = source["dramPower"];
	        this.socTemp = source["socTemp"];
	        this.netSent = source["netSent"];
	        this.netRecv = source["netRecv"];
	        this.diskRead = source["diskRead"];
	        this.diskWrite = source["diskWrite"];
	        this.uptime = source["uptime"];
	    }
	}

}

