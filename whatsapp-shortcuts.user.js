// ==UserScript==
// @name        Whatsapp Web VIM Shortcuts
// @namespace   Violentmonkey Scripts
// @match       https://web.whatsapp.com/*
// @grant       none
// @version     1.0
// @author      Lippo
// @require     https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.3/mousetrap.min.js
// @description 2/5/2024, 11:08:34 AM
// ==/UserScript==


// https://stackoverflow.com/questions/40091000/simulate-click-event-on-react-element
const mouseClickEvents = ['mousedown', 'click', 'mouseup'];
function simulateMouseClick(element){
  mouseClickEvents.forEach(mouseEventType =>
    element.dispatchEvent(
			new MouseEvent(mouseEventType, {
				view: window,
				bubbles: true,
				cancelable: true,
				buttons: 1
			})
    )
  );
}

// Allow mousetrap to capture esc from textboxes
Mousetrap.prototype.oldStopCallback = Mousetrap.prototype.stopCallback;
Mousetrap.prototype.stopCallback = function(e, element, combo) {
	if (combo === 'esc') {
		return false;
	}
	if (element.contentEditable && element.contentEditable === "true") {
		return true;
	}
	this.oldStopCallback(e, element, combo);
}

// Replace the add event listener to capture a specific handler.
// For the future me: it was something like `l(e)` on `HTMLDocument`
let closeChat = undefined;
let listenersCount = 0;

EventTarget.prototype.addEventListenerBase = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener) {
	if (type === 'keydown') {
		listenersCount += 1;
		if (listenersCount === 6) {
			closeChat = function() {
				console.error('close chat');
				listener(new KeyboardEvent('keydown', {key: 'Escape'}));
			};
		}
	}
	this.addEventListenerBase(type, listener);
};

(function() {
  'use strict';

	const SEARCH_INPUT = 'div.lexical-rich-text-input > div';
	const APP_CONTENT = 'div.app-wrapper-web > ._1jJ70';
	const APP_CONTAINER = 'div.app-wrapper-web';
	const CHAT_LIST = 'div._2A1R8';
	const CHAT = 'div[role="listitem"]';

  function makeWhatsApp() {
		let currentIndex = 0;
		let _container = null;

		return {
			isLoading: function() {
				return this.getSearchInput() == null;
			},
			getSearchInput: function() {
				return document.querySelector(SEARCH_INPUT);
			},
			bind: function(container) {
				_container = container;
			},
			previousConversation: function () {
				const conversations = this.getSortedConversations();
				conversations[currentIndex].querySelector('div._199zF._3j691').style.background = '';
				currentIndex = Math.max(currentIndex - 1, 0);
				conversations[currentIndex].querySelector('div._199zF._3j691').style.background = '#1d1d3e';
			},
			nextConversation: function () {
				const conversations = this.getSortedConversations();
				conversations[currentIndex].querySelector('div._199zF._3j691').style.background = '';
				currentIndex += 1;
				conversations[currentIndex].querySelector('div._199zF._3j691').style.background = '#1d1d3e';
			},
			openCurrentConversation: function() {
				const conversations = this.getSortedConversations();
				simulateMouseClick(conversations[currentIndex].querySelector('div._199zF._3j691'));
				document.querySelector('div#main div[role="textbox"]').focus();
			},
			reset: function() {
				currentIndex = 0;
				const conversations = this.getSortedConversations();
				conversations.forEach(el => {
					el.querySelector('div._199zF._3j691').style.background = '';
				});
			},
			focusSearch: function() {
				document.querySelector('div#side div[role="textbox"]').focus();
			},
			isChatOpen: function() {
				return document.querySelector('div#main div[role="textbox"]') != null;
			},
			isSearchOpen: function() {
				return document.querySelector('div#side div[role="textbox"]').innerText != '\n';
			},
			closeChat,
			closeSearch: function() {
				simulateMouseClick(document.querySelector('div#side span[data-icon="search"]').parentElement.parentElement);
			},
			getSortedConversations: function() {
				function getTransformValue(el) {
					return parseInt(el.style.transform.replace(/\D/g, ''));
				}
				const conversations = Array.from(_container.querySelectorAll(CHAT));
				return conversations.sort((a, b) => getTransformValue(a) - getTransformValue(b));
			}
		};
  };

	function makeStatusBar() {
		function makeHTMLBar() {
			const statusBar = document.createElement("div");
			statusBar.style.alignItems = "center";
			statusBar.style.background = "var(--background-default)";
			statusBar.style.borderTop = "1px solid var(--border-stronger)";
			statusBar.style.bottom = 0;
			statusBar.style.display = "flex";
			statusBar.style.flexDirection = "row";
			statusBar.style.fontFamily = "monospace";
			statusBar.style.fontSize = "18px";
			statusBar.style.height = `40px`;
			statusBar.style.left = 0;
			statusBar.style.paddingLeft = "20px";
			statusBar.style.position = "fixed";
			statusBar.style.right = 0;
			statusBar.style.zIndex = 200;
			statusBar.textContent = "NORMAL";
			return statusBar;
		}

		const statusBar = makeHTMLBar();

		return {
			bind: function(container) {
				container.appendChild(statusBar);
			},
			setStatus(status) {
				if (status === "normal") {
					statusBar.textContent = "NORMAL";
					statusBar.style.background = "var(--background-default)";
					return;
				}

				if (status === "insert") {
					statusBar.textContent = "INSERT";
					statusBar.style.background = "blue";
					return;
				}
				throw Error('Illegal state');
			}
		};
	};


	function onLoading() {
		const whatsApp = makeWhatsApp();
		if (whatsApp.isLoading()) {
			setTimeout(onLoading, 200);
			return;
		}

		const statusBar = makeStatusBar();
		const container = document.querySelector(APP_CONTAINER);
		const prevContent = document.querySelector(APP_CONTENT)
		// Make some room for the new status bar
		prevContent.style.height = `calc(100% - 60px)`;
		statusBar.bind(container);

		const chatListContainer = document.querySelector(CHAT_LIST);
		whatsApp.bind(chatListContainer);

		function onInsertMode() {
			statusBar.setStatus('insert');
			whatsApp.openCurrentConversation();
			whatsApp.reset();
			Mousetrap.reset();
			Mousetrap.bind('esc', (e) => {
				onNormalMode();
				closeChat();
			});
		}

		function onNormalMode() {
			statusBar.setStatus('normal');
			whatsApp.reset();
			Mousetrap.reset();
			Mousetrap.bind(['i', 'enter'], () => onInsertMode());
			Mousetrap.bind('j', () => whatsApp.nextConversation());
			Mousetrap.bind('k', () => whatsApp.previousConversation());
			Mousetrap.bind('esc', () => {
				if (whatsApp.isSearchOpen()) {
					whatsApp.closeSearch();
				} else if (whatsApp.isChatOpen()) {
					whatsApp.closeChat();
				}
				onNormalMode();
			});
			Mousetrap.bind('/', (e) => {
				whatsApp.focusSearch()
				e.preventDefault();
			});
		}
		onNormalMode();
	}

	onLoading();

})();
