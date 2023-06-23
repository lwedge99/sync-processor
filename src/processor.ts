import { GlobalProcessor } from "@sentio/sdk/eth";
import { EthChainId } from '@sentio/chain'

import { PromisePool } from '@supercharge/promise-pool'

GlobalProcessor.bind({
    startBlock: 17529715,
    network: EthChainId.ETHEREUM,
}).onBlockInterval(
    async (b, ctx) => {
        let addresses = new Set<string>()
        for (const trace of b.traces || []) {
            if (trace.action.from) {
                addresses.add(trace.action.from)
            }
            if (trace.action.to) {
                addresses.add(trace.action.to)
            }
        }
        console.log("addresses count:", addresses.size)
        let i = 0
        await PromisePool
            .for(Array.from(addresses))
            .onTaskStarted((address, pool) => {
                if (++i % 20 == 0) {
                    console.log(`done: ${pool.processedPercentage().toFixed(2)}%`)
                }
            })
            .withConcurrency(4)
            .handleError(async (err, addr) => {
                console.error(`sync ${addr} error:`, err)
            })
            .process(async address =>
                fetch("https://staging.sentio.xyz/api/v1/solidity/sync_contract?address=" + address + "&disableOptimizer=false"))
    },
    1,
    1,
    {
        block: true,
        transaction: true,
        trace: true,
    }
)
