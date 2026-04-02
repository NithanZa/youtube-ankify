declare module "proxifly" {
    interface ProxiflyOptions {
        apiKey?: string;
        url?: string;
        debug?: boolean;
    }

    interface GetProxyOptions {
        protocol?: "http" | "socks4" | "socks5";
        anonymity?: "transparent" | "anonymous" | "elite";
        country?: string;
        https?: boolean;
        format?: "json" | "text";
        quantity?: number;
    }

    interface ProxyResult {
        ip: string;
        port: number;
        protocol: string;
        anonymity: string;
        country: string;
        https: boolean;
        [key: string]: unknown;
    }

    class Proxifly {
        constructor(options?: ProxiflyOptions);
        getProxy(options?: GetProxyOptions): Promise<ProxyResult | ProxyResult[]>;
        getPublicIp(): Promise<string>;
    }

    export default Proxifly;
}
