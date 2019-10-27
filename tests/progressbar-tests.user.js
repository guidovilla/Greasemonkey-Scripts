// ==UserScript==
// @name            Test - ProgressBar
// @description     Test the ProgressBar library - internal use only
// @version         1.1
// @author          guidovilla
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://gitlab.com/gv-browser/userscripts
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
//
// @namespace       https://greasyfork.org/users/373199-guido-villa
//
// @match           https://www.google.com/*
//
// @require         https://greasyfork.org/scripts/391648-us-utils/code/US_Utils.js
// @require         https://greasyfork.org/scripts/391236-progressbar/code/ProgressBar.js
// @grant           GM_addStyle
// ==/UserScript==
//
// TODO add many tests

/* jshint esversion: 6, laxbreak: true, -W008 */
/* global UU: readonly, ProgressBar: readonly */

(function() {
    'use strict';

    var tst = (function() {
        var tstNo = 0;
        return function(expected, ...result) {
            console.log(++tstNo, 'Test:', expected, 'Result:', ...result);
        };
    }());

    var tstThen = function(...args) {
        return (function(_I_result) { tst(...args); });
    };

    tst('new indeterminate progressbar');
    var pb1 = new ProgressBar(-1);

    tst('new progressbar centered on body');
    var pb2 = new ProgressBar(undefined, undefined, { 'container': document.querySelector('body') });

    var SHORT = 1000;
    var LONG  = 3500;
    UU.wait(SHORT)
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(SHORT))
        .then(tstThen('advance by 1'))
        .then(pb2.advance)
        .then(UU.thenWait(LONG))
        .then(tstThen('finish -> 50'))
        .then(function(){pb2.update(null,null,50);})
        .then(UU.thenWait(LONG))
        .then(tstThen('progress -> 23/81'))
        .then(function(){pb2.update(23,null,81);})
        .then(UU.thenWait(LONG))
        .then(tstThen('indeterminate, message "blip"'))
        .then(function(){pb2.update(-1,'blip {%}');})
        .then(UU.thenWait(LONG))
        .then(tstThen('first pb: progress 3/18, msg "centered {$} -> {#}"'))
        .then(function(){pb1.update(3,'centered {$} -> {#}', 18);})
        .then(UU.thenWait(LONG))
        .then(UU.thenWait(LONG))
        .then(tstThen('current -> 41 (msg: blip {%})'))
        .then(function(){pb2.update(41);})
        .then(UU.thenWait(LONG))
        .then(tstThen('current -> 100%, close first pb'))
        .then(function(){pb2.update(100);pb1.close();})
        .then(UU.thenWait(LONG))
        .then(tstThen('close'))
        .then(pb2.close);

}());
