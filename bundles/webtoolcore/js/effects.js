$(function() {
    var mapEffects = [
        'ad_overlay_sliceDown',
        'ad_transparent_boxRandom',
        'ad_overlay_foldLeft',
        'ad_transparent_boxRainGrowReverse'
    ];
    $.each(mapEffects, function(index, classname) {
        var effects = classname.split('_');
        $('.' + classname).adipoli({
            startEffect: effects[1],
            hoverEffect: effects[2]
        });
    });

    /*
     * Applies CKEditor fancybox style by wrapping image into <a>
     */
    $(".various").fancybox( {
        padding: 0,
        afterLoad: function() {
            $.extend(this, {
                type: 'html',
                aspectRatio: true,
                content: '<a><img class="fancybox-image" src="' + this.element['0'].src + '"/></a>'
            });
        }
    });

});
