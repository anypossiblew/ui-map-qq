'use strict';
(function () {
  var app = angular.module('ui.map', ['ui.event']);
  //Setup map events from a google map object to trigger on a given element too,
  //then we just use ui-event to catch events from an element
  function bindMapEvents(scope, eventsStr, googleObject, element) {
    angular.forEach(eventsStr.split(' '), function (eventName) {
      //Prefix all googlemap events with 'map-', so eg 'click'
      //for the googlemap doesn't interfere with a normal 'click' event
      window.qq.maps.event.addListener(googleObject, eventName, function (event) {
        element.triggerHandler('map-' + eventName, event);
        //We create an $apply if it isn't happening. we need better support for this
        //We don't want to use timeout because tons of these events fire at once,
        //and we only need one $apply
        if (!scope.$$phase) {
          scope.$apply();
        }
      });
    });
  }

  app.value('uiMapConfig', {})
    .directive('uiMap', ['uiMapConfig', '$window', '$parse',
      function (uiMapConfig, $window, $parse) {

        var mapEvents = 'click dblclick rightclick mouseover mouseout mousemove drag dragstart dragend bounds_changed center_changed zoom_changed maptypeid_changed projection_changed idle tilesloaded resize';
        var options = uiMapConfig || {};
        return {
          restrict: 'A',
          controller: function ($scope, $element) {
          },
          link: function (scope, elm, attrs) {
            var map;

            var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));

            scope.$on("map.loaded", function (e, type) {
              if (type == "qq" && !map) {
                initMap();
              }
            });

            if ($window.qq && $window.qq.maps && $window.qq.maps.Map) {
              initMap();
            }

            function initMap() {

              if (opts.uiMapCache && $window[attrs.uiMapCache]) {
                elm.replaceWith(window[attrs.uiMapCache]);
                map = $window[attrs.uiMapCache + "Map"];
              } else {

                if (opts.ngCenter &&
                  angular.isNumber(opts.ngCenter.lat) &&
                  angular.isNumber(opts.ngCenter.lng)) {
                  opts.center = new qq.maps.LatLng(opts.ngCenter.lat, opts.ngCenter.lng);
                }

                if (angular.isNumber(opts.ngZoom)) {
                  opts.zoom = opts.ngZoom;
                }

                map = new qq.maps.Map(elm[0], opts);
              }

              var model = $parse(attrs.uiMap);
              //Set scope variable for the map
              model.assign(scope, map);
              bindMapEvents(scope, mapEvents, map, elm);
            }
          }
        };
      }
    ]);
  app.value('uiMapInfoWindowConfig', {})
    .directive('uiMapInfoWindow', [
      'uiMapInfoWindowConfig', '$window', '$parse', '$compile',
      function (uiMapInfoWindowConfig, $window, $parse, $compile) {
        var infoWindowEvents = 'content_changed position_changed zindex_changed closeclick closeclick';
        var options = uiMapInfoWindowConfig || {};
        return {
          link: function (scope, elm, attrs) {
            var opts = angular.extend({}, options, scope.$eval(attrs.uiOptions));
            opts.content = elm[0];
            var model = $parse(attrs.uiMapInfoWindow);
            var infoWindow = model(scope);

            scope.$on("map.loaded", function (e, type) {
              if (type == "qq" && !infoWindow) {
                initInfoWindow();
              }
            });

            if ($window.qq && $window.qq.maps && $window.qq.maps.Map) {
              initInfoWindow();
            }

            function initInfoWindow() {
              if (!infoWindow) {
                infoWindow = new window.qq.maps.InfoWindow(opts);
                model.assign(scope, infoWindow);

                bindMapEvents(scope, infoWindowEvents, infoWindow, elm);
                /* The info window's contents dont' need to be on the dom anymore,
                 google maps has them stored.  So we just replace the infowindow element
                 with an empty div. (we don't just straight remove it from the dom because
                 straight removing things from the dom can mess up angular) */
                elm.replaceWith('<div></div>');
                //Decorate infoWindow.open to $compile contents before opening
                var _open = infoWindow.open;
                infoWindow.open = function open(a1, a2, a3, a4, a5, a6) {
                  $compile(elm.contents())(scope);
                  _open.call(infoWindow, a1, a2, a3, a4, a5, a6);
                };
              }
            }
          }
        };
      }
    ]);

  /*
   * Map overlay directives all work the same. Take map marker for example
   * <ui-map-marker="myMarker"> will $watch 'myMarker' and each time it changes,
   * it will hook up myMarker's events to the directive dom element.  Then
   * ui-event will be able to catch all of myMarker's events. Super simple.
   */
  function mapOverlayDirective(directiveName, events) {
    app.directive(directiveName, [function () {
      return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
          scope.$watch(attrs[directiveName], function (newObject) {
            if (newObject) {
              bindMapEvents(scope, events, newObject, elm);
            }
          });
        }
      };
    }]);
  }

  mapOverlayDirective('uiMapMarker', 'animation_changed clickable_changed cursor_changed draggable_changed flat_changed icon_changed map_changed position_changed shadow_changed shape_changed title_changed visible_changed zindex_changed click mousedown mouseup mouseover mouseout dblclick rightclick dragstart dragging dragend');
  mapOverlayDirective('uiMapPolyline', 'map_changed visible_changed zindex_changed click dblclick rightclick mousedown mouseup mouseover mouseout mousemove');
  mapOverlayDirective('uiMapPolygon', 'map_changed visible_changed zindex_changed click dblclick rightclick mousedown mouseup mouseover mouseout mousemove');
  mapOverlayDirective('uiMapCircle', 'center_changed map_changed radius_changed visible_changed zindex_changed click dblclick rightclick mousedown mouseup mouseover mouseout mousemove');
  mapOverlayDirective('uiMapGroundOverlay', 'map_changed visible_changed click mousedown mousemove mouseout mouseover mouseup rightclick');

  app.provider('uiMapLoadParams', function uiMapLoadParams() {
    var params = {};

    this.setParams = function (ps) {
      params = ps;
    };

    this.$get = function uiMapLoadParamsFactory() {

      return params;
    };
  })
    .directive('uiMapAsyncLoad', ['$window', '$parse', 'uiMapLoadParams',
      function ($window, $parse, uiMapLoadParams) {
        return {
          restrict: 'A',
          link: function (scope, element, attrs) {

            $window.mapqqLoadedCallback = function mapqqLoadedCallback() {
              scope.$broadcast("map.loaded", "qq");
            };

            var params = angular.extend({}, uiMapLoadParams, scope.$eval(attrs.uiMapAsyncLoad));

            params.callback = "mapqqLoadedCallback";

            if (!($window.qq && $window.qq.maps && $window.qq.maps.Map)) {
              var script = document.createElement("script");
              script.type = "text/javascript";
              script.src = "http://map.qq.com/api/js?" + param(params);
              document.body.appendChild(script);
            } else {
              mapqqLoadedCallback();
            }
          }
        }
      }]);

  /**
   * 序列化js对象
   *
   * @param a
   * @param traditional
   * @returns {string}
   */
  function param(a, traditional) {
    var prefix,
      s = [],
      add = function (key, value) {
        // If value is a function, invoke it and return its value
        value = angular.isFunction(value) ? value() : ( value == null ? "" : value );
        s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
      };

    // If an array was passed in, assume that it is an array of form elements.
    if (angular.isArray(a) || ( a.jquery && !angular.isObject(a) )) {
      // Serialize the form elements
      angular.forEach(a, function () {
        add(this.name, this.value);
      });

    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    }

    // Return the resulting serialization
    return s.join("&").replace(r20, "+");
  }

  var r20 = /%20/g;

  function buildParams(prefix, obj, traditional, add) {
    var name;

    if (angular.isArray(obj)) {
      // Serialize array item.
      angular.forEach(obj, function (v, i) {
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v);

        } else {
          // Item is non-scalar (array or object), encode its numeric index.
          buildParams(prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add);
        }
      });

    } else if (!traditional && angular.isObject(obj)) {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj);
    }
  }

  var decode = decodeURIComponent;
}());
