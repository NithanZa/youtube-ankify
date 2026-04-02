import Proxifly from "proxifly";

interface ProxyEntry {
    ip: string;
    port: number;
    [key: string]: unknown;
}

const proxifly = new Proxifly(
    process.env.PROXIFLY_API_KEY
        ? { apiKey: process.env.PROXIFLY_API_KEY }
        : {},
);

export async function getFreeProxies(): Promise<string[]> {
    const result = await proxifly.getProxy({
        protocol: "http",
        format: "json",
        quantity: 3,
        country: "US",
    });

    const entries: ProxyEntry[] = Array.isArray(result) ? result : [result];

    return entries
        .filter((p) => p && p.ip && p.port)
        .map((p) => `http://${p.ip}:${p.port}`);
}
