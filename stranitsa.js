(function($) {
	$.fn.stranitsa = function(action, options) {
		if(typeof action != 'string') {
			options = action;
			action = 'init';
		}
		switch(action) {
			case 'init':
				return this.each(function() {
					init.call(this, $.extend(true, {}, $.fn.stranitsa.defaults, options));
				});
			default:
				console.log('Invalid action!');
				return this;
		}
	};
	$.fn.stranitsa.defaults = {
		width:400,
		height:300,
		hasCover:true,
		page:0,
		classes:{
			actions: {
				next:'stranitsa-action-next',
				prev:'stranitsa-action-prev'
			},
			pages: {
				left:'stranitsa-page-left',
				right:'stranitsa-page-right'
			}
		}
	};
	var init = function(options) {
		var $self = $(this);
		if(options.hasCover) {
			// create an invisible first page
			$self.prepend('<div/>');
		}
		options.pages = $self.children().height(options.height).width(options.width).detach();
		$self.addClass('stranitsa');
		var $prevAction = $('<div class="stranitsa-action ' + options.classes.actions.prev + '"/>');
		var $leftPage = makePage(options, options.page);
		var $rightPage = makePage(options, options.page + 1);
		var $nextAction = $('<div class="stranitsa-action ' + options.classes.actions.next + '"/>');
		$self.append($prevAction)
			.append($leftPage)
			.append($rightPage)
			.append($nextAction);
		$self.data('stranitsa', options);
		// render the content
		$self.height(options.height).width(options.width);
		$self.css('position', 'relative');
		$leftPage.css({position:'absolute',top:0,left:0,width:options.width / 2});
		$rightPage.css({position:'absolute',top:0,left:options.width / 2,width:options.width / 2});
		$prevAction.click(function() {prevPage.call($self, options)});
		$nextAction.click(function() {nextPage.call($self, options)});
	};
	var makePage = function(options, index) {
		return $('<div class="stranitsa-page ' + (index % 2 == 0 ? options.classes.pages.left : options.classes.pages.right) + '"/>').html(options.pages[index]).css({backgroundColor:'white', boxShadow:'inset ' + (index % 2 == 0 ? '-' : '') + '25px 0 25px -25px #555'});
	};
	var prevPage = function(options) {
		options.page -= 2;
		$prevLeftPage = makePage(options, options.page).css({position:'absolute',top:0,left:0,width:0});
		$prevRightPage = makePage(options, options.page + 1).css({position:'absolute',top:0,left:0,width:0});
		$(this).append($prevLeftPage).append($prevRightPage);
		animate(options, $prevLeftPage, $prevRightPage);
	};
	var nextPage = function(options) {
		options.page += 2;
		$nextLeftPage = makePage(options, options.page).css({position:'absolute',top:0,left:options.width,width:0});
		$nextRightPage = makePage(options, options.page + 1).css({position:'absolute',top:0,left:options.width,width:0});
		$(this).append($nextLeftPage).append($nextRightPage);
		animate(options, $nextLeftPage, $nextRightPage);
	};
	var animate = function(options, $left, $right) {
		$left.animate({
			left:0,
			width:options.width / 2
		});
		$right.animate({
			left:options.width / 2,
			width:options.width / 2
		});
	};
}(jQuery));