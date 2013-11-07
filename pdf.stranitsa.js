(function($) {
	$.fn.stranitsa.register('pdf', function(path, options) {
		var pdf;
		options = $.extend(true, {}, $.fn.stranitsa.defaults, options);
		PDFJS.disableWorker = true;
		var $target = this;
		var $progress = $("<div id='stranitsa-progress'/>");
		
		var $pages = {};
		
		options.render = function(index, options) {
			var defer = $.Deferred();
			function resolve($page) {
				var scale = options.width / (2 * $page.width());
				$page.scale(scale).css({
					'transform-origin': '0% 0%',
				});
				defer.resolve($page);
			}
			if(index in $pages) {
				resolve($pages[index]);
			} else {
				pdf.getPage(index + 1).then(function(page) {
					var $page = $("<div/>");
					renderPage($page, page, $(window).width, function() {
						resolve($pages[index] = $page);
					});
				});
			}
			return defer;
		};
		PDFJS.getDocument(path).then(function(p) {
			pdf = p;
			for(var i = 0; i < pdf.numPages; i++) {
				$target.append($("<div/>"));
			}
			$target.stranitsa(options);
			(function renderQueue(index) {
				if(index <= pdf.numPages) {
					if(index - 1 in $pages) {
						renderQueue(index + 1);
					} else {
						pdf.getPage(index).then(function(page) {
							var $page = $("<div/>");
							renderPage($page, page, $(window).width, function() {
								$pages[index - 1] = $page;
								renderQueue(index + 1);
							});
						});
					}
				}
			})(1);
		}, function(message, exception) {
			console.log(message);
			console.log(exception);
		});
	});
	function renderPage($target, page, width, callback) {
		var viewport = page.getViewport(1);
		var $canvas = $("<canvas></canvas>");
		var canvas = $canvas.get(0);
		var context = canvas.getContext("2d");
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		var canvasOffset = $canvas.offset();
		var $textLayerDiv = jQuery("<div />")
			.addClass("textLayer")
			.css("height", viewport.height + "px")
			.css("width", viewport.width + "px")
			.offset({
				top: canvasOffset.top,
				left: canvasOffset.left
			});
		
		/*var cssScale = 'scale(' + (1 / width) + ', ' +
			(1 / height) + ')';
			CustomStyle.setProp('transform', canvas, cssScale);
			CustomStyle.setProp('transformOrigin', canvas, '0% 0%');
		if ($textLayerDiv.get(0)) {
			CustomStyle.setProp('transform', $textLayerDiv.get(0), cssScale);
			CustomStyle.setProp('transformOrigin', $textLayerDiv.get(0), '0% 0%');
		}
		context._scaleX = width;
		context._scaleY = height;
		context.scale(width, height);*/
		//$target.append($textLayerDiv);
		
		page.getTextContent().then(function (textContent) {
			var textLayer = new TextLayerBuilder({
				textLayerDiv: $textLayerDiv.get(0),
				pageIndex: 0
			});
			textLayer.setTextContent(textContent);
			var renderContext = {
				canvasContext: context,
				viewport: viewport,
				textLayer: textLayer
			};
			page.render(renderContext).then(function() {
				$target.append($('<img/>', {src: canvas.toDataURL('image/png')}));
				callback();
			});
		});
		$target.css("width", canvas.width);
		
	}
}(jQuery));