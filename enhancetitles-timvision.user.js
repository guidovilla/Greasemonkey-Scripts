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
// @date            10.10.2019
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://greasyfork.org/scripts/390632-enhance-titles-timvision
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
// @contributionURL https://tinyurl.com/gv-donate-3a
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
// @downloadURL     https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.user.js
// @updateURL       https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.meta.js
// @downloadURL     https://openuserjs.org/install/guidovilla/Enhance_titles_-_Timvision.user.js
// @updateURL       https://openuserjs.org/meta/guidovilla/Enhance_titles_-_Timvision.meta.js
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
//   - [L] Integration with IMDb list
//
// Changelog:
// ----------
// 2019.10.10  [1.4] Use classes instead of inline styles, some code cleanup
//                   Optimization: permanently skip invalid entries
// 2019.10.02  [1.3] Simplify code thanks to new EntryList defaults
// 2019.09.30  [1.2] First public version, correct @namespace and other headers
// 2019.09.27  [1.1] Changes due to EntryList (formerly TitleList) refactoring
// 2019.09.21  [1.0] First version. Hiding function and removes useless zooming of title cards on mouseover
// 2019.09.18  [0.1] First test version, private use only
//

/* jshint laxbreak: true */
/* global EL: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var timvision = EL.newContext('TIMVision');

    // other variables
    timvision.ENTRY_SELECTOR = '.content-item-tile-small';
    timvision.CLASS_BUTTON = 'EL-TIMVision-HButton';
    timvision.STYLE_BUTTON = '.' + timvision.CLASS_BUTTON + ' {'
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
    timvision.CLASS_PROCESS = 'EL-TIMVision-Process';
    var process_selector = timvision.ENTRY_SELECTOR + '.' + timvision.CLASS_PROCESS;
    timvision.STYLE_PROCESS =
              process_selector + ' {opacity: 0.15; zoom: .5;} '
            + process_selector + ' .' + timvision.CLASS_BUTTON + ' {zoom: 2;} '
            + process_selector + ' .content-item-tile-title {font-size:26px;}';


    timvision.getUser = function() {
        var user = document.querySelector('span.username');
        if (user) user = user.textContent.trim();
        return user;
    };


    timvision.getPageEntries = function() {
        return document.querySelectorAll(this.ENTRY_SELECTOR);
    };


    timvision.isValidEntry = function(entry) {
        return !!(entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]'))
            || EL.markInvalid(entry);
    };


    timvision.modifyEntry = function(entry) {
        var d         = document.createElement('div');
        d.textContent = 'H';
        d.title       = 'Hide/show this title';
        d.className   = this.CLASS_BUTTON;
        EL.addToggleEventOnClick(d, this.ENTRY_SELECTOR);
        entry.querySelector('figure').appendChild(d);

        // remove useless zooming on mouseover
        var parent = entry.parentNode.parentNode.parentNode;
        if (!parent.NoMouseOver) {
            parent.addEventListener('mouseenter',function(e){e.stopPropagation();},true);
            parent.NoMouseOver = true;
        }
    };


    timvision.getIdFromEntry = function(entry) {
        var a = entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]');
        var id = null;
        if (a) {
            id = a.href.match(/\/detail\/([0-9]+)-/) || a.href.match(/\/series\/([0-9]+)-/);
            if (id && id.length >= 2) id = id[1];
        }
        if (!id) return null;
        return { 'id': id, 'name': a.title };
    };


    timvision.processItem = function(entry, _I_tt, _I_processingType) {
        entry.classList.toggle(this.CLASS_PROCESS, true);
    };


    timvision.unProcessItem = function(entry, _I_tt, _I_processingType) {
        entry.classList.toggle(this.CLASS_PROCESS, false);
    };

    /* END CONTEXT DEFINITION */



    //-------- "main" --------
    GM_addStyle(timvision.STYLE_BUTTON);
    GM_addStyle(timvision.STYLE_PROCESS);
    EL.startup(timvision);

})();
