(function () {
    'use strict';

    angular.module('app').config(function ($stateProvider, $urlRouterProvider) {

        var requestsState = {
            name: 'requests',
            url: '/',
            views: {
                content: {
                    templateUrl: '/states/requests.html'
                }
            }
        }
        var loginState = {
            name: 'login',
            url: '/login',
            views: {
                content: {
                    templateUrl: '/states/login.html'
                }
            }
        }

        $stateProvider.state(requestsState);
        $stateProvider.state(loginState);
    });

})();
