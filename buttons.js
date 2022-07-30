function addCopyButton() {
  var textarea = $('<textarea id="leet-compete-copy"></textarea>')
    .appendTo('body')
    .hide();
  $('<a>Copy LeetCompete Source</a>')
    .addClass('btn btn-default css-ftn10w-BaseButtonComponent')
    .css('margin', '10px 5px')
    .on('click', function() {
      textarea.show(); // Copy fails when textarea is invisible.
      textarea.val($('#leet-compete-code').text());
      textarea[0].select();
      if (!document.execCommand('copy')) {
        error('Browser does not support direct copy. Please press copy key');
      } else {
        message('Code copied!');
      }
      textarea.hide();
    })
    .insertAfter('#leet-compete-code');
}

function addToggleButton() {
  $('<a>Toggle LeetCompete Source</a>')
    .addClass('btn btn-default css-ftn10w-BaseButtonComponent')
    .css('margin', '10px 0')
    .on('click', function() {
      $('#leet-compete-code').toggle();
    })
    .insertAfter('#leet-compete-code');
}

function addReloadButton(process) {
  $('<a>reload</a>')
    .addClass('btn btn-default css-ftn10w-BaseButtonComponent')
    .css('margin', '10px 0')
    .on('click', function() {
      process();
    })
    .insertAfter('#leet-compete-code');
}

function addButtons(process) {
  addReloadButton(process);
  addCopyButton();
  addToggleButton();
}
