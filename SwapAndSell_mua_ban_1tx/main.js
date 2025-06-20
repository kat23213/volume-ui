const contractAddress = "0xC2dE1BEc6Eb0f978400E1Db79fF66d51F90b81DC";
const abi = [
  {
    "inputs":[
      {"internalType":"address","name":"tokenOut","type":"address"},
      {"internalType":"uint256","name":"amountOutMinBuy","type":"uint256"},
      {"internalType":"uint256","name":"amountOutMinSell","type":"uint256"}
    ],
    "name":"swapAndResell",
    "outputs":[],
    "stateMutability":"payable",
    "type":"function"
  }
];

let provider, wallet, contract, stop = false;

function log(msg) {
  const box = document.getElementById("logBox");
  box.innerText += `\n${new Date().toLocaleTimeString()} - ${msg}`;
  box.scrollTop = box.scrollHeight;
}

function cancelBot() {
  stop = true;
  log("❌ Bot đã huỷ.");
}

async function checkTxExists(txHash) {
  for (let i = 0; i < 5; i++) {
    const tx = await provider.getTransaction(txHash);
    if (tx) return true;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function startBot() {
  try {
    stop = false;
    const pk = document.getElementById("privateKey").value.trim();
    const token = document.getElementById("tokenAddress").value.trim();
    const total = parseFloat(document.getElementById("totalVolume").value);
    const perTx = parseFloat(document.getElementById("perTxVolume").value);

    if (!pk || !token || !total || !perTx || perTx <= 0) {
      log("⚠️ Vui lòng nhập đầy đủ thông tin hợp lệ.");
      return;
    }

    provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    wallet = new ethers.Wallet(pk, provider);
    contract = new ethers.Contract(contractAddress, abi, wallet);

    const txCount = Math.floor(total / perTx);
    log(`🔁 Sẽ thực hiện ${txCount} giao dịch...`);

    for (let i = 0; i < txCount; i++) {
      if (stop) break;
      const value = ethers.parseEther(perTx.toString());

      log(`🚀 Giao dịch ${i + 1}/${txCount}...`);
      const tx = await contract.swapAndResell(token, 0, 0, { value });
      log("⏳ Đợi xác nhận TX hash trên chain...");

      const exists = await checkTxExists(tx.hash);
      if (!exists) {
        log("❌ Không tìm thấy TX trên BSC: " + tx.hash);
        continue;
      }

      log("✅ TX gửi đi: " + tx.hash);
      const receipt = await tx.wait();
      log("📦 Đã xác nhận trong block: " + receipt.blockNumber);
    }

    if (!stop) log("🎉 Tất cả giao dịch đã hoàn tất!");
  } catch (err) {
    log("❌ Lỗi: " + err.message);
  }
}
