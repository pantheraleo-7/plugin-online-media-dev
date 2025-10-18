import mustache from "mustache";

function init() {
  iina.postMessage("requestUpdate", { force: true });

  let interval = null;

  const startUpdate = () =>
    (interval = setInterval(() => {
      iina.postMessage("requestUpdate", { force: false });
    }, 1000));
  const stopUpdate = () => clearInterval(interval);

  iina.onMessage("update", (msg) => {
    if (msg.active) {
      startUpdate();
    } else {
      stopUpdate();
    }
    msg.data.forEach((item) => {
      item[`is_${item.status}`] = true;
      item.dest_base64 = utf8_to_b64(item.dest);
    });
    document.getElementById("download-content").style.display = "block";
    document.getElementById("download-content").innerHTML = mustache.render(TEMPLATE, msg);
  });

  iina.onMessage("binaryDisableUpdate", () => {
    document.getElementById("update-binary").disabled = true;
    document.getElementById(`ytdlp-spinner-container`).style.display = "none";
    document.getElementById("ytdlp-result").style.display = "block";
    document.getElementById("ytdlp-result").textContent = `A custom yt-dlp installation is in use,
      please update it manually or (if managed) via your package/tool manager.`;
  });

  iina.onMessage("binaryExecuted", ({ res, msg, id, tag = "pre" }) => {
    binary_executed(res, msg, id, tag);
  });

  window.openFile = function (file) {
    iina.postMessage("openFile", { file: b64_to_utf8(file) });
  };

  window.revealFile = function (file) {
    iina.postMessage("revealFile", { fileName: b64_to_utf8(file) });
  };

  document.getElementById("verify-binary").addEventListener("click", () => {
    verifyBinary();
  });

  document.getElementById("update-binary").addEventListener("click", () => {
    binary_executing("Downloading...", "ytdlp");
    iina.postMessage("updateBinary");
  });
}

document.addEventListener("DOMContentLoaded", init);

function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

function binary_executing(msg, id) {
  document.getElementById(`${id}-result`).style.display = "none";
  document.getElementById(`${id}-spinner-container`).style.display = "block";
  document.getElementById(`${id}-spinner-message`).textContent = msg;
}

function binary_executed(res, msg, id, tag = "pre") {
  document.getElementById(`${id}-spinner-container`).style.display = "none";
  document.getElementById(`${id}-result`).style.display = "block";
  document.getElementById(`${id}-result`).style.color = res.status === 0 ? "" : "#ff3b30";
  document.getElementById(`${id}-result`).innerHTML =
    (msg ? msg : "") +
    (res.status === 0 ? `<${tag}>` + res.stdout + `</${tag}>` : "<pre>" + res.stderr + "</pre>");
}

function verifyBinary() {
  binary_executing("Verifying...", "ytdlp");

  iina.postMessage("verifyBinary");
  iina.onMessage("binaryResult", ({ path, res }) => {
    let msg = "";
    if (path === null) {
      msg += `Unable to find yt-dlp bundled with IINA.
        Troubleshooting:
        - Reinstall IINA
        - If you have an existing installation of yt-dlp, either put it in $PATH
        or set its path in 'Plugins>Online Media>Settings>Custom yt-dlp path'`;
      document.getElementById("update-binary").disabled = true;
    } else if (path === "iina-ytdl") {
      msg += `You are using yt-dlp bundled with IINA. It is recommended to keep it up to date.`;
      document.getElementById("update-binary").disabled = false;
    } else {
      msg += `You are using a custom yt-dlp installation, configured in the plugin settings.
        You may need to update it manually.`;
      path = path.replaceAll("/", "/<wbr>");
      document.getElementById("update-binary").disabled = true;
    }

    msg +=
      "<br><br>" +
      (path && path !== "iina-ytdl" ? `Path: <pre>${path}</pre><br>` : "") +
      (res.status === 0 ? "Version: " : "");

    binary_executed(res, msg, "ytdlp");
  });
}

const TEMPLATE = `
<div class="downloads-window">
{{#data}}
<div class="download-item">
<div class="filename">{{filename}}</div>
<div class="progress">
<div class="left">
{{#is_pending}}
Pending
{{/is_pending}}
{{#is_downloading}}
{{dl}}/{{total}} (ETA {{eta}})
{{/is_downloading}}
{{#is_done}}
Done
{{/is_done}}
{{#is_error}}
Error: {{error}}
{{/is_error}}
</div>
<div class="right task-options">
{{#is_done}}
<a href="#" onclick="openFile('{{dest_base64}}')">Open</a>
<a href="#" onclick="revealFile('{{dest_base64}}')">Reveal in Finder</a>
{{/is_done}}
</div>
</div>
</div>
{{/data}}
{{^data}}
<div class="no-task">No downloads. If you just started a download, it may take a few seconds to show up here.</div>
{{/data}}
</div>
`;
