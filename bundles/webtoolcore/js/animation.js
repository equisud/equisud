/**
 * @param animationId
 * @param newStatus
 */
$.fn.toggleAnimation = function(animationId, newStatus) {
    var animations = this.css('animation').split(',');
    var finalAnimations = [];
    animations.forEach(function(animation) {
        if (-1 !== animation.split(' ').indexOf('animation-' + animationId)) {
            if (newStatus) {
                animation = animation.replace('running', newStatus).replace('paused', newStatus);
            } else {
                var isRunning = -1 !== animation.indexOf('running');
                animation.replace(isRunning ? 'running' : 'paused', isRunning ? 'paused' : 'running');
            }
        }
        finalAnimations.push(animation.trim());
    });
    this.css('animation', finalAnimations.join(','));
};

/**
 * @returns {number}
 */
$.fn.getVisiblePercentage = function() {
    var scrollTop = $(window).scrollTop(),
        elementHeight = this.height(),
        elementTop = this.offset().top,
        elementPositionFromTop = scrollTop - elementTop,
        topVisible = (window.innerHeight + elementPositionFromTop);

    if (topVisible > 0) {
        if (elementPositionFromTop < 0) {
            return (topVisible >= elementHeight) ? 100 : topVisible*100/elementHeight;
        } else if (elementPositionFromTop - elementHeight <= 0) {
            return 100 - elementPositionFromTop*100/elementHeight;
        }
    }

    return 0;
};
