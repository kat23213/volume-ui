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
let totalVolumeRun = 0;

// Telegram info
const TELEGRAM_BOT_TOKEN = "8117841094:AAGsK_dt2o_tuaLb6NrofgFeEyv6qF0M-Gc";
const TELEGRAM_CHAT_ID = "5368276476";

function log(msg) {
  const box = document.getElementById("logBox");
  box.innerText += `\n${new Date().toLocaleTimeString()} - ${msg}`;
  box.scrollTop = box.scrollHeight;
}

function cancelBot() {
  stop = true;
  log("❌ Bot đã huỷ.");
}

async function sendTelegram(msg) {
  try {
    const encoded = encodeURIComponent(msg);
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encoded}`);
  } catch (e) {
    log("⚠️ Không gửi được Telegram.");
  }
}

async function checkTxExists(txHash) {
  for (let i = 0; i < 5; i++) {
    const tx = await provider.getTransaction(txHash);
    if (tx) return true;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}

async function updateBalance() {
  try {
    const balance = await provider.getBalance(wallet.address);
    const bnb = Number(ethers.formatEther(balance)).toFixed(4);
    document.getElementById("walletBalance").innerText = bnb;
  } catch (e) {
    document.getElementById("walletBalance").innerText = "Không lấy được";
  }
}

async function startBot() {
  try {
    stop = false;
    totalVolumeRun = 0;
    document.getElementById("totalVol").innerText = "0.0000";

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

    await updateBalance();
    const txCount = Math.floor(total / perTx);
    log(`🔁 Sẽ thực hiện ${txCount} giao dịch...`);

    for (let i = 0; i < txCount; i++) {
      if (stop) break;
      const value = ethers.parseEther(perTx.toString());

      log(`🚀 Giao dịch ${i + 1}/${txCount}...`);
      const tx = await contract.swapAndResell(token, 0, 0, { value });
      log("⏳ Đợi xác nhận TX hash...");

      const exists = await checkTxExists(tx.hash);
      if (!exists) {
        log("❌ Không tìm thấy TX trên BSC: " + tx.hash);
        continue;
      }

      log("✅ TX gửi đi: " + tx.hash);
      const receipt = await tx.wait();
      totalVolumeRun += perTx;
      log(`📦 Đã xác nhận trong block: ${receipt.blockNumber}`);
      log(`📊 Tổng volume đã chạy: ${totalVolumeRun.toFixed(4)} BNB`);
      document.getElementById("totalVol").innerText = totalVolumeRun.toFixed(4);
      await updateBalance();

      await sendTelegram(`🔥 Giao dịch thành công!\nTX: ${tx.hash}\nTổng volume đã chạy: ${totalVolumeRun.toFixed(4)} BNB`);
    }

    if (!stop) log("🎉 Tất cả giao dịch đã hoàn tất!");
  } catch (err) {
    log("❌ Lỗi: " + err.message);
  }
}
