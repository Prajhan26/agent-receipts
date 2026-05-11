import { createHash } from "node:crypto";

const URLS = [
  "https://raw.githubusercontent.com/torvalds/linux/master/COPYING",
  "https://ipfs.io/ipfs/QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
  "https://raw.githubusercontent.com/bitcoin/bitcoin/master/COPYING",
];

const WAIT_MS = 10 * 60 * 1000; // 10 minutes

async function fetchAndHash(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const body = await res.arrayBuffer();
  return createHash("sha256").update(Buffer.from(body)).digest("hex");
}

async function main() {
  console.log(`Fetching ${URLS.length} URLs (round 1)...\n`);

  const round1 = await Promise.all(
    URLS.map(async (url) => {
      const hash = await fetchAndHash(url);
      console.log(`  [1] ${url}\n      ${hash}`);
      return hash;
    })
  );

  console.log(`\nWaiting 10 minutes...\n`);
  await new Promise((resolve) => setTimeout(resolve, WAIT_MS));

  console.log(`Fetching ${URLS.length} URLs (round 2)...\n`);

  const round2 = await Promise.all(
    URLS.map(async (url) => {
      const hash = await fetchAndHash(url);
      console.log(`  [2] ${url}\n      ${hash}`);
      return hash;
    })
  );

  console.log("\n--- Results ---\n");
  for (let i = 0; i < URLS.length; i++) {
    const match = round1[i] === round2[i];
    const status = match ? "PASS" : "FAIL";
    console.log(`${status}  ${URLS[i]}`);
    if (!match) {
      console.log(`      round1: ${round1[i]}`);
      console.log(`      round2: ${round2[i]}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
