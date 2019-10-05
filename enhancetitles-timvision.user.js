// Enhance titles - Timvision
// Hide titles on Timvision website by clicking on a button
//
// https://greasyfork.org/scripts/390632-enhance-titles-timvision
// Copyright (C) 2019, Guido Villa
//
// For instructions, see https://greasyfork.org/help/installing-user-scripts
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name            Enhance titles - Timvision
// @description     Hide titles on Timvision website by clicking on a button
// @version         1.4
// @author          guidovilla
// @date            03.10.2019
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://greasyfork.org/scripts/390632-enhance-titles-timvision
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
// @contributionURL https://tinyurl.com/gv-donate-3a
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
// @downloadURL     https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.user.js
// @updateURL       https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.meta.js
//
// @match           https://www.timvision.it/*
//
// @require         https://greasyfork.org/scripts/390248-entrylist/code/EntryList.js
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_addStyle
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [M] check if title id is really unique for a title or if multiple ids are possible
//   - [M] add some @exclude
//   - [M] remove commented code
//   - [L] Integration with IMDb list
//
// Changelog:
// ----------
// 2019.10.03  [1.4] Use classes instead of inline styles
//                   Optimization: permanently skip invalid entries
// 2019.10.02  [1.3] Simplify code thanks to new EntryList defaults
// 2019.09.30  [1.2] First public version, correct @namespace and other headers
// 2019.09.27  [1.1] Changes due to EntryList (formerly TitleList) refactoring
// 2019.09.21  [1.0] First version. Hiding function and removes useless zooming of title cards on mouseover
// 2019.09.18  [0.1] First test version, private use only
//

/* global EL: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var dest = EL.newContext('TIMVision');

    // other variables
    dest.ENTRY_SELECTOR = '.content-item-tile-small';
    dest.CLASS_BUTTON = 'EL-TIMVision-HButton';
    dest.STYLE_BUTTON = '.' + dest.CLASS_BUTTON + ' {'
            + 'position: absolute;'
            + 'bottom: 8px;'
            + 'left: 8px;'
            + 'z-index: 1000;'
            + 'width: 30px;'
            + 'height: 30px;'
            + 'line-height: 30px;'
            + 'border: 2px solid white;'
            + 'border-radius: 50%;'
            + 'background-color: black;'
            + 'opacity: 0.5;'
            + 'text-align: center;'
            + 'vertical-align: middle;'
            + 'font-weight: bold;'
            + '}';
    dest.CLASS_PROCESS = 'EL-TIMVision-Process';
    var process_selector = dest.ENTRY_SELECTOR + '.' + dest.CLASS_PROCESS;
    dest.STYLE_PROCESS =
              process_selector + ' {opacity: 0.15; zoom: .5;} '
            + process_selector + ' .' + dest.CLASS_BUTTON + ' {zoom: 2;} '
            + process_selector + ' .content-item-tile-title {font-size:26px;}';


    dest.getUser = function() {
        var user = document.querySelector('span.username');
        if (user) user = user.textContent.trim();
        return user;
    };


    dest.getPageEntries = function() {
        return document.querySelectorAll(this.ENTRY_SELECTOR);
    };


    dest.isValidEntry = function(entry) {
        return !!(entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]'))
            || EL.markInvalid(entry);
    };


    dest.modifyEntry = function(entry) {
        var d         = document.createElement('div');
        d.textContent = 'H';
        d.title       = 'Hide/show this title';
        d.classList.add(this.CLASS_BUTTON);
        EL.addToggleEventOnClick(d, this.ENTRY_SELECTOR);
        entry.querySelector('figure').appendChild(d);

        // remove useless zooming on mouseover
        var parent = entry.parentNode.parentNode.parentNode;
        if (!parent.NoMouseOver) {
            parent.addEventListener('mouseenter',function(e){e.stopPropagation();},true);
            parent.NoMouseOver = true;
        }
        return d;
    };


    dest.getIdFromEntry = function(entry) {
        var a = entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]');
        var id = null;
        if (a) {
            id = a.href.match(/\/detail\/([0-9]+)-/) || a.href.match(/\/series\/([0-9]+)-/);
            if (id && id.length >= 2) id = id[1];
        }
        if (!id) return null;
        return { 'id': id, 'name': a.title };
    };


    dest.processItem = function(entry, _I_tt, _I_processingType) {
        entry.classList.toggle(this.CLASS_PROCESS, true);
    };


    dest.unProcessItem = function(entry, _I_tt, _I_processingType) {
        entry.classList.toggle(this.CLASS_PROCESS, false);
    };

    /* END CONTEXT DEFINITION */



    //-------- "main" --------
    GM_addStyle(dest.STYLE_BUTTON);
    GM_addStyle(dest.STYLE_PROCESS);
    EL.startup(dest);

})();

/*
    var IMDbSrc = {};
    IMDbSrc.name = 'IMDb';

    IMDbSrc.getUser = function() {
        var user;
        var account = document.getElementById('consumer_user_nav') ||
                      document.getElementById('nbpersonalize');
        if (account) {
           var                 result = account.getElementsByTagName('strong');
           if (!result.length) result = account.getElementsByClassName("navCategory");
           if (!result.length) result = account.getElementsByClassName("singleLine");
           if (!result.length) result = account.getElementsByTagName("p");
           if (result) user = result[0].textContent.trim();
        }
        return user;
    }


    dest.getListsFromEntry = function(tt, entry) {
        if (entry.className.indexOf('is-disliked') != -1) return { "localDisliked": true };
    }

*/
