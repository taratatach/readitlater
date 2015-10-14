"use strict";

(function(){
  var db, webActivity;

  // Load indexedDB
  window.indexedDB = window.indexedDB || window.mozIndexedDB;

  // Manage database
  function openDB(successCallback) {
    var DBOpenRequest = window.indexedDB.open("ReadItLater", 1);

    DBOpenRequest.onsuccess = function() {
      db = DBOpenRequest.result;
      successCallback();
    };

    DBOpenRequest.onupgradeneeded = function(event) {
      db = event.target.result;
      var objectStore = db.createObjectStore("links", { keyPath: "url" });

      objectStore.createIndex("title", "title", { unique: false });
      objectStore.createIndex("read", "read", { unique: false });
      objectStore.createIndex("addedAt", "addedAt", { unique: false });
    };
  }

  // Create link object and store in DB
  function saveLink(url) {
    var title = url;
    var newLink = { url: url, title: title, read: false, addedAt: Date.now() };
    var transaction = db.transaction(["links"], "readwrite");
    var objectStore = transaction.objectStore("links");
    var objectStoreRequest = objectStore.add(newLink);

    objectStoreRequest.onsuccess = function() {
      displayLinks();
      webActivity.postResult("Link saved for later!");
    };
    objectStoreRequest.onerror = function() {
      webActivity.postError("Error. Link was not saved.");
    };
  }

  // Open clicked link in browser
  function openLink(url) {
    var activity = new MozActivity({
      name: "view",
      data: {
        type: "url",
        url: url
      }
    });

    activity.onsuccess = function() {
      markAsRead(url);
    };
  }

  // Change read state in DB for given url
  function markAsRead(url) {
    var objectStore = db.transaction(["links"], "readwrite").objectStore("links");
    var linkRequest = objectStore.get(url);

    linkRequest.onsuccess = function() {
      var link = linkRequest.result;

      if (!link.read) {
        link.read = true;

        var updateLinkRequest = objectStore.put(link);
        updateLinkRequest.onsuccess = function() {
          displayLinks();
        };
      }
    };
  }

  // Add saved links to the DOM
  function displayLinks() {
    var links = document.getElementById("links");
    links.innerHTML = "";

    var objectStore = db.transaction("links").objectStore("links");
    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;

      if (cursor) {
        var link = createLink(
          cursor.value.title,
          cursor.value.url,
          cursor.value.read
        );
        links.appendChild(link);

        cursor.continue();
      }
    };
  }

  function createLink(title, url, isRead) {
    var link = document.createElement("li");

    link.innerHTML = title;
    link.setAttribute("data-url", url);

    link.classList.add("link");
    if (isRead) {
      link.classList.add("is-read");
    }

    link.onclick = function() {
      openLink(url);
    };

    return link;
  }

  // DOMContentLoaded is fired once the document has been loaded and parsed,
  // but without waiting for other external resources to load (css/images/etc)
  // That makes the app more responsive and perceived as faster.
  // https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
  window.addEventListener("DOMContentLoaded", function() {
    // var translate = navigator.mozL10n.get;

    // We want to wait until the localisations library has loaded all the strings.
    // So we'll tell it to let us know once it's ready.
    navigator.mozL10n.once(start);

    // ---

    function start() {

      // var message = document.getElementById('message');

      // We're using textContent because inserting content from external sources into your page using innerHTML can be dangerous.
      // https://developer.mozilla.org/Web/API/Element.innerHTML#Security_considerations
      // message.textContent = translate('message');

      openDB(function() {
        displayLinks();
      });

      // Handle incoming URLs
      navigator.mozSetMessageHandler("activity", function(activityRequest) {
        webActivity = activityRequest;

        var url = webActivity.source.data.url;
        openDB(function() {
          saveLink(url);
        });
      });
    }

  });
})();