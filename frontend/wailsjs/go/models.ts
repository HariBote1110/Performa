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
	    // Go type: time
	    LastUpdated: any;
	
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
	        this.LastUpdated = this.convertValues(source["LastUpdated"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class SystemStats {
	    systemName: string;
	    cpuUsage: number;
	    cpuPower: number;
	    cpuCores: number[];
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
	        this.cpuPower = source["cpuPower"];
	        this.cpuCores = source["cpuCores"];
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

