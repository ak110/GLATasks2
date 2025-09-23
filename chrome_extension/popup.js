document.addEventListener('DOMContentLoaded', function() {
  const saveButton = document.getElementById('saveButton');

  saveButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const title = encodeURIComponent(currentTab.title || "");
      const url = encodeURIComponent(currentTab.url || "");
      const targetUrl = `https://glatasks.tqzh.tk/share/ingest?title=${title}&url=${url}`;

      chrome.tabs.create({
        url: targetUrl
      });

      window.close();
    });
  });
});
