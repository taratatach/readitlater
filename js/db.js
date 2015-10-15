"use strict";

// Load indexedDB
window.indexedDB = window.indexedDB || window.mozIndexedDB;

window.LinksDB = (function(){
  const DB_NAME = "ReadItLater";
  const DB_VERSION = 1;
  const DB_STORE_NAME = "links";

  var LinksDB = {
    _db: null,

    _createObjectStore: function(db) {
      var objectStore = db.createObjectStore(DB_STORE_NAME, { keyPath: "url" });

      objectStore.createIndex("title", "title", { unique: false });
      objectStore.createIndex("read", "read", { unique: false });
      objectStore.createIndex("addedAt", "addedAt", { unique: false });
    },

    ready: function() {
      var promise = new Promise(function(resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onsuccess = function() {
          this._db = request.result;

          resolve();
        }.bind(this);

        request.onerror = function() {
          reject();
        };

        request.onupgradeneeded = function(event) {
          this._createObjectStore(event.target.result);
        }.bind(this);
      }.bind(this));

      return promise;
    },

    getLinks: function() {
      var promise = new Promise(function(resolve, reject) {
        var transaction = this._db.transaction(DB_STORE_NAME);
        var request = transaction.objectStore(DB_STORE_NAME).openCursor();
        var links = [];

        request.onsuccess = function() {
          var cursor = request.result;

          if (cursor) {
            links.push(cursor.value);
            cursor.continue();
          } else {
            resolve(links);
          }
        };

        request.onerror = function() {
          reject();
        };
      }.bind(this));

      return promise;
    },

    getLink: function(url) {
      var promise = new Promise(function(resolve, reject) {
        var transaction = this._db.transaction(DB_STORE_NAME);
        var request = transaction.objectStore(DB_STORE_NAME).get(url);

        request.onsuccess = function() {
          resolve(request.result);
        };

        request.onerror = function() {
          reject();
        };
      }.bind(this));

      return promise;
    },

    addLink: function(url) {
      var promise = new Promise(function(resolve, reject) {
        var linkObject = {
          url: url,
          title: url,
          read: false,
          addedAt: Date.now()
        };

        var transaction = this._db.transaction([DB_STORE_NAME], "readwrite");
        var request = transaction.objectStore(DB_STORE_NAME).add(linkObject);

        request.onsuccess = function() {
          resolve(linkObject);
        };

        request.onerror = function() {
          reject();
        };
      }.bind(this));

      return promise;
    },

    markLinkRead: function(url) {
      var promise = new Promise(function(resolve, reject) {
        var transaction = this._db.transaction([DB_STORE_NAME], "readwrite");
        var getRequest = transaction.objectStore(DB_STORE_NAME).get(url);

        getRequest.onsuccess = function() {
          var link = getRequest.result;
          link.read = true;

          var putRequest = transaction.objectStore(DB_STORE_NAME).put(link);

          putRequest.onsuccess = function() {
            resolve(link);
          };

          putRequest.onerror = function() {
            reject();
          };
        }.bind(this);

        getRequest.onerror = function() {
          reject();
        };
      }.bind(this));

      return promise;
    }
  };

  return LinksDB;
})();