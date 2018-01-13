(function () {
    'use strict';
    angular.module('app').config(function (localStorageServiceProvider, $locationProvider) {

        localStorageServiceProvider.setPrefix('rr_');
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: true,
        });

    });
})();
