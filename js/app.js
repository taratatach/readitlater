"use strict";

(function(){
  var webActivity;

  // Reload and display all the links stored in the DB
  function displayLinks() {
    var getLinks = LinksDB.getLinks();
    var linkList = document.getElementById("links");

    getLinks.then(function(linkObjects) {
      linkList.innerHTML = "";

      linkObjects.forEach(function(linkObject) {
        var linkElem = createLinkElem(linkObject);

        linkList.appendChild(linkElem);
      });
    });
  }

  // Create custom Link element to be inserted in the link list
  function createLinkElem(linkObject) {
    var listElem = document.createElement("li");
    var linkElem = document.createElement("a");

    linkElem.innerHTML = linkObject.title;
    linkElem.setAttribute("href", linkObject.url);
    linkElem.setAttribute("target", "_blank");

    listElem.classList.add("link");
    if (linkObject.read) {
      listElem.classList.add("is-read");
    }

    linkElem.onclick = function() {
      markAsRead(linkObject);
    };

    listElem.appendChild(linkElem);

    return listElem;
  }

  // Change read state in DB for given linkObject
  // Reload and display all the links in the DB
  function markAsRead(linkObject) {
    var markLinkread = LinksDB.markLinkRead(linkObject.url);

    markLinkread.then(function() {
      displayLinks();
    });
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

      LinksDB.ready().then(function() {
        displayLinks();

        // Handle incoming URLs
        navigator.mozSetMessageHandler("activity", function(activityRequest) {
          webActivity = activityRequest;

          var url = webActivity.source.data.url;
          var addLink = LinksDB.addLink(url);

          addLink.then(function() {
            displayLinks();
            webActivity.postResult();
          }).catch(function() {
            webActivity.postError("Error. Link was not saved.");
          });
        });
      });
    }

  });
})();