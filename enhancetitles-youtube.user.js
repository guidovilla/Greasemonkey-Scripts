// File encoding: UTF-8
//{
// Hide watched videos on YouTube
//
// Copyright (c) 2019, Guido Villa
// Most of the script is taken from IMDb 'My Movies' enhancer:
// Copyright (c) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          Enhance titles - YouTube
// @description   Hide watched videos on YouTube
// @homepageURL   https://greasyfork.org/scripts/390633-enhance-titles-youtube
// @namespace     https://greasyfork.org/users/373199-guido-villa
// @version       1.1
// @installURL    https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.user.js
// @updateURL     https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.meta.js
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @author        Guido
// @date          30.09.2019
// @match         https://www.youtube.com/*
// @grant         GM_xmlHttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_addStyle
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you either need Google Chrome (www.google.com/chrome)
// or Firefox (www.firefox.com) with Greasemonkey (www.greasespot.net).
// Install Greasemonkey, then restart Firefox and revisit this script.
//
// To uninstall, go to Tools/Greasemonkey/Manage User Scripts,
// select this script and click Uninstall.
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] Refactor using EntryList library
//   - [L] hide selective titles?
//
// History:
// --------
// 2019.09.30  [1.1] First public version, correct @namespace and other headers
// 2019.06.17  [1.0] First version
//
//}


(function() {

   // Modified version of Michael Leigeber's code, from:
   // http://sixrevisions.com/tutorials/javascript_tutorial/create_lightweight_javascript_tooltip/
   // http://userscripts.org/scripts/review/91851 & others
//   var injectJs = 'function tooltipClass(msg) {this.msg = msg;this.id = "tt";this.top = 3;this.left = 15;this.maxw = 500;this.speed = 10;this.timer = 20;this.endalpha = 95;this.alpha = 0;this.tt == null;this.c;this.h = 0;this.moveFunc = null;this.fade = function (d) {var a = this.alpha;if (a != this.endalpha && d == 1 || a != 0 && d == -1) {var i = this.speed;if (this.endalpha - a < this.speed && d == 1) {i = this.endalpha - a;} else if (this.alpha < this.speed && d == -1) {i = a;}this.alpha = a + i * d;this.tt.style.opacity = this.alpha * 0.01;} else {clearInterval(this.tt.timer);if (d == -1) {this.tt.style.display="none";document.removeEventListener("mousemove", this.moveFunc, false);this.tt = null;}}};this.pos = function (e, inst) {inst.tt.style.top = e.pageY - inst.h + "px";inst.tt.style.left = e.pageX + inst.left + "px";};this.show = function (msg) {if (this.tt == null) {this.tt = document.createElement("div");this.tt.setAttribute("id", this.id);c = document.createElement("div");c.setAttribute("id", this.id + "cont");this.tt.appendChild(c);document.body.appendChild(this.tt);this.tt.style.opacity = 0; this.tt.style.zIndex=100000; var inst = this;this.moveFunc = function (e) {inst.pos(e, inst);};document.addEventListener("mousemove", this.moveFunc, false);}this.tt.style.display = "block";c.innerHTML = msg || this.msg;this.tt.style.width = "auto";if (this.tt.offsetWidth > this.maxw) {this.tt.style.width = this.maxw + "px";}h = parseInt(this.tt.offsetHeight) + this.top;clearInterval(this.tt.timer);var inst = this;this.tt.timer = setInterval(function () {inst.fade(1);}, this.timer);};this.hide = function () {if (this.tt) {clearInterval(this.tt.timer);var inst = this;this.tt.timer = setInterval(function () {inst.fade(-1);}, this.timer);}};} tooltip = new tooltipClass("default txt");';

//   var newJs = document.createElement('script');
//   newJs.setAttribute('type', 'text/javascript');
//   newJs.innerHTML = injectJs;
//   document.getElementsByTagName('head')[0].appendChild(newJs);

   var interval = 1000; // Interval (in ms, >= 100) to re-scan links in the DOM
                        // Won't re-scan if < 100
                        // (I might consider using MutationObserver in the future, instead)


   function hideItem(title) {
       title.style.opacity = .1;
   }


   function hideTitleCards() {
      //
      // Highlight all title cards in the current Netflix page
      //

      var thumbnails = document.querySelectorAll('a#thumbnail');
       console.log('x',thumbnails.length);

      for (var i=0; i < thumbnails.length; i++) {
         var a = thumbnails[i];
         if (!a.GVhide) {
            var st = a.querySelector('#overlays');
            if (!st.innerHTML) break;

            st = st.querySelector('#progress');
            if (st && st.style.width == "100%") hideItem(a);

            a.GVhide = true; // set to "true" when "enhanced" (so we skip it on next pass)
         }
      }
   }



   // start the hiding title function
    hideTitleCards();
    if (interval >= 100) setInterval(hideTitleCards, interval);

})();
