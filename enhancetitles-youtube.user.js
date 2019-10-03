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
// @version       1.2
// @installURL    https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.user.js
// @updateURL     https://greasyfork.org/scripts/390633-enhance-titles-youtube/code/Enhance%20titles%20-%20YouTube.meta.js
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @author        Guido
// @date          03.10.2019
// @match         https://www.youtube.com/*
// @grant         GM_xmlHttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_listValues
// @grant         GM_addStyle
// @require       https://greasyfork.org/scripts/390248-entrylist/code/EntryList.js
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [L] hide selective titles?
//
// History:
// --------
// 2019.10.03  [1.2] Refactor using EntryList library
// 2019.09.30  [1.1] First public version, correct @namespace and other headers
// 2019.06.17  [1.0] First version
//
//}
/* global EL: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var dest = EL.newContext('YouTube');


    dest.getPageEntries = function() {
        return document.querySelectorAll('a#thumbnail');
    }


    dest.determineType = function(_I_lists, _I_tt, entry) {
        var st = entry.querySelector('#overlays');
        if (!st.innerHTML) return false;

        st = st.querySelector('#progress');
        return (st && st.style.width == "100%");
    }


    dest.processItem = function(entry, _I_tt, _I_processingType) {
        entry.style.opacity = .1;
    }

    /* END CONTEXT DEFINITION */



    //-------- "main" --------
    EL.startup(dest);

})();
