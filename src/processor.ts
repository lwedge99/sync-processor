import { GlobalProcessor } from "@sentio/sdk/eth";
import { EthChainId } from '@sentio/chain'

GlobalProcessor.bind({
    startBlock: 17542480,
    network: EthChainId.ETHEREUM,
}).onBlockInterval(
    async (b, ctx) => {
        let addresses = new Set<string>()
        for (const trace of b.traces || []) {
            if (trace.action.input && trace.action.input != '0x' && trace.action.to) {
                addresses.add(trace.action.to)
            }
        }
        console.log("addresses count:", addresses.size)

        const data = {
            disableOptimizer: false,
            addresses: Array.from(addresses),
        }
        await fetch("https://test.sentio.xyz/api/v1/solidity/sync_contracts",{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        }).catch(console.error)
    },
    1,
    1,
    {
        block: true,
        transaction: true,
        trace: true,
    }
)
