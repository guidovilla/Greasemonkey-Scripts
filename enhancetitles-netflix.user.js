// Enhance titles - Netflix
//
// Loads lists of movies from a local list and an IMDb account and uses
// them to highlight or hide titles on Netflix.
//
// https://greasyfork.org/scripts/390631-enhance-titles-netflix
// Copyright (C) 2019, Guido Villa
// Most of the script is taken from IMDb 'My Movies' enhancer:
// Copyright (C) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// For instructions on user scripts, see:
// https://greasyfork.org/help/installing-user-scripts
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name            Enhance titles - Netflix
// @description     Emphasize or hide titles on Netflix according to IMDb and local lists
// @version         1.5
// @author          guidovilla
// @date            19.10.2019
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://greasyfork.org/scripts/390631-enhance-titles-netflix
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
// @contributionURL https://tinyurl.com/gv-donate-7e
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
// @downloadURL     https://greasyfork.org/scripts/390631-enhance-titles-netflix/code/Enhance%20titles%20-%20Netflix.user.js
// @updateURL       https://greasyfork.org/scripts/390631-enhance-titles-netflix/code/Enhance%20titles%20-%20Netflix.meta.js
// @downloadURL     https://openuserjs.org/install/guidovilla/Enhance_titles_-_Netflix.user.js
// @updateURL       https://openuserjs.org/meta/guidovilla/Enhance_titles_-_Netflix.meta.js
//
// @match           https://www.netflix.com/*
// @match           https://www.imdb.com/user/*/lists*
// @exclude         https://www.netflix.com/watch*
//
// @require         https://greasyfork.org/scripts/390248-entrylist/code/EntryList.js
// @require         https://greasyfork.org/scripts/391236-progressbar/code/ProgressBar.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_deleteValue
// @grant           GM_listValues
// @grant           GM_notification
// @grant           GM_addStyle
// @grant           GM_xmlhttpRequest
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] Not all IMDb movies are recognized because matching is done by title
//   - [M] Move GMprom_xhR and parseCSV to utility library (with some from EntryList)
//   - [M] Move IMDb list function to utility library
//   - [M] Optimize imdb list parsing
//   - [M] Show name in tooltip? Maybe not needed if above is solved
//   - [M] Make triangles more visible
//   - [M] Show in tooltip all lists where title is present?
//   - [M] GMprom_xhR: remove workaround responseXML2 and have responseXML work
//   - [M] Remove commented code
//   - [M] Lots of clean-up
//   - [M] Add comments
//   - [M] Delay autopreview for hidden movies?
//   - [L] Re-enable download of ratings and checkins
//   - [L] No link between IMDb user and Netflix user, implement getSourceUserFromTargetUser
//   - [L] hide selective titles?
//
// Changelog:
// ----------
// 2019.10.19  [1.5] Refactor using EntryList library (first version)
// 2019.09.30  [1.4] First public version, correct @namespace and other headers
// 2019.08.28  [1.3] Make the list more visible (top right triangle instead of border, with tooltip)
//                   Fix unhide function (bug added in 1.2)
//                   Add priority in todo list
// 2019.07.06  [1.2] Fix working in pages without rows (i.e. search page)
//                   Fix opacity not applied in some cases/pages
// 2019.06.20  [1.1] Load My List from My List page
// 2019.06.01  [1.0] Hide "My List" titles outside "My List" (row and page) and "Continue watching"
//                   Fix user name detection
//                   Gets data both from locally hidden movies and from IMDb lists
// 2019.03.30  [0.1] First test version, private use only
//

/* jshint -W008 */
/* global EL: readonly, ProgressBar: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var netflix = EL.newContext('Netflix');
    var imdb    = EL.newContext('IMDb');

    // other variables
    // TODO ci deve essere un modo migliore di questo
    var LIST_HIDE  = 'localHide';
    var LIST_NF_MY = 'nfMyList';
    var LIST_NO    = 'no';             // myLists[neededLists.no]   XXX rimuovere poi questi commenti
    var LIST_SEEN  = 'Visti';          // myLists[neededLists.visti]
    var LIST_WATCH = 'Your Watchlist'; // myLists[neededLists.watch]
    var LIST_TBD   = 'tbd';            // myLists[neededLists.tbd]

    var IMDB_LIST_PAGE = 1; // any context-wide unique, non-falsy value is good
    var NF_LIST_PAGE   = 2; // any context-wide unique, non-falsy value is good


    // Netflix

    netflix.getUser = function() {
        var user = document.querySelector('div.account-menu-item div.account-dropdown-button > a');

        if (user) user = user.getAttribute("aria-label");
        if (user) user = user.match(/^(.+) - Account & Settings$/);
        if (user && user.length >= 2) user = user[1];

        return user;
    };


    netflix.isEntryPage = function() {
        return !document.location.href.match(/www\.imdb\.com\//);
    };


    netflix.getPageEntries = function() {
        return document.querySelectorAll('div.title-card');
    };


    netflix.modifyEntry = function(entry) {
        var b           = document.createElement('a');
        b.className     = "nf-svg-button simpleround";
        b.textContent   = 'H';
        b.title         = 'Hide/show this title';
        var d           = document.createElement('div');
        d.className     = "nf-svg-button-wrapper";
        d.style.cssText = 'bottom: 0; position: absolute; z-index: 10';
        d.appendChild(b);
        EL.addToggleEventOnClick(b, 2, LIST_HIDE, 'H');
        entry.appendChild(d);
    };


    netflix.getIdFromEntry = function(entry) {
        var a = entry.querySelector('a[href^="/watch/"]');
        var id = null;
        if (a) {
            id = a.href.match(/\/watch\/([^/?&]+)[/?&]/);
            if (id && id.length >= 2) id = id[1];
        }
        if (!id) return null;

        var title = entry.querySelector(".fallback-text");
        if (title) title = title.innerText;
        if (!title) console.error('Cannot find title for entry with id ' + id + ' on URL ' + document.URL, entry);

        return { 'id': id, 'name': (title || id) };
    };


    netflix.determineType = function(lists, _I_tt, entry) {
        var type = null;

        if (entry.classList.contains('is-disliked')) type = 'D';
        else if (lists[EL.ln(imdb, LIST_WATCH)]) type = 'W';
        else if (lists[EL.ln(imdb, LIST_TBD)])   type = 'T';
        else if (lists[EL.ln(imdb, LIST_SEEN)])  type = 'S';
        else if (lists[EL.ln(imdb, LIST_NO)])    type = 'N';

        else if (lists[EL.ln(netflix, LIST_HIDE)])  type = 'H';

        if (lists[EL.ln(netflix, LIST_NF_MY)] && (!type || type === 'W' || type === 'T') && this.pageType != NF_LIST_PAGE) {
            var row = entry.closest('div.lolomoRow');
            if (!row || ['queue', 'continueWatching'].indexOf(row.dataset.listContext) == -1) type = 'M';
        }
        return type;
    };


    var hideTypes = {
        "H": { "name": 'Hidden',    "colour": 'white' },
        "D": { "name": 'Disliked',  "colour": 'black' },
        "W": { "name": 'Watchlist', "colour": 'darkgoldenrod', "visible": true },
        "T": { "name": 'TBD',       "colour": 'Maroon',        "visible": true },
        "S": { "name": 'Watched',   "colour": 'seagreen' },
        "N": { "name": 'NO',        "colour": 'darkgrey' },
        "M": { "name": 'My list',   "colour": 'yellow' },
        "MISSING": { "name": 'Hide type not known', "colour": 'red' },
    };
    var TRIANGLE_STYLE_NAME = 'entrylist-netflix-triangle';
    var TRIANGLE_STYLE = '.' + TRIANGLE_STYLE_NAME + '{'
            + 'border-right: 20px solid;'
            + 'border-bottom: 20px solid transparent;'
            + 'height: 0;'
            + 'width: 0;'
            + 'position: absolute;'
            + 'top: 0;'
            + 'right: 0;'
            + 'z-index: 2;'
            + '}';

    netflix.processItem = function(entry, _I_tt, processingType) {
        if (!processingType || !hideTypes[processingType]) processingType = 'MISSING';
        var triangle = document.createElement('div');
        triangle.className = 'NHT-triangle ' + TRIANGLE_STYLE_NAME;
        triangle.style.borderRightColor = hideTypes[processingType].colour;
        triangle.title = hideTypes[processingType].name;
        entry.parentNode.appendChild(triangle);

        if (!hideTypes[processingType].visible) entry.parentNode.style.opacity = .1;
/*
        var parent = entry.parentNode;
        parent.parentNode.style.width = '5%';

        var field = parent.querySelector('fieldset#hideTitle' + tt.id);
        if (!field) {
            field = document.createElement('fieldset');
            field.id = 'hideTitle' + tt.id;
            field.style.border = 0;
            field.appendChild(document.createTextNode(tt.name));
            parent.appendChild(field);
        } else {
            field.style.display = 'block';
        }
*/
    };


    netflix.unProcessItem = function(entry, _I_tt, _I_processingType) {
        entry.parentNode.style.opacity = 1;
        var triangle = entry.parentNode.querySelector('.NHT-triangle');
        if (triangle) triangle.parentNode.removeChild(triangle);
/*
        entry.parentNode.parentNode.style.width = null;
        entry.parentNode.querySelector('fieldset#hideTitle' + tt.id).style.display = 'none';
*/
    };


    netflix.getPageType = function() {
        return ( document.location.href == 'https://www.netflix.com/browse/my-list' && NF_LIST_PAGE );
    };


    // add buttons on the Netflix "My List" page
    netflix.processPage = function(_I_pageType, _I_isEntryPage) {
        // no need to check pageType: as of now there is only one
        var main = document.querySelector('div.mainView');
        if (!main) {
            console.error('Could not find "main <div>" to insert buttons');
            return;
        }
        var div  = document.createElement('div');
        var btnStyle = 'margin-left: 20px; margin-bottom: 20px; font-size: 13px; padding: .5em; background: 0 0; color: grey; border: soli 1px grey;';
        addBtn(div, btnNFMyListRefresh, "Load My List data",  "Reload information from 'My List'", btnStyle);
        addBtn(div, btnNFMyListClear,   "Clear My List data", "Empty the data from 'My List'",     btnStyle);
        main.appendChild(div);
    };



    // IMDb

    imdb.getUser = function() {
        var account = document.getElementById('nbusername');
        if (!account) return;
        var user = account.textContent.trim();

        var ur = account.href;
        if (ur) ur = ur.match(/\.imdb\..{2,3}\/.*\/(ur[0-9]+)/);
        if (ur && ur[1]) ur = ur[1];
        else console.error('Cannot retrieve the ur id for user:', user);

        return { 'name': user, 'payload': ur };
    };


    imdb.getPageType = function() {
        return ( document.location.href.match(/\.imdb\..{2,3}\/user\/[^/]+\/lists/) && IMDB_LIST_PAGE );
    };


    // add buttons on the IMDb lists page
    imdb.processPage = function(_I_pageType, _I_isEntryPage) {
        // no need to check pageType: as of now there is only one
        var main = document.getElementById("main");
        var h1 = ( main && main.getElementsByTagName("h1") );
        if (!h1 || !h1[0]) {
            console.error('Could not find element to insert buttons.');
            return;
        }
        var div = document.createElement('div');
        div.className     = "aux-content-widget-2";
        div.style.cssText = "margin-top: 10px;";
        addBtn(div, btnIMDbListRefresh, "NF - Refresh highlight data", "Reload information from lists - might take a few seconds");
        addBtn(div, btnIMDbListClear,   "NF - Clear highlight data",   "Remove list data");
        h1[0].appendChild(div);
    };


    // lookup IMDb movies by name
    imdb.inList = function(tt, list) {
        return !!(list[tt.name]);
    };


    /* END CONTEXT DEFINITION */



    /* BEGIN COMMON FUNCTIONS */


    function addBtn(div, func, txt, help, style) {
        var b = document.createElement('button');
        b.className     = "btn";
        if (!style) style = "margin-right: 10px; font-size: 11px;";
        b.style.cssText = style;
        b.textContent   = txt;
        b.title         = help;
        b.addEventListener('click', func, false);
        div.appendChild(b);
        return b;
    }


    /* END COMMON FUNCTIONS */



    /* BEGIN NETFLIX FUNCTIONS */


    function btnNFMyListClear() {
        NFMyListClear();
        GM_notification({'text': "Information from 'My List' cleared.", 'title': EL.title + ' - Clear Netflix My List', 'timeout': 0});
    }

    function btnNFMyListRefresh() {
        var txt;
        if (NFMyListRefresh()) txt = "'My List' loaded.";
        else txt = "An error occurred. It was not possible to load 'My List' data.";
        GM_notification({'text': txt, 'title': EL.title + ' - Load Netflix My List', 'timeout': 0});
    }


    function NFMyListClear() {
        EL.deleteList(netflix, LIST_NF_MY);
        delete netflix.allLists[LIST_NF_MY];
    }

    function NFMyListRefresh() {
        NFMyListClear();

        var gallery = document.querySelector('div.mainView div.gallery');
        var cards   = ( gallery && gallery.querySelectorAll('div.title-card') );
        if (!cards) return false;

        var list = {};
        var entry, tt;
        for (var i = 0; i < cards.length; i++) {
            entry = cards[i];
            tt    = netflix.getIdFromEntry(entry);
            list[tt.id] = tt.name;
        }

        EL.saveList(netflix, list, LIST_NF_MY);
        return true;
    }


    /* END NETFLIX FUNCTIONS */



    /* BEGIN IMDB FUNCTIONS */


    function btnIMDbListClear() {
        IMDbListClear();
        GM_notification({'text': "Information from IMDb cleared.", 'title': EL.title + ' - Clear IMDb lists', 'timeout': 0});
    }

    function btnIMDbListRefresh() {
        GM_notification({
            'text':    'Click to start loading the IMDb lists. This may take several seconds',
            'title':   EL.title + ' - Load IMDb lists',
            'timeout': 0,
            'onclick': IMDbListRefresh,
        });
    }


    function IMDbListClear() {
        EL.deleteAllLists(imdb);
        delete imdb.allLists;
    }


    function IMDbListRefresh() {
        var pb = new ProgressBar(-1, 'Loading {#}/{$}...');
        var closeMsg = 'An error occurred. It was not possible to download the IMDb lists.';

        getIMDbLists()
            .then(function(lists) { pb.update(0, null, lists.length); return lists; })
            .then(function(lists) { return IMDbListDownload(lists, pb); } )
            .then(function(outcomes) {
                var msg = outcomes.reduce(function(msg, outcome) {
                    if (outcome.status === 'rejected') {
                        msg.txt += "\n * " + outcome.reason;
                        msg.numKO++;
                    }
                    return msg;
                }, { 'txt': '', 'numKO': 0 });

                if (msg.numKO === 0) {
                    closeMsg = 'Loading complete!';
                } else if (msg.numKO < outcomes.length) {
                    closeMsg = 'Done, but with errors:' + msg.txt;
                    console.error('Errors in list download:' + msg.txt);
                } else {
                    throw 'Error - It was not possible to download the IMDb lists:' + msg.txt;
                }
            })
            .catch(function(err) { console.error(err); closeMsg = err; })
            .finally(function() {
                GM_notification({
                    'text':      closeMsg,
                    'title':     EL.title + ' - Load IMDb lists',
                    'highlight': true,
                    'timeout':   5,
                    'ondone':    pb.close,
                });
            });
    }

    // Return a Promise to download and save all lists
    function IMDbListDownload(lists, pb) {
        IMDbListClear();

        var allDnd = lists.map(function(list) {
            return downloadList(list.id, list.type)
                       .then(function(listData) { EL.saveList(imdb, listData, list.name); })
                       .then(pb.advance)
                       .catch(function(error) { pb.advance(); throw "list '" + list.name + "' - " + error; });
        });
        return Promise.allSettled(allDnd);
    }


    var WATCHLIST  = "watchlist";
    var RATINGLIST = "ratings";
    var CHECKINS   = "checkins";
    var TITLES = "Titles";
    var PEOPLE = "People";
    var IMAGES = "Images";
    // Return a Promise to get all lists (name, id, type) for current user
    function getIMDbLists() {
        return findIMDbLists().then(getIMDbListFromPage);
    }
    function findIMDbLists() {
        if (document.location.href.match(/\.imdb\..{2,3}\/user\/[^/]+\/lists/)) {
            return Promise.resolve(document);

        } else {
            var url = 'https://www.imdb.com/user/' + imdb.userPayload + '/lists';
            return GMprom_xhR('GET', url, 'Get IMDb list page', { 'responseType': 'document' })
                       .then(function(response) { return response.responseXML2; });
        }
    }
    function getIMDbListFromPage(document) {
        var listElements = document.getElementsByClassName('user-list');
        if (!listElements) throw "Error getting IMDb lists from page";

        var lists = Array.prototype.map.call(listElements, function(listElem) {
            var tmp = listElem.getElementsByClassName("list-name");
            var name;
            if (!tmp || !tmp[0]) {
                console.error("Error reading name of list with id " + listElem.id);
                name = listElem.id;
            } else {
                name = tmp[0].text;
            }
            return {"name": name, "id": listElem.id, 'type': listElem.dataset.listType };
        });
        lists.push({"name": LIST_WATCH, "id": WATCHLIST, 'type': TITLES });
        return lists;
    }


    // Return a promise to download a list
    function downloadList(id, type) {
        var getUrl;
        if (id == WATCHLIST || id == CHECKINS) {
            // Watchlist & check-ins are not easily available (requires another fetch to find export link)
            // http://www.imdb.com/user/ur???????/watchlist | HTML page w/ "export link" at the bottom
            var url = 'https://www.imdb.com/user/' + imdb.userPayload + '/' + id;
            getUrl = GMprom_xhR('GET', url, "Get list page", { 'responseType': 'document' })
                .then(function(response) {
                    var exportLink;
                    var lsId = response.responseXML2.querySelector('meta[property="pageId"]');
                    if (lsId) lsId = lsId.content;
                    if (lsId) exportLink = "https://www.imdb.com/list/" + lsId + "/export";
                    else {
                        exportLink = response.responseXML2.getElementsByClassName('export');
                        if (exportLink) exportLink = exportLink[0];
                        if (exportLink) exportLink = exportLink.getElementsByTagName('a');
                        if (exportLink) exportLink = exportLink[0];
                        if (exportLink) exportLink = exportLink.href;
                        if (!exportLink) throw 'Cannot get list id';
                    }
                    return exportLink;
                });
        } else if (id == RATINGLIST) {
            getUrl = Promise.resolve("https://www.imdb.com/user/" + imdb.userPayload + "/" + id + "/export");
        } else {
            getUrl = Promise.resolve("https://www.imdb.com/list/" + id + "/export");
        }
        return getUrl
                   .then(function(url)      { return GMprom_xhR('GET', url, "download"); })
                   .then(function(response) { return parseList(response, type); });
    }



    /* END IMDB FUNCTIONS */



    //-------- "main" --------
    GM_addStyle(TRIANGLE_STYLE);
    EL.init(netflix);
    EL.addSource(imdb);
    EL.startup();





//***//   var RATINGLIST = "ratings";
//***//   var CHECKINS   = "checkins";
//***//
//***//   // Lists can be about Titles, People & Images (no Characters lists anymore?)
//***//   // Comment out a list type to disable highlighting for it.
//***//   var listTypes = {};
//***//   listTypes[TITLES] = true;
//***//   listTypes[PEOPLE] = true;
//***//   //listTypes[IMAGES] = true; // To-do: highlight images using colored borders?
//***//
//***//   var listOrderIdx = [];
//***//
//***//   var myLists = [];
//***//   var neededLists = {};   //GUIDO NF
//***//
//***//
//***//
//***//   var myName = 'Netflix hide titles'; // Name & version of this script
//***//   var user   = '';      // Current user name/alias
//***//   var IMDbUser = '';
//***//   var interval = 1000;  // Interval (in ms, >= 100) to re-scan links in the DOM
//***//                         // Won't re-scan if < 100
//***//                         // (I might consider using MutationObserver in the future, instead)
//***//
//***//
//***//   var myLocalList = {};
//***//   var myNetflixList = {};
//***//
//***//   function loadMyLocalList() {
//***//      //
//***//      // Load data for the current user
//***//      //
//***//      var userData = GM_getValue("NetflixHideList-"+user, null);
//***//      if (userData) {
//***//         try {
//***//            myLocalList = JSON.parse(userData);
//***//            return true;
//***//         } catch(err) {
//***//            alert("Error loading Netflix local data!\n" + err.message);
//***//         }
//***//      }
//***//   }
//***//
//***//   function loadMyNetflixList() {
//***//      //
//***//      // Load data for the current user
//***//      //
//***//      var userData = GM_getValue("NetflixMyList-"+user, null);
//***//      if (userData) {
//***//         try {
//***//            myNetflixList = JSON.parse(userData);
//***//            return true;
//***//         } catch(err) {
//***//            alert("Error loading Netflix My List data!\n" + err.message);
//***//         }
//***//      }
//***//
//***//      return false;
//***//   }
//***//
//***//   function getMyIMDbLists() {
//***//      //
//***//      // Get all lists (name & id) for current user into myLists array
//***//      // and set default colors for them (if not previously defined)
//***//      //
//***//
//***//      // You can customize your lists colors.
//***//      // See also the listOrder variable below.
//***//      // After any change in the code: save the script, reload the lists page,
//***//      // clear the highlight data and refresh the highlight data!
//***//      var customColors = [];
//***//      customColors["Your Watchlist"] = "DarkGoldenRod";
//***//      customColors["Your ratings"  ] = "Green";
//***//      customColors["Your check-ins"] = "DarkGreen";
//***////GUIDO      customColors["DefaultColor"  ] = "DarkCyan";
//***//      customColors["DefaultColor"  ] = "Maroon";
//***//      customColors["DefaultPeople" ] = "DarkMagenta";
//***////GUIDO      customColors["Filmes Netflix Brasil"] = "Red";
//***//      customColors["Visti"]   = "seagreen";
//***//      customColors["Parzialmente visti"]   = "yellowgreen";
//***//      customColors["no"]   = "darkgrey";
//***//
//***//      // You can set the search order for the highlight color when a title is in multiple lists.
//***//      // The script will choose the color of the the first list found in the variable below.
//***//      // Uncomment the line below and enter the names of any lists you want to give preference over the others.
//***//      var listOrder = ["Your Watchlist", "Your ratings"];
//***//
//***//      myLists.length = 0; // Clear arrays and insert the two defaults
//***//      myLists.push({"name":"Your Watchlist", "id":WATCHLIST,  "color":customColors["Your Watchlist"] || "", "ids":{}, "type":TITLES });
//***//      myLists.push({"name":"Your ratings",   "id":RATINGLIST, "color":customColors["Your ratings"]   || "", "ids":{}, "type":TITLES });
//***//      myLists.push({"name":"Your check-ins", "id":CHECKINS,   "color":customColors["Your check-ins"] || "", "ids":{}, "type":TITLES });
//***//      var lists = document.getElementsByClassName('user-list');
//***//      if (!lists || lists.length < 1) {
//***//         console.error("Error getting lists (or no lists exist)!");
//***//         return false;
//***//      }
//***//      for (var i = 0; i < lists.length; i++) {
//***//         var listType = lists[i].getAttribute("data-list-type");
//***//         if (listType in listTypes) {
//***//            var tmp   = lists[i].getElementsByClassName("list-name");
//***//            if (!tmp) {
//***//               console.error("Error reading information from list #"+i);
//***//               continue;
//***//            }
//***//            tmp = tmp[0]; // <a class="list-name" href="/list/ls003658871/">Filmes Netflix Brasil</a>
//***//            var name  = tmp.text;
//***//            var id    = tmp.href.match(/\/list\/([^\/\?]+)\/?/)[1];
//***//            var colorType = listType == PEOPLE ? "DefaultPeople" : "DefaultColor";
//***//            var color     = customColors[name] || customColors[colorType] || "";
//***//            myLists.push({"name":name, "id":id, "color":color, "ids":{}, "type":listType });
//***//         }
//***//      }
//***//      setListOrder(listOrder);
//***//      return true;
//***//   }
//***//
//***//   function loadMyIMDbLists() {
//***//      //
//***//      // Load data for the current user
//***//      //
//***////      var userData = localStorage.getItem("myMovies-"+user);   // GUIDO NF
//***//      var userData = GM_getValue("myIMDbMovies-"+user, null);   // GUIDO NF
//***//      if (userData) {
//***//         try {
//***//            myLists = JSON.parse(userData);
//***//            if ("myLists" in myLists) {
//***//               listOrderIdx = myLists["listOrder"];
//***//               myLists      = myLists["myLists"  ];
//***//
//***//               // GUIDO NF
//***//               for (var i = 0; i < myLists.length; i++) {
//***//                   if (myLists[i].type != TITLES) continue;
//***//                   switch (myLists[i].name) {
//***//                       case 'no':             neededLists.no    = i; break;
//***//                       case 'Visti':          neededLists.visti = i; break;
//***//                       case 'Your Watchlist': neededLists.watch = i; break;
//***//                       case 'tbd':            neededLists.tbd   = i; break;
//***//                   }
//***//               }
//***//               // FINE GUIDO NF
//***//            }
//***//            return true;
//***//         } catch(err) {
//***//            alert("Error loading previous data!\n" + err.message);
//***//         }
//***//      }
//***//      return false;
//***//   }
//***//
//***//   function saveMyLocalList() {
//***//      //
//***//      // Save data for the current user
//***//      //
//***//      var userData = JSON.stringify(myLocalList);
//***//      GM_setValue("NetflixHideList-"+user, userData);
//***//   }
//***//
//***//   function saveMyIMDbLists() {
//***//      //
//***//      // Save data for the current user
//***//      //
//***//      var userData = JSON.stringify(myLocalList);
//***//      GM_setValue("NetflixHideList-"+user, userData);
//***//
//***//      userData = {"listOrder": listOrderIdx, "myLists": myLists};
//***//      userData = JSON.stringify(userData);
//***//      GM_setValue("myIMDbMovies-"+user, userData);
//***//   }
//***//
//***//   function toggleTitle(evt) {
//***//       // get title id
//***//       var div = evt.target.parentNode.parentNode;
//***//       var tt = getIdFromDiv(div);
//***//
//***//       // check if item is in list
//***//       if (myLocalList[tt.id]) {
//***//           delete myLocalList[tt.id];
//***//           showItem(div, tt.id);
//***//       } else {
//***//           myLocalList[tt.id] = tt.name;
//***//           hideItem(div, tt);
//***//       }
//***//       saveMyLocalList();
//***//   }
//***//
//***//
//***//
//***//
//***//
//***///* FROM IMDB MY MOVIES ENHANCER */
//***//   var downloadedLists = 0;
//***//   var listsNotDownloaded = [];
//***//
//***//
//***//   function advanceProgressBar() {
//***//      //
//***//      // Update progress bar
//***//      //
//***//      downloadedLists += 1;
//***//      var total = myLists.length;
//***//      var p = Math.round(downloadedLists*(100/total));
//***//      pb.advance();
//***//      if (downloadedLists >= total) {
//***//          pb.close();
//***//         if (listsNotDownloaded.length > 0) {
//***//            var msg = "Done, but could not load list(s):";
//***//            listsNotDownloaded.forEach(function(l) { msg += "\n * " + l;} );
//***//            msg += "\n\nThis script can only read public lists.";
//***//            alert(msg);
//***//         } else
//***//            alert("OK, we're done!");
//***//      }
//***//   }

    // Process a downloaded list
    function parseList(response, type) {
        if (response.responseText.startsWith("<!DOCTYPE html")) {
            var msg = 'received HTML instead of CSV file';
            console.error(msg, response);
            throw msg;
        }

        var data = parseCSV(response.responseText);
        var list = {};

        var fields = {};
        var id, name;
        for (var i=1; i < data.length; i++) {
            for (var f=0; f < data[0].length; f++)
                { fields[data[0][f]] = data[i][f]; }

            switch (type) {
                case TITLES:
                    //            ___0___   _____1_____  ____2_____  ___3____  _____4_____  ____5_____  _____6_____  ______7_______  _____8_____  _______9______  ____10___  _____11_____  ___12____   _____13_____  ____14____
                    // ratings  : Const,    Your Rating, Date Added, Title,    URL,         Title Type, IMDb Rating, Runtime (mins), Year,        Genres,         Num Votes, Release Date, Directors
                    // others   : Position, Const,       Created,    Modified, Description, Title,      URL,         Title Type,     IMDb Rating, Runtime (mins), Year,      Genres,       Num Votes,  Release Date,  Directors
                    id   = fields["Const"];
                    name = fields["Title"];
                    break;
                case PEOPLE:
                    // ___0___   __1__  ___2___  ___3____  _____4_____  __5__  ____6____  ____7_____
                    // Position, Const, Created, Modified, Description, Name,  Known For, Birth Date
                    id   = fields["Const"];
                    name = fields["Name"];
                    break;
                case IMAGES:
                    // Do nothing for now
                    continue;
            }

            if (id === "") {
                console.error("No id defined for row " + i);
                continue;
            }
            if (list[id]) {
                console.error("Duplicate id " + id + " found at row " + i);
                continue;
            }
            list[name] = name;
        }
        return list;
    }

    var createFunction = function( func, p1, p2, p3 ) {
        return function() {
            func(p1, p2, p3);
        };
    };

//***//   function downloadAsyncWatchlist(name, id, url) {
//***//      var request = new XMLHttpRequest();
//***//      request.onload  = function() {
//***//         var exportLink;
//***//         var lsId = request.responseText.match('<meta property="pageId" content="(ls.+?)"/>');
//***//         if (lsId && lsId.length > 1)
//***//            exportLink = document.location.protocol + "//www.imdb.com/list/"+lsId[1]+"/export";
//***//         else {
//***//            lsId = request.responseText.match('"list":{"id":"(ls.+?)"');
//***//            if (lsId && lsId.length > 1)
//***//               exportLink = document.location.protocol + "//www.imdb.com/list/"+lsId[1]+"/export";
//***//         }
//***//         if (exportLink)
//***//            downloadAsync(name, id, exportLink);
//***//         else {
//***//            console.error("Could not find id of the '"+name+"' list! Try to make it public (you can make it private again right after).");
//***//            listsNotDownloaded.push(name);
//***//            advanceProgressBar();
//***//         }
//***//      };
//***//      request.onerror = createFunction(downloadError, name, request, url);
//***//      request.open("GET", url, true);
//***//      request.send();
//***//   }
//***//
//***//   function setListOrder(listOrder) {
//***//      //
//***//      // Set color highlight order using lists indices, after variable listOrder (containing lists names).
//***//      //
//***//      if (typeof listOrder == "undefined")
//***//         listOrder = []; // array of lists names
//***//
//***//      listOrderIdx = []; // array of lists indices
//***//
//***//      // First add indices set by user in listOrder
//***//      for (var j = 0; j < listOrder.length; j++)
//***//         for (var i = 0; i < myLists.length; i++)
//***//            if (myLists[i].name == listOrder[j]) {
//***//               listOrderIdx.push(i);
//***//               break;
//***//            }
//***//      // Add remaining indices
//***//      for (var ii = 0; ii < myLists.length; ii++)
//***//         if (!listOrderIdx.includes(ii))
//***//            listOrderIdx.push(ii);
//***//   }
//***//
//***//
//***//
//***///* END */
//***//
//***//
//***//   //IMDb
//***//   var btn1; // refresh
//***//   var btn2; // clear
//***//   var btn4; // help
//***//   //Netflix
//***//   var btn8; // refresh
//***//   var btn16; // clear
//***//
//***//   function btnHelp () {
//***//      alert(myName+"\n\nThis is a user script that:\n"+
//***//            " • highlights links for entries in your lists (e.g., movies, series & people)\n"+
//***//            " • shows in which of your lists an entry is (in a tooltip)\n"+
//***//            "\nIn order to highlight the entries "+
//***//            "in all IMDb pages as fast as possible, we need to download "+
//***//            "the data from your lists into your browser. Unfortunately " +
//***//            "this can be slow, so it is not done automatically. I suggest "+
//***//            "you to update this information at most once a day.\n\n" +
//***//            "[Refresh highlight data] updates the data in your browser.\n" +
//***//            "[Clear highlight data] disables color highlighting.\n"
//***//      );
//***//   }
//***//
//***//
//***//
//***//   //-------- "main" --------
//***//   var we_are_in_a_title_page = false;
//***//   var we_are_in_the_imdb_list_page = false;
//***//   var we_are_in_the_netflix_list_page = false;
//***//
//***//   if (document.location.href.match(/\.netflix\..{2,3}\//)) {
//***//      we_are_in_a_title_page = true;
//***//   }
//***//
//***//   if (document.location.href == 'https://www.netflix.com/browse/my-list') {
//***//      we_are_in_the_netflix_list_page = true;
//***//   }
//***//   if (document.location.href.match(/\.imdb\..{2,3}\/user\/[^\/]+\/lists/)) {
//***//      we_are_in_the_imdb_list_page = true;
//***//   }
//***//
//***//
//***//   // Find current logged in user, or quit script
//***//   user = getCurrentNetflixUser();
//***//   if (!user) return;
//***//
//***//
//***//   // Allow user to manually update his/her lists
//***//   if (we_are_in_the_imdb_list_page) {
//***//      getMyIMDbLists();
//***//      // Find current logged in user, or quit script
//***//      IMDbUser = getCurrentIMDbUser();
//***//      if (!IMDbUser) return;  // FIX-ME: to support external sites: set/get LAST user to/from browser storage
//***//
//***//      addIMDbButtons();
//***//      return; // Nothing else to do on the lists page - goodbye!
//***//   }
//***//   if (we_are_in_the_netflix_list_page) {
//***//      addNetflixButtons();
//***//   }
//***//
//***//   if (we_are_in_a_title_page) {
//***//      // Load lists data for this user from localStorage
//***//      loadMyLocalList();
//***//      loadMyNetflixList();
//***//      loadMyIMDbLists();
//***//   }
//***//
//***//
//***//
//***//// THIS IS THE NEW PART
//***//
//***//
//***//   function hideTitleCards() {
//***////       console.log('waitnlp',we_are_in_the_netflix_list_page);
//***//      //
//***//      // Highlight all title cards in the current Netflix page
//***//      //
//***//
//***//      var num, color, lists, movie;
//***//      var anchors = document.querySelectorAll('div.title-card');
//***//
//***//      for (var i=0; i < anchors.length; i++) {
//***//         var a = anchors[i];
//***//         if (!a.GVhide) {
//***//            addHideBtn(a, toggleTitle, 'H', 'Hide/show this title');
//***//
//***//            var tt = getIdFromDiv(a);
//***//            var title, movieTitle;
//***//            var hideType = null;
//***//            if (a.className.indexOf('is-disliked') != -1) hideType = 'D';
//***//            else {
//***//                movie = a.querySelector(".fallback-text");
//***//                if (movie) movieTitle = movie.innerText;
//***//
//***//                if (movieTitle) {
//***//                    num   = movieTitle;
//***//                    //lists = inLists(num, TITLES);
//***//                    if        (myLists[neededLists.watch].ids[num]) {
//***//                        hideType = 'W';
//***//                    } else if (myLists[neededLists.tbd].ids[num]) {
//***//                        hideType = 'T';
//***//                    } else if (myLists[neededLists.visti].ids[num]) {
//***//                        hideType = 'S';
//***//                    } else if (myLists[neededLists.no].ids[num]) {
//***//                        hideType = 'N';
//***//                    }
//***//                }
//***//            }
//***//            if (!hideType && (title = myLocalList[tt.id])) hideType = 'H';
//***//            if ((!hideType || hideType == 'W') && !we_are_in_the_netflix_list_page && (title = myNetflixList[tt.id])) {
//***////                console.log('ht',hideType,'tt.id',tt.id,'mt',movieTitle);
//***//                var row = a.closest('div.lolomoRow');
//***//                if (!row || (row.dataset.listContext != 'queue' && row.dataset.listContext != 'continueWatching')) hideType = 'M';
//***////                console.log('rownull',!row,'lt',row.dataset.listContext);
//***//            }
//***//
//***//            if (hideType) hideItem(a, tt.id, title, hideType);
//***//            a.GVhide = true; // set to "true" when "enhanced" (so we skip it on next pass)
//***//         }
//***//      }
//***//   }
//***//
//***//
//***//
//***//   // start the hiding title function
//***////   if (myLists.length) {
//***//      hideTitleCards();
//***//      if (interval >= 100) setInterval(hideTitleCards, interval);
//***////   }


    // handle download error in a Promise-enhanced GM_xmlhttpRequest
    function xhrError(rejectFunc, response, method, url, purpose, reason) {
        var m = purpose + ' - HTTP ' + method + ' error' + (reason ? ' (' + reason + ')' : '') + ': '
              + response.status + (response.statusText ? " - " + response.statusText : '');
        console.error(m, 'URL: ' + url, 'Response:', response);
        rejectFunc(m);
    }
    function xhrErrorFunc(rejectFunc, method, url, purpose, reason) {
        return function(resp) { xhrError(rejectFunc, resp, method, url, purpose, reason); };
    }
    function GMprom_xhR(method, url, purpose, opts) {
        return new Promise(function(resolve, reject) {
            var details = opts || {};
            details.method    = method;
            details.url       = url;
            details.onload    = function(response) {
                if (response.status !== 200) xhrError(reject, response, method, url, purpose);
//                else resolve(response);
                else {
                    if (details.responseType === 'document') {
                        try {
                            const doc = document.implementation.createHTMLDocument().documentElement;
                            doc.innerHTML = response.responseText;
                            response.responseXML2 = doc;
                        } catch(e) {
                            xhrError(reject, response, method, url, purpose, e);
                        }
                    }
                    resolve(response);
                }
            };
            details.onabort   = xhrErrorFunc(reject, method, url, purpose, 'abort');
            details.onerror   = xhrErrorFunc(reject, method, url, purpose, 'error');
            details.ontimeout = xhrErrorFunc(reject, method, url, purpose, 'timeout');
            if (typeof details.synchronous === 'undefined') details.synchronous = false;
            GM_xmlhttpRequest(details);
        });
    }



   function parseCSV(str) {
      // Simple CSV parsing function, by Trevor Dixon:
      // https://stackoverflow.com/questions/1293147/javascript-code-to-parse-csv-data
      var arr = [];
      var quote = false;  // true means we're inside a quoted field

      // iterate over each character, keep track of current row and column (of the returned array)
      var row, col, c;
      for (row = col = c = 0; c < str.length; c++) {
         var cc = str[c], nc = str[c+1];        // current character, next character
         arr[row] = arr[row] || [];             // create a new row if necessary
         arr[row][col] = arr[row][col] || '';   // create a new column (start with empty string) if necessary

         // If the current character is a quotation mark, and we're inside a
         // quoted field, and the next character is also a quotation mark,
         // add a quotation mark to the current column and skip the next character
         if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

         // If it's just one quotation mark, begin/end quoted field
         if (cc == '"') { quote = !quote; continue; }

         // If it's a comma and we're not in a quoted field, move on to the next column
         if (cc == ',' && !quote) { ++col; continue; }

         // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
         // and move on to the next row and move to column 0 of that new row
         if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }

         // If it's a newline (LF or CR) and we're not in a quoted field,
         // move on to the next row and move to column 0 of that new row
         if (cc == '\n' && !quote) { ++row; col = 0; continue; }
         if (cc == '\r' && !quote) { ++row; col = 0; continue; }

         // Otherwise, append the current character to the current column
         arr[row][col] += cc;
      }
      return arr;
   }




}());
