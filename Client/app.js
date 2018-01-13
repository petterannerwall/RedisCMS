(function () {
    'use strict';

    angular.module('app', [
        // Angular modules

        // Custom modules

        // 3rd Party Modules
        'ui.router',
        'LocalStorageModule',
        // 'btford.socket-io'
        //'ngFileUpload',
        //'pascalprecht.translate'
    ]);
})();

angular.module('app').filter('capitalize', function() {
    return function(input) {
      return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
});
