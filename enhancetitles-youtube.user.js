// Enhance titles - YouTube
//
// Hide watched videos on YouTube
//
// https://greasyfork.org/scripts/390633-enhance-titles-youtube
// Copyright (C) 2019, Guido Villa
//
// For information/instructions on user scripts, see:
// https://greasyfork.org/help/installing-user-scripts
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name            Enhance titles - YouTube
// @description     Hide watched videos on YouTube
// @version         1.3
// @author          guidovilla
// @date            05.10.2019
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://greasyfork.org/scripts/390633-enhance-titles-youtube
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
// @contributionURL https://tinyurl.com/gv-donate-72
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
// @downloadURL     https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.user.js
// @updateURL       https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.meta.js
// @downloadURL     https://openuserjs.org/install/guidovilla/Enhance_titles_-_YouTube.user.js
// @updateURL       https://openuserjs.org/meta/guidovilla/Enhance_titles_-_YouTube.meta.js
//
// @match           https://www.youtube.com/*
//
// @require         https://greasyfork.org/scripts/390248-entry-list/code/Entry_List.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [L] hide selective titles?
//
// Changelog:
// ----------
//                   Change @require following library rename 
// 2019.10.05  [1.3] Fix completion status appearing later (after ELProcessed)
// 2019.10.03  [1.2] Refactor using EntryList library
// 2019.09.30  [1.1] First public version, correct @namespace and other headers
// 2019.06.17  [1.0] First version
//

/*jshint -W008 */
/* global EL: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var youtube = EL.newContext('YouTube');


    youtube.getPageEntries = function() {
        return document.querySelectorAll('a#thumbnail');
    };


    youtube.isValidEntry = function(entry) {
        var st = entry.querySelector('#overlays');
        return !!(st && st.innerHTML);
    };


    youtube.determineType = function(_I_lists, _I_tt, entry) {
        var st = entry.querySelector('#overlays #progress');
        return (st && st.style.width == "100%");
    };


    youtube.processItem = function(entry, _I_tt, _I_processingType) {
        entry.style.opacity = .1;
    };

    /* END CONTEXT DEFINITION */



    //-------- "main" --------
    EL.startup(youtube);

})();
