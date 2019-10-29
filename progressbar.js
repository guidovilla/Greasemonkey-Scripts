// Progress Bar library
//
// Create and manage simple progress bars. CSS, minimal JavaScript.
//
// https://greasyfork.org/scripts/391236-progress-bar
// Copyright (C) 2019, Guido Villa
// Original version of the code is taken from IMDb 'My Movies' enhancer:
// Copyright (C) 2008-2018, Ricardo Mendonça Ferreira (ric@mpcnet.com.br)
// Released under the GPL license - http://www.gnu.org/copyleft/gpl.html
//
// For information/instructions on user scripts, see:
// https://greasyfork.org/help/installing-user-scripts
//
// To use this library in a userscript you must add to script header:
  // @require https://greasyfork.org/scripts/391648/code/userscript-utils.js
  // @require https://greasyfork.org/scripts/391236/code/progress-bar.js
  // @grant   GM_addStyle
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @namespace       https://greasyfork.org/users/373199-guido-villa
// @exclude         *
//
// ==UserLibrary==
// @name            Progress Bar
// @description     Create and manage simple progress bars, minimal JavaScript
// @version         1.1
// @author          guidovilla
// @date            19.10.2019
// @copyright       2019, Guido Villa (https://greasyfork.org/users/373199-guido-villa)
// @license         GPL-3.0-or-later
// @homepageURL     https://greasyfork.org/scripts/391236-progress-bar
// @supportURL      https://gitlab.com/gv-browser/userscripts/issues
// @contributionURL https://tinyurl.com/gv-donate-04
// @attribution     Ricardo Mendonça Ferreira (https://openuserjs.org/users/AltoRetrato)
// ==/UserScript==
//
// ==/UserLibrary==
//
// --------------------------------------------------------------------
//
// To-do (priority: [H]igh, [M]edium, [L]ow):
//   - [H] width must be an integer multiple of background-size, otherwise
//         indeterminate animation will skip => address
//   - [M] speed of the animation depends on width => fix?
//   - [m] speed of transition is not constant (time is constant, regardless of
//         the "space" to be travelled) => can it be fixed?
//   - [M] nicer ui (maybe small vertical bars), improvements
//   - [M] different styles
//
// Changelog:
// ----------
//                   Refactor adding Userscript Utils, hide global variables & other code cleanup.
//                   Minor name change, backward compatible
// 2019.10.19  [1.1] Add possibility to update finish value
//                   Change default value for "current" argument in update()
// 2019.10.16  [1.0] First version
// 2019.10.14  [0.1] First test version, private use only
//

/* jshint esversion: 6, supernew: true, laxbreak: true */
/* exported ProgressBar, Library_Version_PROGRESS_BAR */
/* global UU: readonly */

const Library_Version_PROGRESS_BAR = '1.1';

/* How to use this library

- Create a new progress bar:
  var pb = new ProgressBar(...)

- Change the progress:
  pb.update(...)
  pb.advance(...)

- Remove the progress bar:
  pb.close()

Details
Progress bars are defined by three main parameters:
- finish:   value that defines what is 100%
            this is set at creation time and can be changed with update()
            if set to 0 it is changed to -1 (see below)
- progress: value that defines current completion status (if > finish, it is
            set to the finish value)
            initial progress is set a creation time, then it can be updated
            with update() and advance()
            When progress = -1, the bar shows an indeterminate progress
- message:  the message printed inside the bar (e.g. "Loading...")
            initial message is set a creation time, then it can be changed
            with update() and advance().
            The message can contain a few placeholders that are replaced with
            actual progress data:
            - {#}: replace with current progress number
            - {$}: replace with finish value
            - {%}: replace with completion percentage (= 100*progress/finish)
            E.g.: "Loading {#} of {$}..."  =>  "Loading 7 of 23..."

All numbers are integers.

Information for changing styles:
The HTML id of the container DIV can be accessed through the 'id' property
of the progress bar object.
All elements that constitute the bar have a generic "pb-progress-bar" class and
a specific "pb-progress-bar-<elem>" class different for each element.
Indeterminate progress style is enabled by applying a "pb-indeterminate" class
to the container DIV.

Methods (all arguments are optional):

- ProgressBar(finish, msg, options)
  Create a new progress bar. Arguments:
  - finish: maximum value that can be reached (default is 100)
  - msg: message written in the bar, see above for substitutions
         default is "Loading {#}/{$}..."
  - options: an object that may contain:
    - id: HTML id of container DIV (default: autogenerated)
    - start: initial progress status (default is 0, i.e. the beginning)
    - container: positioned element where the bar will be centered
                 null (the default): center bar on the screen
    - width: width in pixels of the progress bar (default is 226.3)
    - height: height in pixels of the progress bar (default is 30)

- update(progress, msg, finish)
  Optionally update parameters of the progress bar. Only non-undefined,
  non-null parameters are updated.

- advance(value, msg)
  Increment the progress bar status. Arguments:
  - value: the increment value, can be negative (default is 1)
  - msg: an optional new message (default is: don't change message)

- close()
  Close the progress bar and remove it from the DOM.

*/


window.ProgressBar = (function() {
    'use strict';
    var progress_bar_style_has_been_loaded = false;
    var progress_bar_index = 0;

    // Create progress bar
    // eslint-disable-next-line max-statements
    return function(finishVal, msg, options) {
        // NOTE: we do all initialization only when a ProgressBar is created
        // so that when the library is not used, no useless operations are done

        // style definition
        var STYLE = '.pb-progress-bar.pb-progress-bar-box{border:2px solid black;background-color:white;padding:2px;outline:white solid 6px;z-index:10000}'
                  + '.pb-progress-bar.pb-progress-bar-bar{background-color:green;height:100%;transition:width 300ms linear}'
                  + '.pb-progress-bar.pb-progress-bar-txtcont{position:absolute;top:0;left:0;width:100%;height:100%;display:table}'
                  + '.pb-progress-bar.pb-progress-bar-txt{display:table-cell;text-align:center;vertical-align:middle;font:16px verdana,sans-serif;color:black}'
                  + '.pb-progress-bar.pb-progress-bar-box.pb-indeterminate{background:repeating-linear-gradient(-45deg,#F0F0F0 0 20px,#ccc 20px 40px);background-size:56.56854px;animation:2s linear infinite loading}'
                  + '.pb-progress-bar.pb-progress-bar-box.pb-indeterminate .pb-progress-bar-bar{background-color:transparent;transition:none}'
                  + '@keyframes loading{from{background-position-x:0%;} to{background-position-x:100%}}';
        if (!progress_bar_style_has_been_loaded) {
            GM_addStyle(STYLE);
            progress_bar_style_has_been_loaded = true;
        }

        var self = this;

        // basic configuration
        this.id       = 'pb-progress-bar-' + ++progress_bar_index; // 'id' is public
        var start     = 0;
        var finish    = 100;
        var container = null;
        var width     = 226.27417;
        var height    = 30;
        var message   = 'Loading {#}/{$}...';

        var current;  // completion status of the progress bar

        var pbBox, pb, pbTxtCont, pbTxt;  // elements of the progress bar

        // helper method to create the elements
        function createElement(father, elementType, className, id) {
            var elem = document.createElement(elementType);
            if (!UU.isUndef(id)) elem.id = id;
            elem.className = 'pb-progress-bar ' + className;
            father.appendChild(elem);
            return elem;
        }

        // initialization method
        function init() {
            // check for options in the call
            if (options && typeof options === 'object') {
                if (!UU.isUndef(options.id))        self.id   = options.id;
                if (!UU.isUndef(options.start))     start     = options.start;
                if (!UU.isUndef(options.container)) container = options.container;
                if (!UU.isUndef(options.width))     width     = options.width;
                if (!UU.isUndef(options.height))    height    = options.height;
            }

            // calculate positioning
            var containerWidth, containerHeight,
                cntElem,
                positioningStyle;

            function setPositioningVars(cnt, pos, w, h) {
                containerWidth  = w;
                containerHeight = h;
                cntElem = cnt;
                positioningStyle = pos;
            }

            if (container) {
                var rect = container.getBoundingClientRect();
                setPositioningVars(container, 'absolute', rect.width, rect.height);
            } else {
                setPositioningVars(document.body, 'fixed', window.innerWidth, window.innerHeight);
            }
            var top  = containerHeight / 2 - height / 2;
            var left = containerWidth  / 2 - width  / 2;

            // create the elements
            pbBox = createElement(cntElem, 'div', 'pb-progress-bar-box', self.id);
            pbBox.style.cssText = 'position:' + positioningStyle
                                + '; height:' + height + 'px;width:' + width
                                + 'px;top:'   + top    + 'px;left:'  + left + 'px;';

            pb        = createElement(pbBox,     'div', 'pb-progress-bar-bar');
            pbTxtCont = createElement(pbBox,     'div', 'pb-progress-bar-txtcont');
            pbTxt     = createElement(pbTxtCont, 'div', 'pb-progress-bar-txt');

            // set the initial progress
            self.update(start, msg, finishVal);
        }


        /* PUBLIC members */

        // optionally update progress status, message, finish
        this.update = function(currentVal, newMsg, newFinish) {
            if (newMsg) message = newMsg;
            // if finish == 0, set it to -1
            if (!UU.isUndef(newFinish)  && newFinish  !== null) finish = (newFinish || -1);
            var newVal;
            if (!UU.isUndef(currentVal) && currentVal !== null) newVal = currentVal;
            else newVal = current;
            if (newVal > finish) {
                newVal = finish;
                if (finish > 0) UU.lw('update: current value greater than finish value');
            }

            if (newVal < 0) {
                // setting the width to zero is not really needed, but ensures a
                // more consistent behaviour in cases where the delay (see
                // below) is not enough.
                pb.style.width = '0';
                // try to make the message nicer for indeterminate progress
                pbTxt.textContent = message
                                    .replace(/ *{#}.*{\$} */g, '')
                                    .replace(/ *{#} */g,       '')
                                    .replace(/ *{\$} */g,      '')
                                    .replace(/ *{%} *%? */g,   '');
                pbBox.classList.add('pb-indeterminate');
            } else {
                pb.style.width = (100*newVal/finish) + '%';
                if (current < 0) {
                    // if exiting from indeterminate progress a small delay is
                    // needed, otherwise the class may be removed when changing
                    // the width, and the width transition takes place anyway
                    UU.wait(33).then(function() { pbBox.classList.remove('pb-indeterminate'); });
                } else {
                    pbBox.classList.remove('pb-indeterminate');
                }
                // replace placeholders with actual numbers
                pbTxt.textContent = message
                                    .replace(/{#}/g, newVal)
                                    .replace(/{\$}/g, finish)
                                    .replace(/{%}/g, Math.round(100*newVal/finish));
            }
            current = newVal;
        };


        // advance the progress by "value" and optionally change the message
        this.advance = function(value = 1, newMsg) {
            self.update(current + value, newMsg);
        };


        // close/remove the progress bar
        this.close = function() {
            pbBox.parentNode.removeChild(pbBox);
        };


        /* INITIALIZATION */
        init();
    };
}());
