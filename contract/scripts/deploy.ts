import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Network:  ", network.name);
  console.log("Deployer: ", deployer.address);
  console.log(
    "Balance:  ",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  console.log("\nDeploying ReceiptAnchor...");
  const factory = await ethers.getContractFactory("ReceiptAnchor");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction()!;
  const receipt = await deployTx.wait();

  console.log("\n✓ Deployed");
  console.log("  Address:  ", address);
  console.log("  Tx hash:  ", deployTx.hash);
  console.log("  Block:    ", receipt!.blockNumber);

  // Save deployment info for anchor-service and dashboard to consume
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts/contracts/ReceiptAnchor.sol/ReceiptAnchor.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const deployment = {
    network: network.name,
    chainId: network.config.chainId,
    address,
    deployer: deployer.address,
    txHash: deployTx.hash,
    blockNumber: receipt!.blockNumber,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("\n  Saved to deployments/", `${network.name}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
