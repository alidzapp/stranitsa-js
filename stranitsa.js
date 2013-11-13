(function($) {	
	var handlers = {};
	$.fn.stranitsa = function(action, options) {
		if(typeof action != 'string') {
			options = action;
			action = 'init';
		}
		handlers[action].call(this, options);
	};
	$.fn.stranitsa.register = function(handle, callback) {
		handlers[handle] = callback;
	};
	$.fn.stranitsa.register('preload', function(options) {
		return this.each(function() {
			preload.call(this, $.extend(true, {}, $.fn.stranitsa.defaults, options));
		});
	});
	$.fn.stranitsa.register('init', function(options) {
		return this.each(function() {
			init.call(this, $.extend(true, {}, $.fn.stranitsa.defaults, options));
		});
	});
	$.fn.stranitsa.defaults = {
		width:800,
		height:0,
		animationSpeed:250,
		hasCover:true,
		page:0,
		scaleFactor:2,
		doubleClickTimeout:200,
		animationDuration:250,
		classes:{
			actions: {
				next:'stranitsa-action-next',
				prev:'stranitsa-action-prev'
			},
			pages: {
				left:'stranitsa-page-left',
				right:'stranitsa-page-right'
			}
		},
		render:function(index, options) {
			var defer = $.Deferred();
			if(options.pages[index]) {
				defer.resolve($(options.pages[index]));
			} else {
				defer.reject();
			}
			return defer;
		}
	};
	var preload = function(options) {
		$(this).addClass('stranitsa').data('stranitsa', options).width(options.width);
	};
	var init = function(options) {
		var $self = $(this);
		if(!$self.hasClass('stranitsa')) {
			preload.call(this, options);
		}
		options.pages = $self.height(options.height).children().each(function() {
			$(this).data('stranitsa-width', $(this).width());
			$(this).data('stranitsa-height', $(this).height());
			var scale = options.width / (2 * $(this).width());
			$(this).scale(scale);
			$self.height(Math.max($self.height(), scale * $(this).height()));
		}).detach();
		if(options.hasCover) {
			options.pages.splice(0, 0, null);
		}
		var $leftPage = makePage(options, options.page).translate(0, 0);
		var $rightPage = makePage(options, options.page + 1).translate(options.width / 2, 0);
		$self.append($leftPage).append($rightPage);
		var animation = null;
		var dragging = false;
		var clickTimer = null;
		var zooming = null;
		function makePage(options, index) {
			var $page = $('<div class="stranitsa-page ' + (index % 2 == 0 ? options.classes.pages.left : options.classes.pages.right) + '"/>').css('background-color','white');
			options.render(index, options).done(function(content) {
				var ratio = options.width / (2 * content.data('stranitsa-width'));
				$page.width(options.width / 2).height(content.data('stranitsa-height') * ratio).html(content);
				$self.height(Math.max($self.height(), $page.height()));
			}).fail(function() {
				$page.width(options.width / 2).height($self.height());
				$page.removeClass('stranitsa-page').addClass('stranitsa-nonce');
			});
			return $page;
		};
		function relativeEventCoordinates(e, parent) {
			var unnormalized = {x:e.pageX - parent.offset().left, y:e.pageY - parent.offset().top};
			var origin = {x:(options.width / 2) * $self.scale(), y:0};
			var vector = {x:unnormalized.x - origin.x, y:unnormalized.y - origin.y};
			var distance = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
			var normDistance = Math.min(distance, options.width * $self.scale() / 2);
			vector.x *= normDistance / distance;
			vector.y *= normDistance / distance;
			return {x:(vector.x + origin.x) / $self.scale(), y:Math.max(0, vector.y / $self.scale())};
		}
		function getMidpoint(a, b) {
			return {x:(a.x + b.x) / 2, y:(a.y + b.y) / 2};
		}
		function getSlope(a, b) {
			return (b.y - a.y) / (b.x - a.x);
		}
		function renderPage(index) {
			var page = Math.floor(index / 2) * 2;
			if(page == options.page) {
				return;
			}
			renderFrames(page);
			if(page < options.page) {
				animation = $({x:0, y:0});
				target = $({x:options.width, y:0});
			} else {
				animation = $({x:options.width, y:0});
				target = $({x:0, y:0});
			}
			animation.animate(target, {
				duration:options.animationDuration,
				step:function() {
					renderEarmark(this);
				},
				complete:function() {
					detachFrames();
					animation = null;
				}
			});
		}
		function detachFrames(replace) {
			if(replace) {
				$self.children(".stranitsa-page, .stranitsa-nonce").detach();
				$self.append($self.find("#stranitsa-right-frame").children().rotate(0).translate(options.width / 2, 0));
				$self.append($self.find("#stranitsa-left-frame").children().rotate(0).translate(0, 0));
			}
			$self.find("#stranitsa-right-frame, #stranitsa-left-frame").detach();
		}
		function renderFrames(index) {
			var $leftFrame = $('<div id="stranitsa-left-frame"/>');
			var $rightFrame = $('<div id="stranitsa-right-frame"/>');
			$self.append($rightFrame.css({overflow:'hidden','z-index':10}));
			$self.append($leftFrame.css({overflow:'hidden','z-index':11}));
			var $leftPage = makePage(options, options.page).hide();
			var $rightPage = makePage(options, options.page + 1).hide();
			$leftFrame.append($leftPage);
			$rightFrame.append($rightPage);
			if($leftPage.hasClass('stranitsa-nonce')) {
				$leftFrame.css('background-color', 'white');
			}
			if($rightPage.hasClass('stranitsa-nonce')) {
				$rightFrame.css('background-color', 'white');
			}
		}
		function renderEarmark(position) {
			if(origin = $self.data('stranitsa-dragging')) {
				var size = options.width;
				var midpoint = getMidpoint(position, origin);
				var theta = Math.atan(getSlope(position, origin));
				var dx = position.x - midpoint.x;
				var dy = position.y - midpoint.y;
				var distance = Math.sqrt(dx * dx + dy * dy);
				$self.find("#stranitsa-right-frame").rotate(theta + 'rad').translate(
					midpoint.x + size * Math.sin(theta),
					midpoint.y - size * Math.cos(theta)
				).width(2 * size).height(2 * size);
				$self.find("#stranitsa-right-frame").children().show().rotate(dx < 0 ? -theta : theta).translate(
					distance - options.width / 2 * Math.cos(theta),
					size + (dx < 0 ? 1 : -1) * options.width / 2 * Math.sin(theta)
				);
				$self.find("#stranitsa-left-frame").rotate(theta + 'rad').translate(
					midpoint.x - 2 * size * Math.cos(theta) + size * Math.sin(theta),
					midpoint.y - 2 * size * Math.sin(theta) - size * Math.cos(theta)
				).width(2 * size).height(2 * size);
				$self.find("#stranitsa-left-frame").children().show().rotate(dx < 0 ? theta : -theta).translate(
					2 * size - distance, size
				);
			}
		}
		function zoomTo(scale, x, y) {
			if(scale == 1) {
				clearZoom();
			} else {
				$self.data('stranitsa-scale', scale).finish();
				$self.animate($.extend({scale:scale}, getTranslation(x, y, scale)), options.animationDuration);
			}
		}
		function getTranslation(x, y, scale) {
			scale = scale || $self.scale();
			var width = $self.width() * scale;
			var height = $self.height() * scale;
			var trans = {};
			if(width >= $(window).width()) {
				var left = (x / $(window).width()) * 1.5 - 0.25;
				trans.translateX = left * ($(window).width() - width);
			} else {
				trans.translateX = ($(window).width() - width) / 2;
			}
			if(height >= $(window).height()) {
				var top = (y / $(window).height()) * 1.5 - 0.25;
				trans.translateY = top * ($(window).height() - height);
			} else {
				trans.translateY = ($(window).height() - height) / 2;
			}
			console.log(width, $(window).width());
			return trans;
		}
		function clearZoom() {
			$self.animate({scale:1,translateY:zooming.top,translateX:zooming.left}, options.animationDuration);
			zooming = null;
		}
		$self.mousedown(function(e) {
			if(animation) {
				animation.finish();
			}
			if(clickTimer != null) {
				clearTimeout(clickTimer);
				clickTimer = null;
				if(!zooming) {
					zooming = $self.position();
					zoomTo(options.scaleFactor, e.pageX, e.pageY);
				} else {
					clearZoom();
				}
				e.preventDefault();
				return false;
			} else {
				clickTimer = setTimeout(function() {
					clickTimer = null;
				}, options.doubleClickTimeout);
				if(!zooming) {
					var coordinates = relativeEventCoordinates(e, $(this));
					coordinates.x = (coordinates.x > options.width / 2 ? options.width : 0);
					coordinates.y = 0;
					if(coordinates.x == options.width) {
						if(options.page + 2 < options.pages.length) {
							options.page += 2;
						} else {
							return;
						}
					} else {
						if(options.page >= 2) {
							options.page -= 2;
						} else {
							return;
						}
					}
					dragging = true;
					$self.data('stranitsa-dragging', coordinates);
					renderFrames(options.page);
					e.preventDefault();
					return false;
				}
			}
		}).mousemove(function(e) {
			if(dragging) {
				renderEarmark(relativeEventCoordinates(e, $self));
			} else if(zooming) {
				var trans = getTranslation(e.pageX, e.pageY);
				$self.css('position', 'fixed').translate(trans.translateX, trans.translateY);
			}
		}).mouseup(function(e) {
			function mouseUp() {
				dragging = false;
				var coords = relativeEventCoordinates(e, $self);
				var target;
				if($self.data('stranitsa-dragging').x == options.width) {
					target = (coords.x > options.width / 2 && clickTimer == null ? $self.data('stranitsa-dragging') : {x:0, y:0});
				} else {
					target = (coords.x < options.width / 2 && clickTimer == null ? $self.data('stranitsa-dragging') : {x:options.width, y:0});
				}
				animation = $(coords);
				animation.animate(target, {
					duration:options.animationDuration,
					step:function() {
						renderEarmark(this)
					},
					complete:function() {
						detachFrames(this.x != $self.data('stranitsa-dragging').x);
						if(this.x == $self.data('stranitsa-dragging').x) {
							if(this.x == options.width) {
								options.page -= 2;
							} else {
								options.page += 2;
							}
						}
						$self.data('stranitsa-dragging', null);
						animation = null;
					}
				});
			}
			if(dragging) {
				if(clickTimer) {
					clearTimeout(clickTimer);
					clickTimer = setTimeout(function() { mouseUp(); clickTimer = null; }, options.doubleClickTimeout);
				} else {
					mouseUp();
				}
			}
		}).mousewheel(function(e, delta) {
			if(zooming) {
				zoomTo(Math.max(1, $self.data('stranitsa-scale') + delta / 4), e.pageX, e.pageY);
				e.preventDefault();
				return false;
			} else if(delta > 0) {
				zooming = $self.position();
				zoomTo(options.scaleFactor);
				e.preventDefault();
				return false;
			}
		});
	};
}(jQuery));

/*!
/**
 * Monkey patch jQuery 1.3.1+ to add support for setting or animating CSS
 * scale and rotation independently.
 * https://github.com/zachstronaut/jquery-animate-css-rotate-scale
 * Released under dual MIT/GPL license just like jQuery.
 * 2009-2012 Zachary Johnson www.zachstronaut.com
 */
(function ($) {
    function initData($el) {
        var _ARS_data = $el.data('_ARS_data');
        if (!_ARS_data) {
            _ARS_data = {
                rotateUnits: 'rad',
                scale: 1,
                rotate: 0,
                translate: {x:0, y:0}
            };
            $el.data('_ARS_data', _ARS_data);
        }
        return _ARS_data;
    }
    function setTransform($el, data) {
        $el.css('transform', 'translate3d(' + data.translate.x + 'px, ' + data.translate.y + 'px, 0) rotate(' + data.rotate + data.rotateUnits + ') scale(' + data.scale + ',' + data.scale + ')')
			.css({position:'absolute',left:0,top:0,'transform-origin': '0% 0%'});
    }
    $.fn.rotate = function (val) {
        var $self = $(this), m, data = initData($self);
        if (typeof val == 'undefined') {
            return data.rotate + data.rotateUnits;
        }
        m = val.toString().match(/^(-?\d+(\.\d+)?)(.+)?$/);
        if (m) {
            if (m[3]) { data.rotateUnits = m[3] }
            data.rotate = m[1];
            setTransform($self, data);
        }
        return this;
    };
    $.fn.scale = function (val) {
        var $self = $(this), data = initData($self);
        if (typeof val == 'undefined') {
            return data.scale;
        }
        data.scale = val;
        setTransform($self, data);
        return this;
    };
	$.fn.translate = function(x, y) {
		var $self = $(this), data = initData($self);
		if(typeof x == 'undefined') {
			return data.translate;
		}
		data.translate = {x:x, y:y};
		setTransform($self, data);
		return this;
	};
    var curProxied = $.fx.prototype.cur;
    $.fx.prototype.cur = function () {
        if (this.prop == 'rotate') {
            return parseFloat($(this.elem).rotate());
        } else if (this.prop == 'scale') {
            return parseFloat($(this.elem).scale());
        } else if (this.prop == 'translateX') {
			return $(this.elem).translate().x;
        } else if(this.prop == 'translateY') {
			return $(this.elem).translate().y;
        }
        return curProxied.apply(this, arguments);
    };
    $.fx.step.rotate = function (fx) {
        var data = initData($(fx.elem));
        $(fx.elem).rotate(fx.now + data.rotateUnits);
    };
    $.fx.step.scale = function (fx) { $(fx.elem).scale(fx.now) };
    $.fx.step.translateX = function(fx) { $(fx.elem).translate(fx.now, $(fx.elem).translate().y) };
    $.fx.step.translateY = function(fx) { $(fx.elem).translate($(fx.elem).translate().x, fx.now) };
    var animateProxied = $.fn.animate;
    $.fn.animate = function (prop) {
        if (typeof prop['rotate'] != 'undefined') {
            var $self, data, m = prop['rotate'].toString().match(/^(([+-]=)?(-?\d+(\.\d+)?))(.+)?$/);
            if (m && m[5]) {
                $self = $(this);
                data = initData($self);
                data.rotateUnits = m[5];
            }
            
            prop['rotate'] = m[1];
        }
        
        return animateProxied.apply(this, arguments);
    };
})(jQuery);

/*! Copyright (c) 2013 Brandon Aaron (http://brandon.aaron.sh)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version: 3.1.4
 *
 * Requires: 1.2.2+
 */

(function (factory) {
    if ( typeof define === 'function' && define.amd ) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'];
    var toBind = 'onwheel' in document || document.documentMode >= 9 ? ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'];
    var lowestDelta, lowestDeltaXY;

    if ( $.event.fixHooks ) {
        for ( var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    $.event.special.mousewheel = {
        setup: function() {
            if ( this.addEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.addEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = handler;
            }
        },

        teardown: function() {
            if ( this.removeEventListener ) {
                for ( var i = toBind.length; i; ) {
                    this.removeEventListener( toBind[--i], handler, false );
                }
            } else {
                this.onmousewheel = null;
            }
        }
    };

    $.fn.extend({
        mousewheel: function(fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },

        unmousewheel: function(fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent   = event || window.event,
            args       = [].slice.call(arguments, 1),
            delta      = 0,
            deltaX     = 0,
            deltaY     = 0,
            absDelta   = 0,
            absDeltaXY = 0,
            fn;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta; }
        if ( orgEvent.detail )     { delta = orgEvent.detail * -1; }

        // At a minimum, setup the deltaY to be delta
        deltaY = delta;

        // Firefox < 17 related to DOMMouseScroll event
        if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
            deltaY = 0;
            deltaX = delta * -1;
        }

        // New school wheel delta (wheel event)
        if ( orgEvent.deltaY ) {
            deltaY = orgEvent.deltaY * -1;
            delta  = deltaY;
        }
        if ( orgEvent.deltaX ) {
            deltaX = orgEvent.deltaX;
            delta  = deltaX * -1;
        }

        // Webkit
        if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY; }
        if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = orgEvent.wheelDeltaX * -1; }

        // Look for lowest delta to normalize the delta values
        absDelta = Math.abs(delta);
        if ( !lowestDelta || absDelta < lowestDelta ) { lowestDelta = absDelta; }
        absDeltaXY = Math.max(Math.abs(deltaY), Math.abs(deltaX));
        if ( !lowestDeltaXY || absDeltaXY < lowestDeltaXY ) { lowestDeltaXY = absDeltaXY; }

        // Get a whole value for the deltas
        fn     = delta > 0 ? 'floor' : 'ceil';
        delta  = Math[fn](delta  / lowestDelta);
        deltaX = Math[fn](deltaX / lowestDeltaXY);
        deltaY = Math[fn](deltaY / lowestDeltaXY);

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

}));

