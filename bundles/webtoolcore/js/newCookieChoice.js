if (undefined === HTMLElement.prototype.addClass) {
    Object.assign(HTMLElement.prototype, {
        addClass: function(className) {
            if (this.classList) {
                this.classList.add(className);
            }
            return this;
        },
        removeClass: function(className) {
            if (this.classList) {
                this.classList.remove(className);
            }
            return this;
        },
        toggleClass: function(className, toggle) {
            toggle ? this.addClass(className) : this.removeClass(className);
            return this;
        },
        hasClass: function(className) {
            if (this.classList) {
                return this.classList.contains(className);
            }
            return undefined;
        },
        show: function() {
            if (this.style) {
                this.style.display = "block";
            }
            return this;
        },
        hide: function() {
            if (this.style) {
                this.style.display = "none";
            }
            return this;
        },
        appendBefore: function (element) {
            this.parentElement && this.parentElement.insertBefore(element, this);
        },
        appendAfter: function (element) {
            this.parentElement && this.parentElement.insertBefore(element, this.nextSibling);
        },
        data: function(offset, value) {
            var attrName = 'data-' + offset;
            return undefined !== value
                ? this.setAttribute(attrName, value)
                : this.getAttribute(attrName);
        },
        hasData: function(offset) {
            return this.hasAttribute('data-' + offset);
        },
        removeData: function(offset) {
            return this.removeAttribute('data-' + offset);
        }
    });
}

// manage compatibility with previous browser
if (undefined === NodeList.prototype.forEach) {
    Object.assign(NodeList.prototype, {
        forEach: function(callback) {
            for (var index = 0; index < this.length; index++) {
                callback(this[index], index, this);
            }
        }
    });
}

if (undefined === String.hashCode) {
    String.prototype.hashCode = function() {
        var hash = 0, i = 0, len = this.length;
        while ( i < len ) {
            hash  = ((hash << 5) - hash + this.charCodeAt(i++)) << 0;
        }
        return hash;
    };
}

if (!window.CookieManager) {
    window.CookieManager = {
        setCookie: function(cookieName, value, expiredAfter) {
            var expiryDate = new Date();
            if (undefined === expiredAfter) {
                expiredAfter = '3M';
            }
            if (expiredAfter) {
                var matches = expiredAfter.match(/^(\d+)([yMdhms])$/);
                if (!matches) {
                    matches = ['3M', 3, 'M'];
                }
                var unit = {
                    y: 'FullYear',
                    M: 'Month',
                    d: 'Date',
                    h: 'Hours',
                    m: 'Minutes',
                    s: 'Seconds'
                }[matches[2]];
                expiryDate['set' + unit](expiryDate['get' + unit]() + parseInt(matches[1]));
            }
            document.cookie = cookieName + "=" + value + ";path=/;expires=" + expiryDate.toGMTString();
        },
        getCookies: function() {
            var cookiesList = document.cookie.split(";");
            var cookies = {};
            if (!cookiesList.length) {
                return cookies;
            }

            cookiesList.forEach(function(cookie) {
                if (!cookie) {
                    return;
                }
                var [cookieName, cookieValue] = cookie.trim().split("=");
                switch (true) {
                    case /^\d+$/.test(cookieValue):
                        cookieValue = parseInt(cookieValue);
                        break;
                    case /^(true|false)$/i.test(cookieValue):
                        cookieValue = JSON.parse(cookieValue);
                        break;
                    case '' === cookieValue:
                        cookieValue = null;
                        break;
                }
                cookies[cookieName] = cookieValue;
            });

            return cookies;
        },
        getCookie: function(cookieName) {
            return this.getCookies()[cookieName];
        }
    }
}

(function (window) {
    if (!!window.cookieChoiceManager) {
        return window.cookieChoiceManager;
    }

    // for debugging
    var document = window.document;

    var TYPE_PERFORMANCE = "performance";
    var TYPE_TARGETING = "targeting";
    var categoryLabels = {};
    categoryLabels[TYPE_PERFORMANCE] = 'Cookies de performance';
    categoryLabels[TYPE_TARGETING] = 'Cookies de publicité ciblée';
    var iframes = {};

    // it gets an html element by ID
    function getElement(element) {
        return document.getElementById(element);
    }

    // it gets html elements by css query selector
    function findElements(selector) {
        return document.querySelectorAll(selector);
    }

    var CookieChoiceManager = function() {
        var self = this;

        this.setCookieTemplate = function(cookieTemplate) {
            if (isEmptyPage()) {
                getElement("cookie-button").hide();
                return;
            }

            var defaultCookieContainer = getElement("cookie-container");
            if (!defaultCookieContainer) {
                return;
            }

            defaultCookieContainer.innerHTML = cookieTemplate;
            document.body.appendChild(defaultCookieContainer);

            initializeListeners();
            initializeCookieBehaviors();
        };

        function initializeListeners() {
            var listeners = {
                acceptAllBehavior: function() {
                    getElement("cookie-modal").hide();
                    enableMainFrame();
                    getElement("cookie-button").show();
                    setCookiesOnAcceptAll();
                    checkCookiesChoice();
                    enableTracker();
                },
                denyAllBehavior: function() {
                    getElement("cookie-modal").hide();
                    enableMainFrame();
                    getElement("cookie-button").show();
                    setCookiesOnDenayAll();
                    checkCookiesChoice();
                    disableTracker();
                },
                cookiePerfBehavior: function() {
                    setCookie(TYPE_PERFORMANCE, true);
                    checkCookiesChoice();
                    enableTracker();
                },
                cookiePubBehavior: function() {
                    setCookie(TYPE_TARGETING, true);
                    checkCookiesChoice();
                },
                cookieCancelPerfBehavior: function() {
                    setCookie(TYPE_PERFORMANCE, false);
                    checkCookiesChoice();
                },
                cookieCancelPubBehavior: function() {
                    setCookie(TYPE_TARGETING, false);
                    checkCookiesChoice();
                },
                cookieCustomBehavior: function() {
                    displayModal();
                },
                cookieCancelAllBehavior: function() {
                    getElement("cookie-frame").hide();
                    enableMainFrame();
                    getElement("cookie-button").show();
                    setCookiesOnDenayAll();
                    checkCookiesChoice();
                },
                closeModalButtonBehavior: function() {
                    getElement("cookie-modal").hide();
                    enableMainFrame();
                    getElement("cookie-button").show();
                },
                cookieAcceptAllBehavior: function() {
                    getElement("cookie-frame").hide();
                    enableMainFrame();
                    getElement("cookie-button").show();
                    setCookiesOnAcceptAll();
                    checkCookiesChoice();
                    enableTracker();
                },
            };
            var cookieButtonDisplay = {
                resetCookie: function() {
                    this.removeClass('cookie-refused');
                    this.removeClass('cookie-accepted');
                    return this;
                },
                enableCookie: function() {
                    this.resetCookie();
                    this.addClass('cookie-accepted');
                    return this;
                },
                disableCookie: function() {
                    this.resetCookie();
                    this.addClass('cookie-refused');
                    return this;
                },
                toggleCookie: function(enable) {
                    undefined === enable
                        ? this.resetCookie()
                        : (enable ? this.enableCookie() : this.disableCookie());
                    return this;
                }
            };

            findElements('#cookie-container button[id]').forEach(function(element) {
                var id = element.id.replace(/-([a-z])/g, function() {
                    return arguments[0].replace('-', '').toUpperCase();
                }) + 'Behavior';
                if (listeners[id] && !element.hasEventListener) {
                    element.addEventListener("click", listeners[id]);
                    element.hasEventListener = true;
                    if (element.hasClass('btn-cookie-action')) {
                        Object.assign(element, cookieButtonDisplay);
                    }
                }
            });

            document.querySelector("#cookie-button").addEventListener('click', function() {
                self.displayCookieModal(false);
            });
        }

        function initializeCookieBehaviors() {
            initializeIframes();
            var cookies = getCookies();
            if (undefined === cookies[TYPE_PERFORMANCE] && undefined === cookies[TYPE_TARGETING]) {
                enableCookieBarBehavior();
            } else {
                enableCookieModalBehavior();
            }
            checkCookiesChoice();
        }

        function initializeIframes() {
            document.querySelectorAll("[data-cookiecategory]").forEach(function(tag) {
                var tagSrc = tag.data('src');
                var hash = tagSrc ? tagSrc.hashCode() : null;
                if (hash && /^iframe$/i.test(tag.tagName.toLowerCase())) {
                    iframes[hash] = tagSrc;
                }
            });
        }

        function isEmptyPage() {
            var mainElements = document.querySelectorAll('main');
            if (!mainElements.length) {
                var mainFrame = document.querySelector('#main-frame');
                return !mainFrame.hasChildNodes();
            }

            var mainSize = 0;
            for (var index = 0; index < mainElements.length; index++) {
                try {
                    mainSize = mainElements[index].innerText.replace(/\s/igs, '').length;
                } catch (e) {
                    // manage compatibility with previous browser
                    mainSize = mainElements[index].innerText.replace(/\s/ig, '').length;
                }
                if (mainSize) {
                    return false;
                }
            }

            return true;
        }

        function enableCookieBarBehavior() {
            disableMainFrame();
            getElement("cookie-button").hide();
            getElement('cookie-frame').show();
        }

        function enableCookieModalBehavior() {
            getElement('cookie-frame').hide();
            enableMainFrame();
            self.displayCookieModal(true);
        }

        function resetButtonClass() {
            findElements('#cookie-container button.btn-cookie-action').forEach(function(element) {
                element.resetCookie && element.resetCookie();
            });
        }

        function checkCookiesChoice() {
            var cookies = getCookies();
            if (!cookies) {
                return;
            }

            resetButtonClass();

            var cookiePerfAcceptButton = getElement("cookie-perf");
            var cookiePerfDenyButton = getElement("cookie-cancel-perf");

            var cookieTargetingAcceptButton = getElement("cookie-pub");
            var cookieTargetingDenyButton = getElement("cookie-cancel-pub");

            var denyAllPopIn = getElement("deny-all");
            var acceptAllPopIn = getElement("accept-all");

            var denyAll = getElement("cookie-cancel-all");
            var acceptAll = getElement("cookie-accept-all");

            if (cookies[TYPE_PERFORMANCE] && cookies[TYPE_TARGETING]) {
                acceptAllPopIn.enableCookie();
                acceptAll.enableCookie();
            } else if (false === cookies[TYPE_PERFORMANCE] && false === cookies[TYPE_TARGETING]) {
                denyAllPopIn.disableCookie();
                denyAll.disableCookie();
                acceptAllPopIn.disableCookie();
                acceptAll.disableCookie();
            }
            if (undefined !== cookies[TYPE_PERFORMANCE]) {
                cookies[TYPE_PERFORMANCE] ?
                    cookiePerfAcceptButton.enableCookie() : cookiePerfDenyButton.disableCookie();
            }
            if (undefined !== cookies[TYPE_TARGETING]) {
                cookies[TYPE_TARGETING] ?
                    cookieTargetingAcceptButton.enableCookie() : cookieTargetingDenyButton.disableCookie();
            }
            if (cookies[TYPE_TARGETING] ^ cookies[TYPE_PERFORMANCE]) {
                acceptAllPopIn.disableCookie();
                denyAllPopIn.resetCookie();
            }

            verifyScriptIframeFields();
            showOrHideCloseModalButton();
        }

        // block user from touching anything on the page except the cookie bar
        function enableMainFrame() {
            blockOrNotMainFrame(false);
        }

        function disableMainFrame() {
            blockOrNotMainFrame(true);
        }

        function blockOrNotMainFrame(blockOrNot) {
            getElement("main-frame").toggleClass('unreadable-display', blockOrNot);
        }

        this.displayCookieModal = function(init) {
            if (init) {
                getElement("cookie-custom").addEventListener("click", displayModal, false);
            } else {
                displayModal();
            }
        }

        function showOrHideCloseModalButton() {
            var cookies = getCookies();
            if (undefined === cookies[TYPE_PERFORMANCE] && undefined === cookies[TYPE_TARGETING]) {
                getElement('close-modal-button').hide();
            } else {
                getElement('close-modal-button').show();
            }
        }

        function displayModal() {
            showOrHideCloseModalButton();
            getElement('cookie-modal').show();
            getElement('cookie-frame').hide();
        }

        function loadScript(scriptUrl) {
            const script = document.createElement('script');
            script.setAttribute('type', 'text/javascript');
            script.src = scriptUrl;
            document.body.appendChild(script);

            return new Promise(function(resolve, reject) {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        function verifyScriptIframeFields() {
            var cookies = getCookies();
            document.querySelectorAll("[data-cookiecategory]").forEach(function(tag) {
                var tagName = tag.tagName.toLocaleLowerCase();
                var category = tag.data('cookiecategory') || '';
                var consent = tag.data('cookieconsent') || '';
                var cookieAccepted = tag.data('cookiescript');
                var isPerformance = category.includes(TYPE_PERFORMANCE) || consent.includes(TYPE_PERFORMANCE);
                var isTargeting = category.includes(TYPE_TARGETING)  || consent.includes(TYPE_TARGETING);
                var isScript = /^script$/i.test(tagName);
                var isIframe = /^iframe$/i.test(tagName);
                var src, hash;

                if ((isPerformance && cookies[TYPE_PERFORMANCE]) || (isTargeting  && cookies[TYPE_TARGETING])) {
                    if (isScript) {
                        if (tag.data('src') || tag.getAttribute('src')) {
                            loadScript(tag.data('src') || tag.getAttribute('src'))
                                .then(function() {
                                    enableTracker();
                                });
                        }
                    } else if (isIframe) {
                        src = tag.data('src');
                        hash = src ? src.hashCode() : null;
                        if (hash) {
                            tag.setAttribute('src', iframes[hash]);
                        }
                        hideIframeSubstitute(tag, category);
                    }
                    tag.data('cookiescript', 'accepted');
                }

                if ((isPerformance && !cookies[TYPE_PERFORMANCE]) || (isTargeting && !cookies[TYPE_TARGETING])) {
                    if (tag.hasAttribute('src')) {
                        tag.data('src', tag.getAttribute('src'));
                    }
                    if (isScript) {
                        tag.setAttribute('type', 'text/plain');
                    } else if (isIframe) {
                        showIframeSubstitute(tag, category);
                        tag.setAttribute('src', '');
                    }
                    if (cookieAccepted) {
                        tag.removeData('cookiescript');
                    }
                }

                if (isScript
                    && !tag.hasAttribute('src')
                    && !tag.hasData('src')
                    && 'accepted' === tag.data('cookiescript')
                    && !tag.data('loaded')
                ) {
                    try {
                        eval(tag.innerHTML);
                        tag.data('loaded', 1);
                    } catch (e) {
                        console.warn(e);
                    }
                }
            });
        }

        function createElement(nodeName, attributes, content) {
            var element = document.createElement('div');
            for (var attrName in attributes) {
                element.setAttribute(attrName, attributes[attrName]);
            }
            if (undefined !== content) {
                element.innerHTML = content;
            }

            return element;
        }

        function setCookiesOnDenayAll() {
            setCookie(TYPE_PERFORMANCE, false);
            setCookie(TYPE_TARGETING, false);
            disableTracker();
        }

        function setCookiesOnAcceptAll() {
            setCookie(TYPE_PERFORMANCE, true);
            setCookie(TYPE_TARGETING, true);
        }

        function enableTracker(){
            var event = document.createEvent("Event");
            event.initEvent("enableTracker");
            window.dispatchEvent(event);
        }

        function disableTracker(){
            var event = document.createEvent("Event");
            event.initEvent("disableTracker");
            window.dispatchEvent(event);
        }

        function setCookie(cookieName, value) {
            CookieManager.setCookie(cookieName, value, '3M');
        }

        function getCookies() {
            return CookieManager.getCookies();
        }

        function showIframeSubstitute(iframe, cookieCategory) {
            var src = iframe.getAttribute('src') || iframe.data('src');
            var hash = src ? src.hashCode() : null;
            var replaceElementId = 'cookie-iframe-' + hash;
            var replaceIframe = getElement(replaceElementId);
            if (replaceIframe) {
                replaceIframe.show();
                iframe.hide();
                return;
            }

            var styles = ['width', 'height', 'position', 'display', 'top', 'left']
                .map(function(offset) {
                    var styleValue = null;
                    if (iframe.hasAttribute(offset)) {
                        styleValue = parseInt(iframe.getAttribute(offset)) + 'px';
                    }
                    if (iframe.style[offset]) {
                        styleValue = iframe.style[offset];
                    }

                    return null === styleValue ? null : `${offset}:${styleValue}`;
                })
                .filter(function(item) {
                    return item;
                });

            if (iframe.parentNode && iframe.hasAttribute('width')) {
                var textAlign = iframe.parentNode.style.textAlign;
                var width = parseInt(iframe.getAttribute('width'));
                var marginLeft;
                switch (textAlign) {
                    case 'center':
                        marginLeft = `calc(50% - ${width/2}px)`;
                        break;
                    case 'right':
                        marginLeft = `calc(100% - ${width}px)`;
                        break;
                }
                if (marginLeft) {
                    styles.push(`margin-left:${marginLeft}`);
                }
            }

            replaceIframe = createElement('div', {
                id: replaceElementId,
                style: styles.join(';')
            }, `
                <p>
                    Cet élément est masqué car vous avez refusé les "${categoryLabels[cookieCategory]}".
                    <span class="btn-open-cookie-modal">Veuillez les activer pour afficher l'élément.</span>
                </p>
            `);
            iframe.appendAfter(replaceIframe);

            replaceIframe.querySelector('.btn-open-cookie-modal').addEventListener('click', function() {
                self.displayCookieModal(false);
            });
            iframe.hide();
        }

        return this;
    };

    function hideIframeSubstitute(iframe) {
        var src = iframe.getAttribute('src') || iframe.data('src');
        var hash = src ? src.hashCode() : null;
        var replaceIframe = getElement('cookie-iframe-' + hash);
        if (replaceIframe) {
            replaceIframe.hide();
            iframe.show();
        }
    }

    window.cookieChoiceManager = new CookieChoiceManager();

    return cookieChoiceManager;
})(this);
