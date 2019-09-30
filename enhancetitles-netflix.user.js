// File encoding: UTF-8
//{
// Loads lists of movies from a local list and an IMDb account and uses
// them to highlight or hide titles on Netflix.
//
// Copyright (c) 2019, Guido Villa (guido@villa.name)
// Most of the script is taken from IMDb 'My Movies' enhancer:
// Copyright (c) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          Enhance titles - Netflix
// @description   Emphasize or hide titles on Netflix according to IMDb lists
// @namespace     http://guido.villa.name/
// @homepageURL   http://guido.villa.name/
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @oujs:author   Guido
// @match         https://www.netflix.com/*
// @match         https://www.imdb.com/user/*/lists*
// @exclude       https://www.netflix.com/watch*
// @version       1.2
// @grant         GM_xmlHttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_addStyle
// @updateURL     http://guido.villa.name/
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] Not all IMDb movies are recognized because matching is done by title
//   - [M] Make triangles more visible
//   - [M] Show name in tooltip? Maybe not needed if above is solved
//   - [M] Show in tooltip all lists where title is present?
//   - [M] Lots of clean-up
//   - [M] Delay autopreview for hidden movies?
//   - [L] No link between IMDb user and Netflix user, basically it works for a single IMDb user
//
// History:
// --------
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
//}


(function() {
   var WATCHLIST  = "watchlist";
   var RATINGLIST = "ratings";
   var CHECKINS   = "checkins";

   var TITLES = "Titles";
   var PEOPLE = "People";
   var IMAGES = "Images";
   // Lists can be about Titles, People & Images (no Characters lists anymore?)
   // Comment out a list type to disable highlighting for it.
   var listTypes = {};
   listTypes[TITLES] = true;
   listTypes[PEOPLE] = true;
   //listTypes[IMAGES] = true; // To-do: highlight images using colored borders?

   var listOrderIdx = [];

   var myLists = [];
   var neededLists = {};   //GUIDO NF


   // Modified version of Michael Leigeber's code, from:
   // http://sixrevisions.com/tutorials/javascript_tutorial/create_lightweight_javascript_tooltip/
   // http://userscripts.org/scripts/review/91851 & others
   var injectJs = 'function tooltipClass(msg) {this.msg = msg;this.id = "tt";this.top = 3;this.left = 15;this.maxw = 500;this.speed = 10;this.timer = 20;this.endalpha = 95;this.alpha = 0;this.tt == null;this.c;this.h = 0;this.moveFunc = null;this.fade = function (d) {var a = this.alpha;if (a != this.endalpha && d == 1 || a != 0 && d == -1) {var i = this.speed;if (this.endalpha - a < this.speed && d == 1) {i = this.endalpha - a;} else if (this.alpha < this.speed && d == -1) {i = a;}this.alpha = a + i * d;this.tt.style.opacity = this.alpha * 0.01;} else {clearInterval(this.tt.timer);if (d == -1) {this.tt.style.display="none";document.removeEventListener("mousemove", this.moveFunc, false);this.tt = null;}}};this.pos = function (e, inst) {inst.tt.style.top = e.pageY - inst.h + "px";inst.tt.style.left = e.pageX + inst.left + "px";};this.show = function (msg) {if (this.tt == null) {this.tt = document.createElement("div");this.tt.setAttribute("id", this.id);c = document.createElement("div");c.setAttribute("id", this.id + "cont");this.tt.appendChild(c);document.body.appendChild(this.tt);this.tt.style.opacity = 0; this.tt.style.zIndex=100000; var inst = this;this.moveFunc = function (e) {inst.pos(e, inst);};document.addEventListener("mousemove", this.moveFunc, false);}this.tt.style.display = "block";c.innerHTML = msg || this.msg;this.tt.style.width = "auto";if (this.tt.offsetWidth > this.maxw) {this.tt.style.width = this.maxw + "px";}h = parseInt(this.tt.offsetHeight) + this.top;clearInterval(this.tt.timer);var inst = this;this.tt.timer = setInterval(function () {inst.fade(1);}, this.timer);};this.hide = function () {if (this.tt) {clearInterval(this.tt.timer);var inst = this;this.tt.timer = setInterval(function () {inst.fade(-1);}, this.timer);}};} tooltip = new tooltipClass("default txt");';

   var newJs = document.createElement('script');
   newJs.setAttribute('type', 'text/javascript');
   newJs.innerHTML = injectJs;
   document.getElementsByTagName('head')[0].appendChild(newJs);

   var myName = 'Netflix hide titles'; // Name & version of this script
   var user   = '';      // Current user name/alias
   var IMDbUser = '';
   var interval = 1000;  // Interval (in ms, >= 100) to re-scan links in the DOM
                         // Won't re-scan if < 100
                         // (I might consider using MutationObserver in the future, instead)

   function getCurrentNetflixUser() {
      //
      // Return name of user currently logged on IMDb (log on console if failed)
      //
      var loggedUser = null;

      var account = document.querySelector('div.account-menu-item div.account-dropdown-button > a');
      if (account) {
         var accountString = account.getAttribute("aria-label");
         if (accountString) {
            loggedUser = accountString.replace(/ - Account & Settings$/, '');
            if (loggedUser == accountString) loggedUser == null;
         }
      }
      if (!loggedUser) {
         console.error(document.URL + "\nUser not logged in (or couldn't get user info)"); // responseDetails.responseText
         loggedUser = GM_getValue('NetflixHide_lastUser', '');
         console.error("Using last user: " + loggedUser);
      }
      GM_setValue("NetflixHide_lastUser", loggedUser);
      return loggedUser;
   }

   function getCurrentIMDbUser() {
      //
      // Return name of user currently logged on IMDb (log on console if failed)
      //
      var loggedIn = '';
      var account = document.getElementById('consumer_user_nav') ||
                    document.getElementById('nbpersonalize');
      if (account) {
         var                 result = account.getElementsByTagName('strong');
         if (!result.length) result = account.getElementsByClassName("navCategory");
         if (!result.length) result = account.getElementsByClassName("singleLine");
         if (!result.length) result = account.getElementsByTagName("p");
         if (result)
            loggedIn = result[0].textContent.trim();
      }
      if (!loggedIn)
         console.error(document.URL + "\nUser not logged in (or couldn't get user info)"); // responseDetails.responseText
      return loggedIn;
   }

   var myLocalList = {};
   var myNetflixList = {};

   function loadMyLocalList() {
      //
      // Load data for the current user
      //
      var userData = GM_getValue("NetflixHideList-"+user, null);
      if (userData) {
         try {
            myLocalList = JSON.parse(userData);
            return true;
         } catch(err) {
            alert("Error loading Netflix local data!\n" + err.message);
         }
      }
   }

   function loadMyNetflixList() {
      //
      // Load data for the current user
      //
      var userData = GM_getValue("NetflixMyList-"+user, null);
      if (userData) {
         try {
            myNetflixList = JSON.parse(userData);
            return true;
         } catch(err) {
            alert("Error loading Netflix My List data!\n" + err.message);
         }
      }

      return false;
   }

   function getMyIMDbLists() {
      //
      // Get all lists (name & id) for current user into myLists array
      // and set default colors for them (if not previously defined)
      //

      // You can customize your lists colors.
      // See also the listOrder variable below.
      // After any change in the code: save the script, reload the lists page,
      // clear the highlight data and refresh the highlight data!
      var customColors = [];
      customColors["Your Watchlist"] = "DarkGoldenRod";
      customColors["Your ratings"  ] = "Green";
      customColors["Your check-ins"] = "DarkGreen";
//GUIDO      customColors["DefaultColor"  ] = "DarkCyan";
      customColors["DefaultColor"  ] = "Maroon";
      customColors["DefaultPeople" ] = "DarkMagenta";
//GUIDO      customColors["Filmes Netflix Brasil"] = "Red";
      customColors["Visti"]   = "seagreen";
      customColors["Parzialmente visti"]   = "yellowgreen";
      customColors["no"]   = "darkgrey";

      // You can set the search order for the highlight color when a title is in multiple lists.
      // The script will choose the color of the the first list found in the variable below.
      // Uncomment the line below and enter the names of any lists you want to give preference over the others.
      var listOrder = ["Your Watchlist", "Your ratings"];

      myLists.length = 0; // Clear arrays and insert the two defaults
      myLists.push({"name":"Your Watchlist", "id":WATCHLIST,  "color":customColors["Your Watchlist"] || "", "ids":{}, "type":TITLES });
      myLists.push({"name":"Your ratings",   "id":RATINGLIST, "color":customColors["Your ratings"]   || "", "ids":{}, "type":TITLES });
      myLists.push({"name":"Your check-ins", "id":CHECKINS,   "color":customColors["Your check-ins"] || "", "ids":{}, "type":TITLES });
      var lists = document.getElementsByClassName('user-list');
      if (!lists || lists.length < 1) {
         console.error("Error getting lists (or no lists exist)!");
         return false;
      }
      for (var i = 0; i < lists.length; i++) {
         var listType = lists[i].getAttribute("data-list-type");
         if (listType in listTypes) {
            var tmp   = lists[i].getElementsByClassName("list-name");
            if (!tmp) {
               console.error("Error reading information from list #"+i);
               continue;
            }
            tmp = tmp[0]; // <a class="list-name" href="/list/ls003658871/">Filmes Netflix Brasil</a>
            var name  = tmp.text;
            var id    = tmp.href.match(/\/list\/([^\/\?]+)\/?/)[1];
            var colorType = listType == PEOPLE ? "DefaultPeople" : "DefaultColor";
            var color     = customColors[name] || customColors[colorType] || "";
            myLists.push({"name":name, "id":id, "color":color, "ids":{}, "type":listType });
         }
      }
      setListOrder(listOrder);
      return true;
   }

   function loadMyIMDbLists() {
      //
      // Load data for the current user
      //
//      var userData = localStorage.getItem("myMovies-"+user);   // GUIDO NF
      var userData = GM_getValue("myIMDbMovies-"+user, null);   // GUIDO NF
      if (userData) {
         try {
            myLists = JSON.parse(userData);
            if ("myLists" in myLists) {
               listOrderIdx = myLists["listOrder"];
               myLists      = myLists["myLists"  ];

               // GUIDO NF
               for (var i = 0; i < myLists.length; i++) {
                   if (myLists[i].type != TITLES) continue;
                   switch (myLists[i].name) {
                       case 'no':             neededLists.no    = i; break;
                       case 'Visti':          neededLists.visti = i; break;
                       case 'Your Watchlist': neededLists.watch = i; break;
                       case 'tbd':            neededLists.tbd   = i; break;
                   }
               }
               // FINE GUIDO NF
            }
            return true;
         } catch(err) {
            alert("Error loading previous data!\n" + err.message);
         }
      }
      return false;
   }

   function saveMyLocalList() {
      //
      // Save data for the current user
      //
      var userData = JSON.stringify(myLocalList);
      GM_setValue("NetflixHideList-"+user, userData);
   }

   function saveMyIMDbLists() {
      //
      // Save data for the current user
      //
      var userData = JSON.stringify(myLocalList);
      GM_setValue("NetflixHideList-"+user, userData);

      userData = {"listOrder": listOrderIdx, "myLists": myLists};
      userData = JSON.stringify(userData);
      GM_setValue("myIMDbMovies-"+user, userData);
   }

   function getIdFromDiv(div) {
       var a = div.querySelector('a[href^="/watch/"]');
       var tt = null;
       if (a) {
           tt = a.href.match(/\/watch\/([^/?&]+)[/?&]/);
           if (tt && tt.length >= 2) tt = tt[1];
       }
       if (!tt) console.error('Could not determine title id :-(');
       return tt;
   }

   function toggleTitle(evt) {
       // get title id
       var div = evt.target.parentNode.parentNode;
       var tt = getIdFromDiv(div);

       // check if item is in list
       if (myLocalList[tt]) {
           delete myLocalList[tt];
           showItem(div, tt);
       } else {
           var movie = div.querySelector("div.fallback-text");
           var movieTitle = '';
           if (movie) movieTitle = movie.innerText;
           if (!movieTitle) movieTitle = tt;
           myLocalList[tt] = movieTitle;
           hideItem(div, tt, movieTitle);
       }
       saveMyLocalList();
       console.log('TOGGLE: ' + tt + ', t: ' + movieTitle);
   }


   var hideTypes = {
       "H": { "name": 'Hidden',    "colour": 'white' },
       "D": { "name": 'Disliked',  "colour": 'black' },
       "W": { "name": 'Watchlist', "colour": 'darkgoldenrod', "visible": true },
       "T": { "name": 'TBD',       "colour": 'Maroon',        "visible": true },
       "S": { "name": 'Watched',   "colour": 'seagreen' },
       "N": { "name": 'NO',        "colour": 'darkgrey' },
       "M": { "name": 'My list',   "colour": 'yellow' },
       "MISSING": { "name": 'Hide type not known',   "colour": 'red' },
   };


   function hideItem(div, id, title, hideType) {
      //console.log('hideItem', id, title, hideType);
      if (!hideType) hideType = 'H';

      if (!hideTypes[hideType]) hideType = 'MISSING';
      var triangle = document.createElement('div');
      triangle.className = 'NHT-triangle'
      triangle.style.cssText =
          'border-right: 20px solid ' + hideTypes[hideType].colour + '; ' +
          'border-bottom: 20px solid transparent;' +
          'height: 0; ' +
          'width: 0; ' +
          'position: absolute; ' +
          'top: 0; ' +
          'right: 0; ' +
          'z-index: 2;'
      triangle.title = hideTypes[hideType].name;
      div.parentNode.appendChild(triangle);

      if (!hideTypes[hideType].visible) div.parentNode.style.opacity = .1;
/*
       var parent = div.parentNode;
       parent.parentNode.style.width = '5%';

       var field = parent.querySelector('fieldset#hideTitle' + id);
       if (!field) {
           field = document.createElement('fieldset');
           field.id = 'hideTitle' + id;
           field.style.border = 0;
           field.appendChild(document.createTextNode(title));
           parent.appendChild(field);
       } else {
           field.style.display = 'block';
       }
*/
   }

   function showItem(div, id) {
       div.parentNode.style.opacity = 1;
       var triangle = div.parentNode.querySelector('.NHT-triangle');
       if (triangle) triangle.parentNode.removeChild(triangle);
/*
       div.parentNode.parentNode.style.width = null;
       div.parentNode.querySelector('fieldset#hideTitle' + id).style.display = 'none';
*/
   }

/* FROM IMDB MY MOVIES ENHANCER */
   function eraseMyData() {
      //
      // Erase just the movies and lists information for the user
      //
//      localStorage.removeItem("myMovies-"+user);   // GUIDO NF
      GM_deleteValue("myMovies-"+user);   // GUIDO NF
      for (var i = 0; i < myLists.length; i++)
         myLists[i].ids = {};
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

   var downloadedLists = 0;
   var listsNotDownloaded = [];


   function advanceProgressBar() {
      //
      // Update progress bar
      //
      downloadedLists += 1;
      var total = myLists.length;
      var p = Math.round(downloadedLists*(100/total));
      updateProgressBar(p, "Loaded "+downloadedLists+"/"+total);
      if (downloadedLists >= total) {
         updateProgressBar(0, "");
         if (listsNotDownloaded.length > 0) {
            var msg = "Done, but could not load list(s):";
            listsNotDownloaded.forEach(function(l) { msg += "\n * " + l;} );
            msg += "\n\nThis script can only read public lists.";
            alert(msg);
         } else
            alert("OK, we're done!");
      }
   }

   function downloadOK(idx, request, link) {
      //
      // Process a downloaded list
      //
      if (request.status != 200) {
          console.error("Error "+request.status+" downloading "+link+": " + request.statusText);
      } else
      if (request.responseText.indexOf("<!DOCTYPE html") >= 0) {
         console.error("Received HTML instead of CSV file from "+link);
      } else {
         var data = parseCSV(request.responseText);
         var res, entryCode;
         var fields = {};
         var type   = myLists[idx].type;
         for (var i=1; i < data.length; i++) {
            if (type == TITLES) {
               //            ___0___   _____1_____  ____2_____  ___3____  _____4_____  ____5_____  _____6_____  ______7_______  _____8_____  _______9______  ____10___  _____11_____  ___12____   _____13_____  ____14____
               // ratings  : Const,    Your Rating, Date Added, Title,    URL,         Title Type, IMDb Rating, Runtime (mins), Year,        Genres,         Num Votes, Release Date, Directors
               // others   : Position, Const,       Created,    Modified, Description, Title,      URL,         Title Type,     IMDb Rating, Runtime (mins), Year,      Genres,       Num Votes,  Release Date,  Directors
               for (var f=0; f < data[0].length; f++)
                  { fields[data[0][f]] = data[i][f]; }
//               var tt = fields["Const"];  // GUIDO NF
               var tt = fields["Title"];  // GUIDO NF
               var ratingMine = fields["Your Rating"];
               var ratingIMDb = fields["IMDb Rating"];
               if (typeof tt === "undefined")   console.error("Error processing line "+i+" of "+idx);
//               else if (tt.substr(0,2) != 'tt') console.error("Error getting IMDb const from: "+data[i]);  // GUIDO NF
               else {
//                  var ttNum = parseInt(tt.substr(2));  // GUIDO NF
                  // Encode the movie number with "base 36" to save memory
//                  entryCode = ttNum.toString(36);  // GUIDO NF
                  entryCode = tt;  // GUIDO NF
                  myLists[idx].ids[entryCode] = {m:ratingMine, i:ratingIMDb};
               }
            } else if (type == PEOPLE) {
               // ___0___   __1__  ___2___  ___3____  _____4_____  __5__  ____6____  ____7_____
               // Position, Const, Created, Modified, Description, Name,  Known For, Birth Date
               for (var f=0; f < data[0].length; f++)
                  { fields[data[0][f]] = data[i][f]; }
               var nm   = fields["Const"];
             //var name = fields["Name"];
               if (typeof nm === "undefined")   console.error("Error processing line "+i+" of "+idx);
               else if (nm.substr(0,2) != 'nm') console.error("Error getting IMDb const from: "+data[i]);
               else {
                  var nmNum = parseInt(nm.substr(2));
                  // Encode the entry with "base 36" to save memory
                  entryCode = nmNum.toString(36);
                //myLists[idx].ids[entryCode] = {n: name};
                  myLists[idx].ids[entryCode] = {};
               }
            } else if (type == IMAGES) {
               // Do nothing for now
            }
         }
         // Save data into browser
         saveMyIMDbLists();
      }

      advanceProgressBar() ;

      // Try to free some memory
      delete request.responseText;
   }

   var createFunction = function( func, p1, p2, p3 ) {
      return function() {
         func(p1, p2, p3);
      };
   };

   function downloadError(name, request, link) {
      //
      // Alert user about a download error
      //
      var msg = "Error downloading your list "+name+":\n"+
                "Status: "  +request.status + " - " + request.statusText +":\n"+
                "Source: "  +link +"\n" +
                "Headers: " +request.getAllResponseHeaders();
      alert(msg);
      console.error(msg);
      updateProgressBar(0, "");
   }

   function downloadAsync(name, idx, exportLink) {
      var request = new XMLHttpRequest();
      request.onload  = createFunction(downloadOK,     idx, request, exportLink);
      request.onerror = createFunction(downloadError, name, request, exportLink);
      request.open("GET", exportLink, true);
    //request.setRequestHeader("Accept-Encoding","gzip"); // Browser does this already? (I get 'Refused to set unsafe header "Accept-Encoding"')...
      request.send();
   }

   function downloadAsyncWatchlist(name, idx, url) {
      var request = new XMLHttpRequest();
      request.onload  = function() {
         var exportLink;
         var id = request.responseText.match('<meta property="pageId" content="(ls.+?)"/>');
         if (id && id.length > 1)
            exportLink = document.location.protocol + "//www.imdb.com/list/"+id[1]+"/export";
         else {
            id = request.responseText.match('"list":{"id":"(ls.+?)"');
            if (id && id.length > 1)
               exportLink = document.location.protocol + "//www.imdb.com/list/"+id[1]+"/export";
         }
         if (exportLink)
            downloadAsync(name, idx, exportLink);
         else {
            console.error("Could not find id of the '"+name+"' list! Try to make it public (you can make it private again right after).");
            listsNotDownloaded.push(name);
            advanceProgressBar();
         }
      };
      request.onerror = createFunction(downloadError, name, request, url);
      request.open("GET", url, true);
      request.send();
   }

   function downloadList(idx) {
      //
      // Download a list
      //
      var ur = document.location.pathname.match(/\/(ur\d+)/);
      if (ur && ur[1])
         ur = ur[1];
      else {
         alert("Sorry, but I could not find your user ID (required to download your lists). :(");
         return;
      }

      var name = myLists[idx].name;
      var id   = myLists[idx].id;
      // Watchlist & check-ins are not easily available (requires another fetch to find export link)
      // http://www.imdb.com/user/ur???????/watchlist/export                   | shows old HTML format
      // http://www.imdb.com/list/export?list_id=watchlist&author_id=ur??????? | 404 error
      // http://www.imdb.com/user/ur???????/watchlist                          | HTML page w/ "export link" at the bottom
      if (id == WATCHLIST || id == CHECKINS) {
         var url = document.location.protocol + "//www.imdb.com/user/"+ur+"/"+id;
         downloadAsyncWatchlist(name, idx, url);
      } else {
         var exportLink;
         if (id == RATINGLIST)
              exportLink = document.location.protocol + "//www.imdb.com/user/"+ur+"/"+id+"/export";
         else exportLink = document.location.protocol + "//www.imdb.com/list/"+id+"/export";
         downloadAsync(name, idx, exportLink);
      }
   }

   function downloadLists() {
      //
      // Begin to download all user lists at once (asynchronously)
      //
      downloadedLists = 0;
      for (var idx=0; idx < myLists.length; idx++)
         downloadList(idx);
      // With 10.000 items in 5 lists, the approx. time to download them (on Chrome 29) was:
      //  -  synchronously: 1:50s
      //  - asynchronously:   30s
      // Results might vary - a lot! - depending on number of lists and browser
      // Connections per hostname seems to be around 6: http://www.browserscope.org/?category=network&v=top
   }

   // Really simple progress bar...
   var pb;
   var pbBox;
   var pbTxt;

   function createProgressBar(p, msg) {
      var top_  = Math.round(window.innerHeight / 2)  -15;
      var left  = Math.round(window.innerWidth  / 2) -100;
      pbBox = document.createElement('div');
      pbBox.style.cssText  = "background-color: white; border: 2px solid black; "+
         "position: fixed; height: 30px; width: 200px; top: "+top_+"px; left: "+left+"px;";
      document.body.appendChild(pbBox);

      pb = document.createElement('div');
      pb.style.cssText = "background-color: green; border: none; height: 100%; width: "+p+"%;";
      pbBox.appendChild(pb);

      pbTxt = document.createElement('div');
      pbTxt.textContent   = msg;
      pbTxt.style.cssText = "text-align: center; margin-top: -25px; font-family: verdana,sans-serif;";
      pbBox.appendChild(pbTxt);
   }

   function updateProgressBar(p, msg) {
      if (p <= 0) {
         pbBox.style.display = "none";
         return;
      }
      pbTxt.textContent = msg;
      pb.style.width    = p+"%";
   }

   function setListOrder(listOrder) {
      //
      // Set color highlight order using lists indices, after variable listOrder (containing lists names).
      //
      if (typeof listOrder == "undefined")
         listOrder = []; // array of lists names

      listOrderIdx = []; // array of lists indices

      // First add indices set by user in listOrder
      for (var j = 0; j < listOrder.length; j++)
         for (var i = 0; i < myLists.length; i++)
            if (myLists[i].name == listOrder[j]) {
               listOrderIdx.push(i);
               break;
            }
      // Add remaining indices
      for (var i = 0; i < myLists.length; i++)
         if (!listOrderIdx.includes(i))
            listOrderIdx.push(i);
   }




   function inLists(num, type) {
      //
      // Receives an IMDb code and return the names of lists containing it.
      // Argument "num" : entry number encoded in base 36
      // Argument "type": optional, if set, limits search to a specific type of list
      //
      var num_l = 0;
      var lists = "";
      var pos   = -1;
      var rated = false;
      var imdbRating = "";
      var header     = "";
      var movie, name;
      for (var i = 0; i < myLists.length; i++) {
         if (type && myLists[i].type != type)
            continue;
         movie = myLists[i].ids[num];
         if (movie) {
            if (num_l)
               lists += "<br>";
            name = myLists[i].name;
            imdbRating = movie.i;
            if (imdbRating && name == "Your ratings") {
               name = "Your ratings: " + movie.m + " (IMDb: " + imdbRating + ")";
               rated = true;
            }
            lists += name;
            num_l += 1;
         }
      }
      if (imdbRating && !rated)
           imdbRating = "IMDb rating: " + imdbRating + "<br>";
      else imdbRating = "";
      if (num_l == 1)
           header = "<b>In your list:</b><br>";
      else header = "<b>In "+num_l+" of your lists:</b><br>";

      return imdbRating + header + '<div style="margin-left: 15px">' + lists + '</div>';
   }

/* END */


   function addHideBtn(div, func, txt, help) {
      var b           = document.createElement('a');
      b.className     = "nf-svg-button simpleround";
      b.textContent   = txt;
      b.title         = help;
      var d           = document.createElement('div');
      d.className     = "nf-svg-button-wrapper";
      d.style.cssText = 'bottom: 0; position: absolute; z-index: 10';
      d.appendChild(b);
      b.addEventListener('click', func, false);
      div.appendChild(d);
      return d;
   }

   function refreshMovieData() {
      alert(myName+"\n\n"+IMDbUser+", I'll get some info from IMDb to be able to highlight your movies,\nplease click [OK] and wait a bit...");
      eraseMyData();
      createProgressBar(0, "Loading 1/"+myLists.length+"...");
      downloadLists();
   }

   function eraseNetflixMyListData() {
      GM_deleteValue("NetflixMyList-"+user);
      myNetflixList = {};
   }

   function refreshNetflixMyListData() {
      eraseNetflixMyListData();
      var list = {};

      var gallery = document.querySelector('div.mainView div.gallery');
      var titles = gallery.querySelectorAll('div.title-card');

      for (var i=0; i < titles.length; i++) {
         var a = titles[i];

         var tt = getIdFromDiv(a);
         var movie = a.querySelector("div.fallback-text");
         var movieTitle = '';
         if (movie) movieTitle = movie.innerText;
         if (!movieTitle) movieTitle = tt;
         list[tt] = movieTitle;
      }

      var userData = JSON.stringify(list);
      GM_setValue("NetflixMyList-"+user, userData);
      alert('Netflix My list saved');
   }

   //IMDb
   var btn1; // refresh
   var btn2; // clear
   var btn4; // help
   //Netflix
   var btn8; // refresh
   var btn16; // clear

   function btnRefresh() {
      refreshMovieData();
   }

   function btnClear() {
      eraseMyData();
      alert(myName+"\n\nDone! Information cleared, so highlighting is now disabled.");
      window.location.reload();
   }

   function btnNFRefresh() {
      refreshNetflixMyListData();
   }

   function btnNFClear() {
      eraseNetflixMyListData();
      alert(myName+"\n\nDone! Information cleared.");
      window.location.reload();
   }

   function btnHelp () {
      alert(myName+"\n\nThis is a user script that:\n"+
            " • highlights links for entries in your lists (e.g., movies, series & people)\n"+
            " • shows in which of your lists an entry is (in a tooltip)\n"+
            "\nIn order to highlight the entries "+
            "in all IMDb pages as fast as possible, we need to download "+
            "the data from your lists into your browser. Unfortunately " +
            "this can be slow, so it is not done automatically. I suggest "+
            "you to update this information at most once a day.\n\n" +
            "[Refresh highlight data] updates the data in your browser.\n" +
            "[Clear highlight data] disables color highlighting.\n"
      );
   }

   function addBtn(div, func, txt, help, style) {
      var b = document.createElement('button');
      b.className     = "btn";
      if (!style) style = "margin-right: 10px; font-size: 11px;"
      b.style.cssText = style;
//      b.textContent   = txt;   // GUIDO NF
      b.textContent   = 'NF ' + txt;   // GUIDO NF
      b.title         = help;
      b.addEventListener('click', func, false);
      div.appendChild(b);
      return b;
   }

   function addIMDbButtons() {
      var main = document.getElementById("main");
      if (!main)
         console.error('Could not find "main <div>" to insert buttons!');
      else {
         var h1 = main.getElementsByTagName("h1");
         if (h1) {
            var div  = document.createElement('div');
            div.className      = "aux-content-widget-2";
            div.style.cssText  = "margin-top: 10px;";
            btn1 = addBtn(div, btnRefresh, "Refresh highlight data", "Reload information from your lists - might take a few seconds");
            btn2 = addBtn(div, btnClear,   "Clear highlight data",   "Disable color highlighting of your lists");
            btn4 = addBtn(div, btnHelp,    "What's this?",           "Click for help on these buttons");
            h1[0].appendChild(div);
         } else console.error('Could not find "<h1>Your Lists</h1>" to insert buttons!');
      }
   }
   function addNetflixButtons() {
      var main = document.querySelector('div.mainView');
      if (!main)
         console.error('Could not find "main <div>" to insert buttons!');
      else {
          var div  = document.createElement('div');
          var btnStyle = 'margin-left: 20px; margin-bottom: 20px; font-size: 13px; padding: .5em; background: 0 0; color: grey; border: solid 1px grey;';
          btn8 = addBtn(div, btnNFRefresh, "Refresh My List data", "Reload information from your list - might take a few seconds", btnStyle);
          btn16 = addBtn(div, btnNFClear,  "Clear My List data",   "Empty the data", btnStyle);
          main.appendChild(div);
      }
   }

/*
   function addButtons() {
      var div = document.querySelector(".jawbone-actions");
      if (!div)
         console.error('Could not find "button <div>" to insert buttons!');
      else {
            btn1 = addBtn(div, toggleTitle, "HIDE", "Hide this title");
      }
   }
*/

   //-------- "main" --------
   var we_are_in_a_title_page = false;
   var we_are_in_the_imdb_list_page = false;
   var we_are_in_the_netflix_list_page = false;

   if (document.location.href.match(/\.netflix\..{2,3}\//)) {
      we_are_in_a_title_page = true;
   }

   if (document.location.href == 'https://www.netflix.com/browse/my-list') {
      we_are_in_the_netflix_list_page = true;
   }
   if (document.location.href.match(/\.imdb\..{2,3}\/user\/[^\/]+\/lists/)) {
      we_are_in_the_imdb_list_page = true;
      getMyIMDbLists();
   }

   // Find current logged in user, or quit script
   user = getCurrentNetflixUser();
   if (!user) return;


   // Allow user to manually update his/her lists
   if (we_are_in_the_imdb_list_page) {
      // Find current logged in user, or quit script
      IMDbUser = getCurrentIMDbUser();
      if (!IMDbUser) return;  // FIX-ME: to support external sites: set/get LAST user to/from browser storage

      addIMDbButtons();
      return; // Nothing else to do on the lists page - goodbye!
   }
   if (we_are_in_the_netflix_list_page) {
      addNetflixButtons();
   }

   if (we_are_in_a_title_page) {
      // Load lists data for this user from localStorage
      loadMyLocalList();
      loadMyNetflixList();
      loadMyIMDbLists();
   }



// THIS IS THE NEW PART


   function hideTitleCards() {
//       console.log('waitnlp',we_are_in_the_netflix_list_page);
      //
      // Highlight all title cards in the current Netflix page
      //

      var num, color, lists, movie;
      var anchors = document.querySelectorAll('div.title-card');

      for (var i=0; i < anchors.length; i++) {
         var a = anchors[i];
         if (!a.GVhide) {
            addHideBtn(a, toggleTitle, 'H', 'Hide/show this title');

            var tt = getIdFromDiv(a);
            var title, movieTitle;
            var hideType = null;
            if (a.className.indexOf('is-disliked') != -1) hideType = 'D';
            else {
                movie = a.querySelector(".fallback-text");
                if (movie) movieTitle = movie.innerText;

                if (movieTitle) {
                    num   = movieTitle;
                    //lists = inLists(num, TITLES);
                    if        (myLists[neededLists.watch].ids[num]) {
                        hideType = 'W';
                    } else if (myLists[neededLists.tbd].ids[num]) {
                        hideType = 'T';
                    } else if (myLists[neededLists.visti].ids[num]) {
                        hideType = 'S';
                    } else if (myLists[neededLists.no].ids[num]) {
                        hideType = 'N';
                    }
                }
            }
            if (!hideType && (title = myLocalList[tt])) hideType = 'H';
            if ((!hideType || hideType == 'W') && !we_are_in_the_netflix_list_page && (title = myNetflixList[tt])) {
//                console.log('ht',hideType,'tt',tt,'mt',movieTitle);
                var row = a.closest('div.lolomoRow');
                if (!row || (row.dataset.listContext != 'queue' && row.dataset.listContext != 'continueWatching')) hideType = 'M';
//                console.log('rownull',!row,'lt',row.dataset.listContext);
            }

            if (hideType) hideItem(a, tt, title, hideType);
            a.GVhide = true; // set to "true" when "enhanced" (so we skip it on next pass)
         }
      }
   }



   // start the hiding title function
//   if (myLists.length) {
      hideTitleCards();
      if (interval >= 100) setInterval(hideTitleCards, interval);
//   }

})();
