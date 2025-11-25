(function ($) {
	"use strict";
	$(".tj_interactive_image_item").click(function () {
		$(".tj_interactive_image_item").each(function () {
			$(this).removeClass("on");
		});

		if (!$(this).closest(".tj_interactive_image_item").hasClass("on")) {
			$(this)
				.closest(".tj_interactive_image")
				.find(".tj_interactive_image_item.on")
				.removeClass("on");
			$(this).closest(".tj_interactive_image_item").addClass("on");
		} else {
			// $( this ).parent().removeClass( 'on' );
			$(this).closest(".tj_interactive_image_item").removeClass("on");
		}

		var item = $(this);
		var item_id = item.data("id");
		$(".tj_interactive_image_item_dot").each(function () {
			var item_dot = $(this);
			var item_dot_id = item_dot.data("id");
			$(this).removeClass("tj_interactive_image_item_dot_on");

			if (item_id == item_dot_id) {
				$(this).addClass("tj_interactive_image_item_dot_on");
			}
		});

		if ($(window).width() < 768) {
			var jump_element = $(".tj_interactive_image_item_dot")
				.andSelf()
				.find('[data-id="' + item_id + '"]');
			var new_position = $(jump_element).offset().top;
			$("html, body")
				.stop()
				.animate({ scrollTop: new_position - 150 }, 500);
		}
	});

	$(".tj_interactive_image").each(function () {
		if ($(this).data("closed") != "closed") {
			//$( this ).find( '.tj_interactive_image_item' ).first().click();
			$(this).find(".tj_interactive_image_item").first().addClass("on");
		}
		tj_inner_image_dots($(this));
	});

	$(document).ready(function () {
		$(".tj_interactive_image_item_dot").on("click", function () {
			var item_dot = $(this);
			var item_dot_id = item_dot.data("id");

			$(".tj_interactive_image_item_dot").each(function () {
				$(this).removeClass("tj_interactive_image_item_dot_on");
			});

			$(".tj_interactive_image_item").each(function () {
				$(this).removeClass("on");
				var item_id = $(this).data("id");
				if (item_id == item_dot_id) {
					$(this).addClass("on");
					item_dot.addClass("tj_interactive_image_item_dot_on");
				}
			});

			if ($(window).width() < 768) {
				var jump_element = $(
					'.tj_interactive_image_item[data-id="' + item_dot_id + '"]'
				);
				var new_position = $(jump_element).offset().top;
				$("html, body").animate(
					{ scrollTop: parseInt(new_position) - 80 },
					500
				);
			}
		});

		$(".tj_interactive_image_item_dot").each(function () {
			var item = $(this);
			var item_title = item.data("title");
			var item_desc = item.data("desc");
			$(this).append(
				'<span class="tj_interactive_image_item_dot_tooltip">' +
					item_title +
					"<span>" +
					item_desc +
					"</span></span>"
			);
		});
	});

	function tj_inner_image_dots(image) {
		var closed = image.data("closed");
		var i = 1;

		image.find(".tj_interactive_image_item").each(function () {
			var item = $(this);
			var img_item_x = item.data("x");
			var img_item_y = item.data("y");
			var img_item_number = item.data("number");
			var img_item_id = item.data("id");
			var img_item_title = item.data("title");
			var img_item_desc = item.data("desc");

			if (img_item_x != "" && img_item_y != "") {
				var size = "40px";
				var klasa =
					i == 1 && closed != "closed"
						? " tj_interactive_image_item_dot_on"
						: "";
				image.find(".tj_image span").append(
					$(
						'<div class="tj_interactive_image_item_dot' +
							klasa +
							'" data-id="' +
							img_item_id +
							'"  data-title="' +
							img_item_title +
							'"  data-desc="' +
							img_item_desc +
							'" >' +
							img_item_number +
							"</div>"
					).css({
						position: "absolute",
						top: img_item_x + "%",
						left: img_item_y + "%",
						width: size,
						height: size,
					})
				);
			}
			i++;
		});
	}
})(jQuery);
