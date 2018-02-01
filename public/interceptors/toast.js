(function () {
    'use strict';
    angular.module('app').factory('toastInterceptor', function ($location) {
        return {
            // optional method
            'response': function (config) {
                
                if(config && config.data.message )                {
                    var color = config.data.success ? 'green' : 'red';
                    Materialize.toast(config.data.message, 3000, color);
                }
                return config;
            },

            // optional method
            'responseError': function (response) {
                return response;
            }
        };
    });

    angular.module('app').config(function ($httpProvider) {
        $httpProvider.interceptors.push('toastInterceptor');
    });
})();