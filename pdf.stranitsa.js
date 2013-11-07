(function($) {
	$.fn.stranitsa.register('pdf', function(path, options) {
		var pdf;
		options = $.extend(true, {}, $.fn.stranitsa.defaults, options);
		PDFJS.disableWorker = true;
		var $target = this;
		PDFJS.getDocument(path).then(function(pdf) {
			(function renderQueue(index, onComplete) {
				if(index > pdf.numPages) {
					onComplete();
				} else {
					pdf.getPage(index).then(function(page) {
						var $page = $("<div/>");
						renderPage($page, page, 612, function() {
							$target.append($page);
							renderQueue(index + 1, onComplete);
						});
					});
				}
			})(1, function onComplete() {
				$target.stranitsa(options);
			});
		}, function(message, exception) {
			console.log(message);
			console.log(exception);
		});
	});
	function renderPage($target, page, width, callback) {
		var viewport = page.getViewport(width / 612);
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
		$target.css("height", canvas.height + "px").css("width", canvas.width + "px");
		
	}
}(jQuery));