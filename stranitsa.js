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
	$.fn.stranitsa.register('init', function(options) {
		return this.each(function() {
			init.call(this, $.extend(true, {}, $.fn.stranitsa.defaults, options));
		});
	});
	$.fn.stranitsa.defaults = {
		width:400,
		height:600,
		animationSpeed:250,
		hasCover:true,
		page:0,
		scaleFactor:3,
		doubleClickTimeout:100,
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
			return $(options.pages[index]).clone();
		}
	};
	var init = function(options) {
		var $self = $(this);
		if(options.hasCover) {
			// create an invisible first page
			$self.prepend($('<div/>').css({width:options.width / 2,height:options.height,backgroundColor:'white'}));
		}
		options.pages = $self.children().each(function() {
			$(this).data('stranitsa-width', $(this).width());
			$(this).data('stranitsa-height', $(this).height());
			var scale = options.width / (2 * $(this).width());
			$(this).scale(scale).css({
				'transform-origin': '0% 0%',
			});
		}).detach();
		$self.addClass('stranitsa');
		var $prevAction = $('<div class="stranitsa-action ' + options.classes.actions.prev + '"/>');
		var $leftPage = makePage(options, options.page);
		var $rightPage = makePage(options, options.page + 1);
		var $nextAction = $('<div class="stranitsa-action ' + options.classes.actions.next + '"/>');
		$self.append($prevAction)
			.append($nextAction)
			.append($leftPage)
			.append($rightPage);
		$self.data('stranitsa', options);
		// render the content
		$self.height(options.height).width(options.width);
		$self.css({position:'relative', overflow:'hidden'});
		$leftPage.css({position:'absolute',top:0,left:0});
		$rightPage.css({position:'absolute',top:0,left:options.width / 2});
		$prevAction.css({zIndex:15}).click(function() {/*prevPage.call($self, options)*/});
		$nextAction.css({zIndex:15}).click(function() {/*nextPage.call($self, options)*/});
		function relativeEventCoordinates(e, parent) {
			var unnormalized = {x:e.pageX - parent.offset().left, y:e.pageY - parent.offset().top};
			var vector = {x:options.width / 2 - unnormalized.x, y:unnormalized.y};
			var distance = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
			var normDistance = Math.min(distance, options.width / 2);
			vector.x *= normDistance / distance;
			vector.y *= normDistance / distance;
			return {x:options.width / 2 - vector.x, y:vector.y};
		}
		function getMidpoint(a, b) {
			return {x:(a.x + b.x) / 2, y:(a.y + b.y) / 2};
		}
		function getSlope(a, b) {
			return (b.y - a.y) / (b.x - a.x);
		}
		function renderEarmark(position) {
			var origin = $self.data('stranitsa-dragging');
			if(origin) {
				var size = options.width;
				var midpoint = getMidpoint(position, origin);
				var slope = -1 / getSlope(position, origin);
				var theta = Math.atan(getSlope(position, origin));
				$self.find("#stranitsa-right-frame").rotate(theta + 'rad').css({
					'transform-origin': '0% 0%',
					'position': 'absolute',
					'left': midpoint.x + size * Math.sin(theta),
					'top': midpoint.y - size * Math.cos(theta),
					width:2 * size,
					height:2 * size
				});
				var dx = position.x - midpoint.x;
				var dy = position.y - midpoint.y;
				var distance = Math.sqrt(dx * dx + dy * dy);
				$self.find("#stranitsa-right-frame").children().show().rotate((dx < 0 ? -theta : theta) + 'rad').css({
					'transform-origin': '0% 0%',
					'position':'absolute',
					left:distance - options.width / 2 * Math.cos(theta),
					top:size + (dx < 0 ? 1 : -1) * options.width / 2 * Math.sin(theta)
				});
				$self.find("#stranitsa-left-frame").rotate(theta + 'rad').css({
					'transform-origin': '0% 0%',
					'position': 'absolute',
					'left': midpoint.x - 2 * size * Math.cos(theta) + size * Math.sin(theta),
					'top': midpoint.y - 2 * size * Math.sin(theta) - size * Math.cos(theta),
					width:2 * size,
					height:2 * size
				});
				$self.find("#stranitsa-left-frame").children().show().rotate((dx < 0 ? theta : -theta) + 'rad').css({
					'transform-origin': '0% 0%',
					'position':'absolute',
					'top':size,
					'left':2 * size - distance
				});
			}
		}
		var animation = null;
		var dragging = false;
		var clickTimer = null;
		var zooming = false;
		$self.mousedown(function(e) {
			if(animation) {
				animation.finish();
			}
			if(clickTimer != null) {
				// double click!
				clearTimeout(clickTimer);
				clickTimer = null;
				if(!zooming) {
					zooming = true;
					$self.css({'transform-origin': '0% 0%'}).animate({scale:options.scaleFactor}, options.animationDuration);
				} else {
					zooming = false;
					$self.css({'position':'relative',top:0,left:0}).animate({scale:1}, options.animationDuration);
				}
			} else {
				clickTimer = setTimeout(function() {
					clickTimer = null;
				}, options.doubleClickTimeout);
				dragging = true;
				var coordinates = relativeEventCoordinates(e, $(this).parent());
				coordinates.x = (coordinates.x > options.width / 2 ? options.width : 0);
				coordinates.y = 0;
				$self.data('stranitsa-dragging', coordinates);
				if(coordinates.x == options.width) {
					options.page += 2;
				} else {
					options.page -= 2;
				}
				var $left = makePage(options, options.page).hide();
				var $right = makePage(options, options.page + 1).hide();
				$self.append($('<div id="stranitsa-right-frame"/>').css({overflow:'hidden','z-index':10}));
				$self.append($('<div id="stranitsa-left-frame"/>').css({overflow:'hidden','z-index':11}));
				$self.find("#stranitsa-left-frame").append($left);
				$self.find("#stranitsa-right-frame").append($right);
			}
			e.preventDefault();
			return false;
		}).mousemove(function(e) {
			if(dragging) {
				renderEarmark(relativeEventCoordinates(e, $(this).parent()));
			} else if(zooming) {
				var width = $self.width() * $self.scale();
				var height = $self.height() * $self.scale();
				var left = e.pageX / $(window).width();
				var top = e.pageY / $(window).height();
				$self.css({position:'absolute', left:left * ($(window).width() - width), top:top * ($(window).height() - height)});
			}
		}).mouseup(function(e) {
			var $parent = $(this).parent();
			function mouseUp() {
				dragging = false;
				var coords = relativeEventCoordinates(e, $parent);
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
						renderEarmark(this);
					},
					complete:function() {
						if(this.x != $self.data('stranitsa-dragging').x) {
							
							$self.children(".stranitsa-page").detach();
							$self.append($self.find("#stranitsa-right-frame").children().rotate(0).css({position:'absolute',top:0,left:options.width / 2}));
							$self.append($self.find("#stranitsa-left-frame").children().rotate(0).css({position:'absolute',top:0,left:0}));
						} else {
							if(this.x == options.width) {
								options.page -= 2;
							} else {
								options.page += 2;
							}
						}
						$self.find("#stranitsa-right-frame, #stranitsa-left-frame").remove();
						$self.data('stranitsa-dragging', null);
						animation = null;
					}
				});
			}
			if(clickTimer) {
				// we recently clicked down
				clearTimeout(clickTimer);
				clickTimer = setTimeout(function() { mouseUp(); clickTimer = null; }, options.doubleClickTimeout);
			} else {
				mouseUp();
			}
		});
	};
	var makePage = function(options, index) {
		var content = options.render.call(null, index, options);
		var $page = $('<div class="stranitsa-page ' + (index % 2 == 0 ? options.classes.pages.left : options.classes.pages.right) + '"/>').css({backgroundColor:'white', width:options.width / 2}).html(content);
		return $page;
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
    // Updated 2010.11.06
    // Updated 2012.10.13 - Firefox 16 transform style returns a matrix rather than a string of transform functions.  This broke the features of this jQuery patch in Firefox 16.  It should be possible to parse the matrix for both scale and rotate (especially when scale is the same for both the X and Y axis), however the matrix does have disadvantages such as using its own units and also 45deg being indistinguishable from 45+360deg.  To get around these issues, this patch tracks internally the scale, rotation, and rotation units for any elements that are .scale()'ed, .rotate()'ed, or animated.  The major consequences of this are that 1. the scaled/rotated element will blow away any other transform rules applied to the same element (such as skew or translate), and 2. the scaled/rotated element is unaware of any preset scale or rotation initally set by page CSS rules.  You will have to explicitly set the starting scale/rotation value.
    
    function initData($el) {
        var _ARS_data = $el.data('_ARS_data');
        if (!_ARS_data) {
            _ARS_data = {
                rotateUnits: 'deg',
                scale: 1,
                rotate: 0
            };
            
            $el.data('_ARS_data', _ARS_data);
        }
        
        return _ARS_data;
    }
    
    function setTransform($el, data) {
        $el.css('transform', 'rotate(' + data.rotate + data.rotateUnits + ') scale(' + data.scale + ',' + data.scale + ')');
    }
    
    $.fn.rotate = function (val) {
        var $self = $(this), m, data = initData($self);
                        
        if (typeof val == 'undefined') {
            return data.rotate + data.rotateUnits;
        }
        
        m = val.toString().match(/^(-?\d+(\.\d+)?)(.+)?$/);
        if (m) {
            if (m[3]) {
                data.rotateUnits = m[3];
            }
            
            data.rotate = m[1];
            
            setTransform($self, data);
        }
        
        return this;
    };
    
    // Note that scale is unitless.
    $.fn.scale = function (val) {
        var $self = $(this), data = initData($self);
        
        if (typeof val == 'undefined') {
            return data.scale;
        }
        
        data.scale = val;
        
        setTransform($self, data);
        
        return this;
    };

    // fx.cur() must be monkey patched because otherwise it would always
    // return 0 for current rotate and scale values
    var curProxied = $.fx.prototype.cur;
    $.fx.prototype.cur = function () {
        if (this.prop == 'rotate') {
            return parseFloat($(this.elem).rotate());
            
        } else if (this.prop == 'scale') {
            return parseFloat($(this.elem).scale());
        }
        
        return curProxied.apply(this, arguments);
    };
    
    $.fx.step.rotate = function (fx) {
        var data = initData($(fx.elem));
        $(fx.elem).rotate(fx.now + data.rotateUnits);
    };
    
    $.fx.step.scale = function (fx) {
        $(fx.elem).scale(fx.now);
    };
    
    /*
    
    Starting on line 3905 of jquery-1.3.2.js we have this code:
    
    // We need to compute starting value
    if ( unit != "px" ) {
        self.style[ name ] = (end || 1) + unit;
        start = ((end || 1) / e.cur(true)) * start;
        self.style[ name ] = start + unit;
    }
    
    This creates a problem where we cannot give units to our custom animation
    because if we do then this code will execute and because self.style[name]
    does not exist where name is our custom animation's name then e.cur(true)
    will likely return zero and create a divide by zero bug which will set
    start to NaN.
    
    The following monkey patch for animate() gets around this by storing the
    units used in the rotation definition and then stripping the units off.
    
    */
    
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
