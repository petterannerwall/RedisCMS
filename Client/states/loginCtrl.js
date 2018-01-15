(function () {
    'use strict';

    angular
        .module('app')
        .controller('loginController', loginController);

    loginController.$inject = ['$location', '$state', '$http', 'localStorageService'];

    function loginController($location, $state, $http, localStorageService) {
        /* jshint validthis:true */
        var vm = this;
        vm.title = 'loginController';
        vm.username = '';
        vm.password = '';
        vm.account = ''
        vm.error = '';
        vm.register = false;

        vm.registerUsername = '';
        vm.registerPassword = '';

        activate();

        function activate() {

            console.log('loginController initialized');
        }

        vm.switchToRegister = function () {
            $http.get('/api/account/new').then(function (response) {
                vm.account = response.data.account;
                console.log(response);
            },
                function (response) {
                    console.log('Something went wrong with account new');
                    console.log(response);
                });
            vm.register = true;
        }

        vm.switchToLogin = function () {
            vm.register = false;
        }

        vm.registerNewAccount = function () {
            $http.post('/api/user', { username: vm.registerUsername, password: vm.registerPassword, account: vm.account }).then(function (response) {

                vm.registerUsername = '';
                vm.registerPassword = '';
                console.log(response.data);
                if (response.data.success) {
                    vm.registerUsername = '';
                    vm.registerPassword = '';
                    vm.switchToLogin();
                }
            },
                function (response) {
                    console.log('Something went wrong with Login');
                    console.log(response);
                });
        }

        vm.submit = function () {
            vm.error = "";
            console.log("loggin in with credentials " + vm.username + ":" + vm.password);

            if (vm.username && vm.password) {
                $http.post('/api/login', { username: vm.username, password: vm.password }).then(function (response) {

                    console.log(response.data);
                    if (!response.data.success) {
                        vm.error = "Wrong username or password";
                    }
                    else {
                        console.log(response.data.auth);
                        localStorageService.set("auth", response.data.auth);
                        vm.error = "Success";
                        $state.go('requests')
                    }
                },
                    function (response) {
                        console.log('Something went wrong with Login');
                        console.log(response);
                    });
            }
            else {
                vm.error = "Username or password missing.";
            }
        }
    }
})();
