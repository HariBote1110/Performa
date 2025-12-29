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
	    aneUsage: number;
	    anePower: number;
	    memUsedGB: number;
	    memTotalGB: number;
	    swapUsedGB: number;
	    swapTotalGB: number;
	    dramPower: number;
	    socTemp: number;
	
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
	        this.aneUsage = source["aneUsage"];
	        this.anePower = source["anePower"];
	        this.memUsedGB = source["memUsedGB"];
	        this.memTotalGB = source["memTotalGB"];
	        this.swapUsedGB = source["swapUsedGB"];
	        this.swapTotalGB = source["swapTotalGB"];
	        this.dramPower = source["dramPower"];
	        this.socTemp = source["socTemp"];
	    }
	}

}

