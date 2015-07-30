var db;
var webActivity;

// Load indexedDB
window.indexedDB = window.indexedDB || window.mozIndexedDB;

// Manage database
function openDB(successCallback) {
  console.log("Opening DB...");
  var DBOpenRequest = window.indexedDB.open("ReadItLater", 1);

  DBOpenRequest.onsuccess = function(event) {
    console.log("DB opened!");
    db = DBOpenRequest.result;
    successCallback();
  };

  DBOpenRequest.onupgradeneeded = function(event) {
    console.log("DB upgrade needed");
    var db = event.target.result;
    var objectStore = db.createObjectStore("links", { keyPath: "url" });

    objectStore.createIndex("title", "title", { unique: false });
    objectStore.createIndex("read", "read", { unique: false });
    objectStore.createIndex("addedAt", "addedAt", { unique: false });
  };
}

// Handle incoming URLs
navigator.mozSetMessageHandler('activity', function(activityRequest) {
  webActivity = activityRequest;
  
  var url = webActivity.source.data.url;
  console.log("Saving", url);
  openDB(function() {
    saveLink(url);
  });
});

// Create link object and store in DB
function saveLink(url) {
  console.log("saveLink called");
  var newLink = { url: url, title: url, read: false, addedAt: Date.now() };
  var transaction = db.transaction(["links"], "readwrite");
  var objectStore = transaction.objectStore("links");
  var objectStoreRequest = objectStore.add(newLink);
  
  objectStoreRequest.onsuccess = function(event) {
    console.log("Link saved!");
    displayLinks();
    webActivity.postResult("Link saved for later!");
  };
  objectStoreRequest.onerror = function(event) {
    console.log("[error]", event.target.error.message);
    webActivity.postError("Error. Link was not saved.");
  };
}

// Open clicked link in browser
function openLink(event) {
  var url = event.target.dataset.url;
  console.log("Opening link", url);
    
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
  console.log('Marking read', url);
  
  var objectStore = db.transaction(['links'], 'readwrite').objectStore('links');
  var linkRequest = objectStore.get(url);
  
  linkRequest.onsuccess = function(event) {
    var link = linkRequest.result;
    
    if (!link.read) {
      link.read = true;

      var updateLinkRequest = objectStore.put(link);
      updateLinkRequest.onsuccess = function() {
        displayLinks();
      }
    }
  }
}

// Add saved links to the DOM
function displayLinks() {
  console.log('Displaying saved links');
  var links = document.getElementById('links');
  links.innerHTML = '';
  
  var objectStore = db.transaction('links').objectStore('links');
  objectStore.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;
    
    if(cursor) {
      var link = document.createElement('li');
      link.classList.add('link');
      link.innerHTML = cursor.value.title;
      link.setAttribute('data-url', cursor.value.url);
      if (cursor.value.read) {
        link.classList.add('is-read');
      }
      link.onclick = function(event) {
        openLink(event);
      };
      
      links.appendChild(link);
      
      cursor.continue();
    }
  };
}

// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var translate = navigator.mozL10n.get;

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
    })
  }

});
