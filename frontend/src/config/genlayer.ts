import { defineChain } from 'viem';

// Live Deployed Contract on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = '0x7d7aD14e9276d612E2A9a6edC0108ECb99649FaD';
export const CONTRACT_ADDRESS = (((import.meta as any)?.env?.VITE_CONTRACT_ADDRESS as string) || DEFAULT_CONTRACT_ADDRESS) as `0x${string}`;

// Studionet Chain Definitions
export const studionet = defineChain({
  id: 61999,
  name: 'GenLayer Studio Network',
  nativeCurrency: {
    name: 'GEN Token',
    symbol: 'GEN',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://studio.genlayer.com/api'],
    },
    public: {
      http: ['https://studio.genlayer.com/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'GenLayer Explorer',
      url: 'https://explorer-studio.genlayer.com',
    },
  },
});

export const STUDIONET_CHAIN_ID_HEX = `0x${studionet.id.toString(16)}`; // 0xF1EF
export const STUDIONET_ALT_HEX = '0xF22F';
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIONET_EXPLORER_URL = 'https://explorer-studio.genlayer.com';
export const STUDIO_PORTAL_URL = 'https://studio.genlayer.com';

/* -------------------------------------------------------------------------- */
/*                           Calldata Encoding Logic                          */
/* -------------------------------------------------------------------------- */
const BITS_IN_TYPE = 3;
const TYPE_SPECIAL = 0;
const TYPE_PINT = 1;
const TYPE_NINT = 2;
const TYPE_STR = 4;
const TYPE_ARR = 5;
const TYPE_MAP = 6;
const SPECIAL_NULL = (0 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_FALSE = (1 << BITS_IN_TYPE) | TYPE_SPECIAL;
const SPECIAL_TRUE = (2 << BITS_IN_TYPE) | TYPE_SPECIAL;

function writeNum(to: number[], data: bigint) {
  if (data === 0n) {
    to.push(0);
    return;
  }
  let curData = data;
  while (curData > 0n) {
    let cur = Number(curData & 0x7fn);
    curData >>= 7n;
    if (curData > 0n) {
      cur |= 128;
    }
    to.push(cur);
  }
}

function encodeNumWithType(to: number[], data: bigint, type: number) {
  const res = (data << BigInt(BITS_IN_TYPE)) | BigInt(type);
  writeNum(to, res);
}

function encodeNum(to: number[], data: bigint) {
  if (data >= 0n) {
    encodeNumWithType(to, data, TYPE_PINT);
  } else {
    encodeNumWithType(to, -data - 1n, TYPE_NINT);
  }
}

function encodeMap(to: number[], arr: [string, any][]) {
  const newEntries = arr.map(([k, v]) => [
    Array.from(k, (x) => x.codePointAt(0)!),
    new TextEncoder().encode(k),
    v,
  ] as const);

  newEntries.sort((v1, v2) => {
    const l = v1[0];
    const r = v2[0];
    for (let index = 0; index < l.length && index < r.length; index++) {
      const cur = l[index] - r[index];
      if (cur !== 0) return cur;
    }
    return l.length - r.length;
  });

  encodeNumWithType(to, BigInt(newEntries.length), TYPE_MAP);
  for (const [, k, v] of newEntries) {
    writeNum(to, BigInt(k.length));
    for (const c of k) {
      to.push(c);
    }
    encodeVal(to, v);
  }
}

function encodeVal(to: number[], val: any) {
  if (val === null || val === undefined) {
    to.push(SPECIAL_NULL);
  } else if (typeof val === 'boolean') {
    to.push(val ? SPECIAL_TRUE : SPECIAL_FALSE);
  } else if (typeof val === 'number') {
    encodeNum(to, BigInt(val));
  } else if (typeof val === 'bigint') {
    encodeNum(to, val);
  } else if (typeof val === 'string') {
    const encoded = new TextEncoder().encode(val);
    encodeNumWithType(to, BigInt(encoded.length), TYPE_STR);
    for (const b of encoded) {
      to.push(b);
    }
  } else if (Array.isArray(val)) {
    encodeNumWithType(to, BigInt(val.length), TYPE_ARR);
    for (const elem of val) {
      encodeVal(to, elem);
    }
  } else if (typeof val === 'object') {
    encodeMap(to, Object.entries(val));
  } else {
    throw new Error(`Unsupported type: ${typeof val}`);
  }
}

export function encodeCalldata(method: string, args: any[]): `0x${string}` {
  const res: number[] = [];
  encodeVal(res, method);
  encodeVal(res, args);
  encodeVal(res, {});
  return `0x${res.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/* -------------------------------------------------------------------------- */
/*                           RPC Client Methods                               */
/* -------------------------------------------------------------------------- */

export async function readContract(
  method: string,
  args: any[] = [],
  contractAddress: string = CONTRACT_ADDRESS
): Promise<any> {
  const calldata = encodeCalldata(method, args);
  const res = await fetch(STUDIONET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: contractAddress,
          data: calldata,
        },
        'latest',
      ],
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'GenLayer eth_call failed');
  }

  // Parse result from JSON or hex
  const result = data.result;
  if (!result || result === '0x') return null;

  try {
    // If it is hex-encoded string
    if (typeof result === 'string' && result.startsWith('0x')) {
      const hex = result.slice(2);
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      // Check if it's JSON
      const jsonStart = str.indexOf('{');
      const jsonArrStart = str.indexOf('[');
      const start = jsonStart !== -1 && (jsonArrStart === -1 || jsonStart < jsonArrStart) ? jsonStart : jsonArrStart;
      if (start !== -1) {
        return JSON.parse(str.slice(start));
      }
      return str;
    }
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export async function getGenBalance(address: string): Promise<string> {
  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const data = await res.json();
    if (data.result) {
      const wei = BigInt(data.result);
      const whole = wei / 1_000_000_000_000_000_000n;
      const frac = (wei % 1_000_000_000_000_000_000n).toString().padStart(18, '0').slice(0, 3);
      return `${whole}.${frac} GEN`;
    }
  } catch (err) {
    console.warn('Could not fetch balance', err);
  }
  return '0.000 GEN';
}

export async function waitForTransactionReceipt(txHash: string, timeoutMs: number = 90000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const data = await res.json();
      const txData = data?.result;

      if (txData) {
        const execResultName = String(txData.tx_execution_result_name || '').toUpperCase();
        const execResultCode = String(txData.tx_execution_result || '');
        const statusName = String(txData.status_name || '').toUpperCase();
        const statusCode = String(txData.status || '');

        if (statusName === 'CANCELED' || statusCode === '8') {
          throw new Error('Transaction was canceled by GenLayer consensus (status: CANCELED).');
        }
        if (statusName === 'UNDETERMINED' || statusCode === '6') {
          throw new Error('Transaction outcome undetermined by GenLayer validators (status: UNDETERMINED).');
        }

        if (execResultName === 'FINISHED_WITH_ERROR' || execResultCode === '2') {
          const rawError =
            txData.genvm_result?.error_description ||
            txData.genvm_result?.stderr ||
            txData.error_description ||
            'Contract execution reverted on GenVM (FINISHED_WITH_ERROR)';
          throw new Error(`Transaction reverted on GenVM (FINISHED_WITH_ERROR): ${rawError}`);
        }

        if (execResultName === 'FINISHED_WITH_RETURN' || execResultCode === '1') {
          return txData;
        }

        if (statusName === 'FINALIZED' || statusName === 'ACCEPTED' || statusCode === '7' || statusCode === '5') {
          return txData;
        }
      }

      // Check standard EVM receipt
      const recRes = await fetch(STUDIONET_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: Date.now(),
        }),
      });
      const recData = await recRes.json();
      if (recData?.result) {
        if (recData.result.status === '0x1' || recData.result.status === 1) {
          return recData.result;
        }
        if (recData.result.status === '0x0' || recData.result.status === 0) {
          throw new Error(`Transaction reverted with EVM status 0 (Tx: ${txHash})`);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('reverted') || e?.message?.includes('FINISHED_WITH_ERROR')) {
        throw e;
      }
    }

    await new Promise((r) => setTimeout(r, 2500));
  }

  throw new Error(`Transaction confirmation timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

export async function switchToStudionet(): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not detected. Please install MetaMask to interact with GenLayer.');
  }

  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
  } catch (switchError: any) {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_ALT_HEX }],
      });
    } catch {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: STUDIONET_CHAIN_ID_HEX,
            chainName: 'GenLayer Studio Network',
            nativeCurrency: {
              name: 'GEN Token',
              symbol: 'GEN',
              decimals: 18,
            },
            rpcUrls: [STUDIONET_RPC_URL],
            blockExplorerUrls: [STUDIONET_EXPLORER_URL],
          },
        ],
      });
    }
  }
}
