import { GlobalProcessor } from "@sentio/sdk/eth";
import { EthChainId } from '@sentio/chain'
import * as net from "net";

interface CallFrame {
    from: string
    to: string
    calls: CallFrame[]
}

interface TraceBlockResult {
    result: {
        txHash: string
        result: CallFrame
    }[]
}

function collectAddresses(call?: CallFrame): string[] {
    if (!call) {
        return []
    }
    let ret: string[] = [call.to]
    if (!call.calls) {
        return ret
    }
    for (const c of call.calls) {
        ret = [...ret, ...collectAddresses(c)]
    }
    return ret
}

const networkId = "59144"

GlobalProcessor.bind({
    startBlock: 672500,
    network: networkId as any,
}).onBlockInterval(
    async (b, ctx) => {
        const blockHash = (b as any).hash
        if (!blockHash) {
            console.error("empty block hash")
            return
        }
        let data = {
            "id": 1,
            "jsonrpc": "2.0",
            "method": "debug_traceBlockByHash",
            "params": [
                blockHash,
                {
                    "tracer": "callTracer"
                }
            ]
        }
        const res = await fetch("http://sentio-0.sentio.xyz/sentio-internal-api/linea/",{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        }).catch(console.error)

        let addrs: string[] = []
        if (res && res.ok) {
            const r = await res.json() as TraceBlockResult
            if (r.result) {
                console.log(`${r.result.length} txns in block ${blockHash}`)
                for (const tx of r.result) {
                    addrs = [...addrs, ...collectAddresses(tx.result)]
                }
            }
        }
        const addresses = new Set(addrs)
        console.log("addresses count:", addresses.size)

        // await fetch("https://test.sentio.xyz/api/v1/solidity/sync_contracts",{
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify(data)
        // }).catch(console.error)
        //
        //
        // let addresses = new Set<string>()
        // for (const trace of b.traces || []) {
        //     if (trace.action.input && trace.action.input != '0x' && trace.action.to) {
        //         addresses.add(trace.action.to)
        //     }
        // }
        // console.log("addresses count:", addresses.size)

        const d = {
            networkId: networkId,
            disableOptimizer: false,
            addresses: Array.from(addresses),
        }
        await fetch("https://test.sentio.xyz/api/v1/solidity/sync_contracts",{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(d)
        }).catch(console.error)
    },
    1,
    1,
    {
        block: true,
        transaction: false,
        trace: false,
    }
)
