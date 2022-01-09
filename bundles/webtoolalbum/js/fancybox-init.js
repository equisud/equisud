$(function() {

    $(".album-block-configuration .fancybox").fancybox({
        padding: 0,
        beforeLoad: function () {
            this.link = $(this.element).prop('href');
            var title = $.parseHTML($(this.element).attr('title'));
            this.title = $(title).text();
        },
        afterLoad: function() {
            var title = this.title ? ' title="' + this.title + '"' : '';
            $.extend(this, {
                type: 'html',
                content: '<a href="' + this.link + '"><img class="fancybox-image" src="' + this.href + '"' + title + '/></a>'
            });
        }
    });

});
