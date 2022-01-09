'use strict';

if (undefined === dataLayer) {
    var dataLayer = [];
}

var onloadGoogleRecaptchaCallback = function() {
    $.each($('div[id^="recaptcha"]'), function() {
        var $this = $(this);

        if (!$this.data('is-captcha-loaded')) {
            $this.attr('data-captcha-id', grecaptcha.render(this, {
                'sitekey': webtool.googleCaptchaApiKey
            }));
            $this.data('is-captcha-loaded', true);
        }
    });
};

function basename(str) {
    return str.split(/[\\/]/).pop();
}

$(function() {
    var ContactFormManager = function(form) {
        var $form = $(form),
            MAX_FILES_COUNT = getMaxFilesCount(),
            MAX_FILE_SIZE = getMaxFileSize(),
            file_counter = 0
        ;

        $form.data('contact-form', this);

        $form.find('select[data-placeholder-enabled="1"]').each(function() {
            this.options[0].disabled = true;
        });

        var showAlert = function (className, message) {
            var $alert = $form.find('p.alert');
            if (!$alert.length) {
                $alert = $('<p class="alert">');
                $form.find('.send-grid').before($alert);
            }
            $alert
                .removeClass('alert-success alert-danger')
                .addClass(className)
                .html(message)
                .fadeIn(500).delay(10000).fadeOut(5000)
            ;
        };

        var setButtonSubmitDisable = function(disable) {
            $form.find('input:submit').prop('disabled', disable);
        };

        var resetForm = function() {
            $form.find('.attachments-list').html('');
            $form.find(':input:visible:not(:submit)').val('');
            file_counter = 0;
            $form.find('.attachments-list').hide();
            $form.find('.input-file .btn-add-attachment').show();
            fileManager.reset();
            $form.get(0).reset();
        };

        function getMaxFilesCount() {
            var maxFiles = $form.find('.input-file').attr('data-max-files-count');

            maxFiles = maxFiles ? parseInt(maxFiles) : 0;

            if (!maxFiles) {
                $form.find('.input-file').hide();
            }

            return maxFiles;
        }

        function getMaxFileSize() {
            var maxFileSize = $form.find('.input-file').attr('data-max-file-size');

            return maxFileSize ? parseInt(maxFileSize) : 5000000;
        }

        function addAttachmentContainer() {
            var attachmentContainers = $form.find('.attachment-container'),
                $attachmentContainer
            ;

            if (attachmentContainers.length) {
                $.each(attachmentContainers, function(index, container) {
                    var $_container = $(container);
                    if ('' === $_container.find('.attachment-label').text()) {
                        $attachmentContainer = $_container;
                    }
                });
            }

            var $attachmentsList = $form.find('.attachments-list'),
                $newAttachment,
                attachmentContent = $attachmentsList.attr('data-prototype');

            if (!$attachmentContainer) {
                $attachmentContainer = $('<div class="attachment-container">');
                attachmentContent = attachmentContent.replace(/__name__/g, ++file_counter);
                $newAttachment = $(attachmentContent);
                $newAttachment.addClass('attachment-label');
                $attachmentContainer.append($newAttachment);
                $attachmentContainer.append('<span class="btn-attachment-remove glyphicon glyphicon-remove" title="Retirer ce fichier"></span>');
                $attachmentsList.append($attachmentContainer);
            }

            return $attachmentContainer;
        }

        function diplayAttachmentContainer($container) {
            $container.find('.btn-attachment-remove').show();
            $container.show();
        }

        var FileManager = function() {
            var files = [];

            var filterFiles = function () {
                files = $(files)
                    .filter(function(index, value) {
                        if (value) {
                            return true;
                        }
                    }).toArray();

                return files;
            };

            this.add = function(file) {
                var filename = file.name, fileExists = false;
                $.each(files, function(index, value) {
                    if (value && filename === value.name) {
                        fileExists = true;
                    }
                });
                if (!fileExists) {
                    files.push(file);
                }

                return filterFiles();
            };

            this.remove = function(file) {
                var filename = 'string' === typeof file ? file : file.name;
                $.each(files, function(index, value) {
                    if (value && filename === value.name) {
                        delete files[index];
                    }
                });

                return filterFiles();
            };

            this.getFiles = function() {
                return filterFiles();
            };

            this.count = function() {
                return this.getFiles().length;
            };

            this.injectIntoFormdata = function(formData) {
                var $attachmentsList = $form.find('.attachments-list'),
                    $prototype = $($attachmentsList.attr('data-prototype')),
                    protoName = $prototype.find('input:file').attr('name'),
                    i = 0
                ;

                $.each(files, function() {
                    formData.append(protoName.replace(/__name__/g, ++i), this, this.name);
                });
            };

            this.reset = function() {
                files = [];
            };
        };

        var fileManager = new FileManager();

        $form
            .on('submit', function() {
                setButtonSubmitDisable(true);
                var matches = this.id.match(/contact-block-configuration-(\d+)/);
                var grecaptchaBox = $('div[id="recaptcha-' + matches[1] + '"]');
                if (!grecaptcha.getResponse(grecaptchaBox.data('captcha-id'))) {
                    setButtonSubmitDisable(false);
                    showAlert('alert-danger', 'Erreur : la captcha n\'a pas été cochée.');

                    return false;
                }

                // For GTM tracking
                dataLayer.push({
                    event: 'formulaire_ok'
                });

                var formData = new FormData($form[0]);

                fileManager.injectIntoFormdata(formData);
                $form.find('.attachment-container input:file').val('');

                $.post({
                    url: $form.attr('action'),
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    beforeSend : function (xhr) {
                        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    },
                    success: function () {
                        showAlert('alert-success', 'Votre message a bien été envoyé.');
                        resetForm();
                    },
                    error: function (xhr, responseType, responseError) {
                        var json = xhr.responseJSON,
                            messages = []
                        ;

                        if (undefined !== json) {
                            try {
                                json = JSON.parse(json);
                                if (json.errors) {
                                    Object.keys(json.errors).forEach(function(key){
                                        if ('attachments' === key) {
                                            $.each(json.errors[key], function(index, error) {
                                                if (error.file && -1 !== messages.indexOf(error.file)) {
                                                    messages.push(error.file);
                                                }
                                            });
                                        } else {
                                            messages.push(json.errors[key]);
                                        }
                                    });

                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        if (!messages.length) {
                            messages.push('Erreur lors de l\'envoi du message.');
                        }

                        showAlert('alert-danger', messages.join('<br />'));
                        grecaptcha.reset();
                        setButtonSubmitDisable(false);
                    }
                });

                return false;
            })
            .on('keypress', ':input', function() {
                setButtonSubmitDisable(false);
            })
            .on('click.input-file', '.input-file .btn-add-attachment', function(event) {
                addAttachmentContainer().find('input:file').click();
            })
            .on('change.input-file', 'input:file', function() {
                var $this = $(this),
                    $container = $this.closest('.attachment-container'),
                    $attachmentsList = $this.closest('.attachments-list')
                ;

                if ('' === this.value) {
                    $container.remove();
                    return;
                }

                $.each(this.files, function(index, file) {
                    if (fileManager.count() >= MAX_FILES_COUNT) {
                        return;
                    }
                    if (file.size > MAX_FILE_SIZE ) {
                        showAlert('alert-danger', 'Le fichier ' + file.name + ' est trop volumineux. Taille maximum : ' + parseInt(MAX_FILE_SIZE/1000000) + ' Mo.');
                        return;
                    }
                    fileManager.add(file);
                    var $currentContainer = addAttachmentContainer();
                    $currentContainer.find('.attachment-label').append(file.name);
                    diplayAttachmentContainer($currentContainer);
                });

                if (fileManager.count() >= MAX_FILES_COUNT) {
                    $this.closest('.input-file').find('.btn-add-attachment').hide();
                    showAlert('alert-danger', '5 fichiers maximum.');
                }

                $attachmentsList.show();
            })
            .on('click.remove-attachment', '.btn-attachment-remove', function() {
                var $this = $(this),
                    $container = $this.closest('.attachment-container'),
                    $attachmentsList = $this.closest('.attachments-list'),
                    nbAttachments = fileManager.count();

                if (nbAttachments <= MAX_FILES_COUNT) {
                    $this.closest('.input-file').find('.btn-add-attachment').show();
                }

                fileManager.remove($container.text());
                $this.closest('.attachment-container').remove();

                if (!nbAttachments) {
                    $attachmentsList.hide();
                }
            })
        ;
    };

    $('body form.contact-block-configuration').each(function() {
        if (!$(this).data('contact-form')) {
            new ContactFormManager(this);
        }
    });

    if ($('div[id^="recaptcha"]').length) {
        $.getScript('https://www.google.com/recaptcha/api.js?onload=onloadGoogleRecaptchaCallback&render=explicit');
    }
});
