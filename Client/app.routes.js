(function () {
    'use strict';

    angular.module('app').config(function ($stateProvider, $urlRouterProvider) {

        var requestsState = {
            name: 'requests',
            url: '/requests',
            views: {
                content: {
                    templateUrl: '/states/requests.html'
                }
            }
        }
        var singleRequestsState = {
            name: 'singleRequest',
            url: '/requests/:requestId',
            views: {
                content: {
                    // templateUrl: '/states/requests.html'
                    template: '<h1>Single request state</h1>'
                }
            }
        }
        var loginState = {
            name: 'login',
            url: '/',
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
