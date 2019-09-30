// File encoding: UTF-8
//{
// Enhance/hide titles on Timvision website by clicking on a button.
//
// Copyright (c) 2019, Guido Villa
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          Enhance titles - Timvision
// @description   Hide titles on Timvision website by clicking on a button
// @homepageURL   https://greasyfork.org/scripts/390632-enhance-titles-timvision
// @namespace     https://greasyfork.org/users/373199-guido-villa
// @version       1.2
// @installURL    https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.user.js
// @updateURL     https://greasyfork.org/scripts/390632-enhance-titles-timvision/code/Enhance%20titles%20-%20Timvision.meta.js
// @copyright     2019, Guido Villa
// @license       GPL-3.0-or-later
// @author        Guido
// @date          30.09.2019
// @match         https://www.timvision.it/*
// @grant         GM_xmlHttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_addStyle
// @require       https://greasyfork.org/scripts/390248-entrylist/code/EntryList.js
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [M] correct @namespace, @homepage and other headers
//   - [M] add some @exclude
//   - [M] add updateurl
//   - [M] remove commented code
//   - [L] Integration with IMDb list
//
// History:
// --------
// 2019.09.30  [1.2] First public version, correct @namespace and other headers
// 2019.09.27  [1.1] Changes due to EntryList (formerly TitleList) refactoring
// 2019.09.21  [1.0] First version. Hiding function and removes useless zooming of title cards on mouseover
// 2019.09.18  [0.1] First test version, private use only
//
//}
/* global EL: readonly */

(function() {
    'use strict';

    /* BEGIN CONTEXT DEFINITION */

    var dest  = {};
    dest.name = 'TIMVision';

    // other variables
    dest.ENTRY_SELECTOR = '.content-item-tile-small';
    dest.HIDE_LIST = 'localHide';
    dest.HIDE_TYPE = 'H';


    dest.getUser = function() {
        var user = document.querySelector('span.username');
        if (user) user = user.textContent.trim();
        return user;
    }


    dest.getPageEntries = function() {
        return document.querySelectorAll(this.ENTRY_SELECTOR);
    }


    dest.isValidEntry = function(entry) {
        return !!(entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]'));
    }


    dest.modifyEntry = function(entry) {
        var d           = document.createElement('div');
        d.style.cssText =
            'position: absolute;' +
            'bottom: 8px;' +
            'left: 8px;' +
            'z-index: 1000;' +
            'width: 30px;' +
            'height: 30px;' +
            'line-height: 30px;' +
            'border: 2px solid white;' +
            'border-radius: 50%;' +
            'background-color: black;' +
            'opacity: 0.5;' +
            'text-align: center;' +
            'vertical-align: middle;' +
            'font-weight: bold;';
        d.textContent   = 'H';
        d.title         = 'Hide/show this title';
        EL.addToggleEventOnClick(d, this.HIDE_TYPE, this.HIDE_LIST, this.ENTRY_SELECTOR);
        entry.querySelector('figure').appendChild(d);

        var parent = entry.parentNode.parentNode.parentNode;
        if (!parent.NoMouseOver) {
            parent.addEventListener('mouseenter',function(e){e.stopPropagation();},true);
            parent.NoMouseOver = true;
        }
        return d;
    }


    dest.getIdFromEntry = function(entry) {
        var a = entry.querySelector('a[href^="/detail/"]') || entry.querySelector('a[href^="/series/"]');
        var id = null;
        if (a) {
            id = a.href.match(/\/detail\/([0-9]+)-/) || a.href.match(/\/series\/([0-9]+)-/);
            if (id && id.length >= 2) id = id[1];
        }
        if (!id) {
            console.error('Could not determine title id :-( - for entry', entry);
            return null;
        }
        return { 'id': id, 'name': a.title };
    }


    dest.determineType = function(lists, _I_tt, _I_entry) {
        if (lists[this.HIDE_LIST]) return this.HIDE_TYPE;
    }


    dest.processItem = function(entry, _I_tt, _I_processingType) {
        entry.style.opacity = .15;
    }


    dest.unProcessItem = function(entry, _I_tt, _I_processingType) {
        entry.style.opacity = 1;
    }

    /* END CONTEXT DEFINITION */



    //-------- "main" --------
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
