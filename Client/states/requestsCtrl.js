(function () {
    'use strict';

    angular
        .module('app')
        .controller('requestsController', requestsController);

    requestsController.$inject = ['$location', '$state', '$http', 'localStorageService'];

    function requestsController($location, $state, $http, localStorageService) {
        /* jshint validthis:true */
        var vm = this;
        vm.title = 'requestsController';
        vm.email = '';
        vm.password = '';
        vm.page = 0;


        activate();

        function activate() {
            var auth = localStorageService.get('auth');

            $http.get('/api/request?page=' + vm.page).then(function (response) {

                console.log(response.data);
                vm.requests = response.data ? response.data.requests : [];
                if (vm.requests != []) {
                    vm.totalpages = response.data.totalPages;
                    vm.pages = response.data.pages;
                    vm.page = response.data.page;
                    console.log(vm.pages);
                }
            },
                function (response) {
                    console.log('Something went wrong with getting requests');
                    console.log(response);
                });

            $http.get('/api/user/' + auth).then(function (response) {

                vm.user = response.data.user;

            },
                function (response) {
                    console.log('Something went wrong with getting requests');
                    console.log(response);
                });

        }

        vm.changePage = function (page) {
            vm.page = page;
            activate();
        }

        vm.nextPage = function () {
            if (vm.page + 1 < vm.totalpages)
                vm.page++;
            activate();
        }

        vm.previousPage = function () {
            if (vm.page - 1 != -1)
                vm.page--;
            activate();
        }

        vm.deleteRequest = function (requestId) {
            $http.delete('/api/request/' + requestId).then(function (response) {
                activate();
            },
                function (response) {
                    console.log('Something went wrong with getting requests');
                    console.log(response);
                });
        }

        vm.editRequest = function (request) {
            vm.currentEdit = request;
            $('#edit_request_modal').modal();
            $('#edit_description').trigger('autoresize');
        }

        vm.updateRequest = function () {

            $http.post('/api/request/' + vm.currentEdit.id, vm.currentEdit).then(function (response) {
                activate();
            },
                function (response) {
                    console.log('Something went wrong with getting requests');
                    console.log(response);
                });

        }

        vm.createNew = function () {

            var data = {
                title: vm.newTitle,
                description: vm.newDescription,
            }

            $http.post('/api/request', data).then(function (response) {

                vm.newDescription = '';
                vm.newTitle = '';
                activate();
            },
                function (response) {
                    console.log('Something went wrong with getting requests');
                    console.log(response);
                });
        }

        vm.logout = function () {
            $http.post('/api/logout').then(function (response) {
                localStorageService.remove('auth');
                $state.go('login')
            },
                function (response) {
                    console.log('Something went wrong with logout');
                    console.log(response);
                });
        }


        vm.newRequest = function () {
            $('#new_request_modal').modal();
        }


    }
})();
