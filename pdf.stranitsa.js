(function($) {
	$.fn.stranitsa.pdf = function(path, options) {
		PDFJS.getDocument(path).then(function(pdf) {
			// then render
			for(var i = 1; i <= pdf.numPages; i++) {
				var $page = $("<div/>");
				pdf.getPage(i).then(function(page){ renderPage($target, page) });
				target.append($page);
			}
		});
		// then init
		//this.stranitsa(options);
	};
	function renderPage($target, page) {
		var viewport = page.getViewport(scale);
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
		var outputScale = getOutputScale();
		if (outputScale.scaled) {
			var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' +
				(1 / outputScale.sy) + ')';
				CustomStyle.setProp('transform', canvas, cssScale);
				CustomStyle.setProp('transformOrigin', canvas, '0% 0%');
			if ($textLayerDiv.get(0)) {
				CustomStyle.setProp('transform', $textLayerDiv.get(0), cssScale);
				CustomStyle.setProp('transformOrigin', $textLayerDiv.get(0), '0% 0%');
			}
		}
		context._scaleX = outputScale.sx;
		context._scaleY = outputScale.sy;
		if (outputScale.scaled) {
			context.scale(outputScale.sx, outputScale.sy);
		}
		$pdfContainer.append($textLayerDiv);
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
			page.render(renderContext);
		});
		$target.css("height", canvas.height + "px").css("width", canvas.width + "px");
		$target.append($canvas);
	}
}(jQuery));