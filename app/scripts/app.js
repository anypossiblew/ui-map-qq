'use strict';

angular.module('githubApp', ['ui.map'])
  .config(function () {
  })
    .controller('MapCtrl', ['$scope', function ($scope) {
        $scope.myMarkers = [];

        $scope.mapOptions = {
            // map plugin config
            toolbar: true,
            scrollzoom: true,
            maptype: true,
            overview: true,
            locatecity: true,
            // map-self config
            resizeEnable: true,
            // ui map config
            uiMapCache: true
        }

        $scope.addMarker = function ($event, $params) {
            $scope.myMarkers.push(new qq.maps.Marker({
                map: $scope.myMap,
                position: $params[0].latLng
            }));
        };

        $scope.setZoomMessage = function (zoom) {
            $scope.zoomMessage = 'You just zoomed to ' + zoom + '!';
            console.log(zoom, 'zoomed');
        };

        $scope.openMarkerInfo = function (marker) {
            $scope.currentMarker = marker;
            $scope.currentMarkerLat = marker.getPosition().getLat();
            $scope.currentMarkerLng = marker.getPosition().getLng();

            $scope.myInfoWindow.setMap($scope.myMap);
            $scope.myInfoWindow.setPosition(marker.getPosition());
            $scope.myInfoWindow.open();
        };

        $scope.setMarkerPosition = function (marker, lat, lng) {
            marker.setPosition(new qq.maps.LatLng(lat, lng));
        };
    }])
;
