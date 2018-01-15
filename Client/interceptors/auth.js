(function () {
    'use strict';
    angular.module('app').factory('authInterceptor', function ($location, localStorageService) {
        return {
            // optional method
            'request': function (config) {
                config.headers = config.headers || {};

                var authData = localStorageService.get('auth');
                if (authData) {
                    config.headers.auth = authData;
                }

                return config;
            },

            // optional method
            'responseError': function (response) {
                if (response.status === 401) {
                    $location.path('/login');
                    console.log("Detected 401, redirecting");
                }
                // do something on success
                return response;
            },

            // optional method
            'response': function (response) {
                if (response.status === 401) {
                    $location.path('/login');
                    console.log("Detected 401, redirecting");
                }
                // do something on success
                return response;
            },
        };
    });

    angular.module('app').config(function ($httpProvider) {
        $httpProvider.interceptors.push('authInterceptor');
    });
})();